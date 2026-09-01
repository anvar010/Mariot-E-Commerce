const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * Tamara (BNPL) — checkout sessions, order authorisation and webhook verification.
 *
 * Built against Tamara's published API reference:
 *   POST /checkout                       -> { order_id, checkout_id, status, checkout_url }
 *   POST /orders/{order_id}/authorise    -> called on the order_approved webhook
 *
 * The authorise call is the part that has no equivalent in the Tabby flow and is easy to
 * miss: after the shopper approves, Tamara holds the order as "approved" but NOT authorised,
 * and an order that is never authorised expires unpaid. Tamara auto-captures 21 days after
 * authorisation, so capture is not our responsibility here.
 */

const BASE_URL = (process.env.TAMARA_API_URL || 'https://api.tamara.co').replace(/\/+$/, '');
const CURRENCY = 'AED';
const COUNTRY = 'AE';

const isConfigured = () => Boolean(process.env.TAMARA_API_TOKEN);

const client = () => axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
        Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}`,
        'Content-Type': 'application/json',
    },
});

const money = (amount) => ({ amount: Number(Number(amount).toFixed(2)), currency: CURRENCY });

/** Tamara rejects blank names, so never send an empty string. */
const splitName = (full, fallback = 'Customer') => {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first_name: fallback, last_name: fallback };
    if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
};

/**
 * @returns {Promise<{ tamaraOrderId: string, checkoutUrl: string, status: string }>}
 */
const createCheckoutSession = async ({
    orderId, totalAmount, taxAmount = 0, shippingAmount = 0,
    items = [], customer = {}, shippingAddress = {}, locale = 'en', frontendUrl,
}) => {
    const localePath = locale === 'ar' ? '/ar' : '/en';
    const name = splitName(customer.name);

    const payload = {
        order_reference_id: String(orderId),
        total_amount: money(totalAmount),
        tax_amount: money(taxAmount),
        shipping_amount: money(shippingAmount),
        description: `Order #${orderId} from Mariot Store`.slice(0, 256),
        country_code: COUNTRY,
        payment_type: 'PAY_BY_INSTALMENTS',
        locale: locale === 'ar' ? 'ar_AE' : 'en_US',
        items: items.map((item, index) => ({
            reference_id: String(item.id ?? item.product_id ?? index + 1),
            type: 'Physical',
            name: String(item.name || 'Item').slice(0, 255),
            sku: String(item.sku || item.model || item.id || index + 1).slice(0, 128),
            quantity: Number(item.quantity) || 1,
            // Tamara reconciles the line totals against total_amount, so this is
            // unit price x quantity, not the unit price.
            total_amount: money((Number(item.price) || 0) * (Number(item.quantity) || 1)),
        })),
        consumer: {
            ...name,
            email: customer.email || '',
            phone_number: customer.phone || '',
        },
        shipping_address: {
            ...name,
            line1: shippingAddress.line1 || 'N/A',
            city: shippingAddress.city || 'Dubai',
            country_code: COUNTRY,
        },
        merchant_url: {
            success: `${frontendUrl}${localePath}/checkoutsuccess?orderId=${orderId}&tamara_status=success`,
            failure: `${frontendUrl}${localePath}/checkout?tamara_status=failure&orderId=${orderId}`,
            cancel: `${frontendUrl}${localePath}/checkout?tamara_status=cancel&orderId=${orderId}`,
            notification: `${process.env.BACKEND_PUBLIC_URL || ''}/api/v1/orders/webhook/tamara`,
        },
    };

    const { data } = await client().post('/checkout', payload);
    if (!data?.checkout_url) {
        throw new Error(`Tamara returned no checkout_url (status: ${data?.status || 'unknown'})`);
    }
    return { tamaraOrderId: data.order_id, checkoutUrl: data.checkout_url, status: data.status };
};

/** Must be called on order_approved, or the order expires unpaid. */
const authoriseOrder = async (tamaraOrderId) => {
    const { data } = await client().post(`/orders/${tamaraOrderId}/authorise`);
    return data;
};

/**
 * Tamara signs notifications as an HS256 JWT, sent either as `Authorization: Bearer <token>`
 * or a `tamaraToken` query parameter, signed with the Notification Token.
 * Returns the decoded payload, or null when it cannot be trusted.
 */
const verifyWebhookToken = (req) => {
    const secret = process.env.TAMARA_NOTIFICATION_TOKEN;
    if (!secret) return null;

    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.tamaraToken || null);
    if (!token) return null;

    try {
        return jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (err) {
        console.warn('[Tamara] webhook token rejected:', err.message);
        return null;
    }
};

module.exports = { isConfigured, createCheckoutSession, authoriseOrder, verifyWebhookToken, BASE_URL };
