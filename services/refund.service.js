const Stripe = require('stripe');

/**
 * Issues a refund with whichever gateway took the money.
 *
 * Only gateways whose reference is stored on the order can be refunded. Tabby is absent on
 * purpose: its payment id lives only inside the webhook that captures the payment and is
 * never persisted, so there is nothing to refund against. Adding it means storing that id at
 * capture time first -- pretending otherwise here would produce an admin button that fails
 * after the operator believes the money has gone back.
 */

const SUPPORTED = ['card', 'tamara'];

const stripeClient = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.includes('REPLACE_WITH')) throw new Error('Stripe is not configured');
    return Stripe(key);
};

/** Why this order cannot be refunded automatically, or null when it can. */
const refundBlocker = (order) => {
    const method = String(order.payment_method || '').toLowerCase();
    if (!SUPPORTED.includes(method)) {
        return method === 'tabby'
            ? 'Tabby refunds are not automated yet — refund it in the Tabby dashboard.'
            : `${method || 'This payment method'} has no automatic refund — return the money manually.`;
    }
    if (method === 'card' && !order.stripe_payment_intent_id) return 'This order has no Stripe payment reference.';
    if (method === 'tamara' && !order.tamara_order_id) return 'This order has no Tamara reference.';
    return null;
};

const refundStripe = async (order, amount, reason, idempotencyKey) => {
    const refund = await stripeClient().refunds.create(
        {
            payment_intent: order.stripe_payment_intent_id,
            // Stripe works in the smallest unit — fils, not dirhams.
            amount: Math.round(amount * 100),
            metadata: { order_id: String(order.id), reason: reason || '' },
        },
        // A double-click reuses the same key and Stripe returns the original refund
        // instead of taking the money twice.
        { idempotencyKey }
    );
    return { gatewayRefundId: refund.id, status: refund.status };
};

const refundTamara = async (order, amount, reason) => {
    const base = (process.env.TAMARA_API_URL || 'https://api.tamara.co').replace(/\/+$/, '');
    const res = await fetch(`${base}/payments/simplified-refund/${order.tamara_order_id}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            total_amount: { amount: Number(amount.toFixed(2)), currency: 'AED' },
            comment: reason || `Refund for order #${order.id}`,
        }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Tamara refused the refund (${res.status}): ${data?.message || JSON.stringify(data).slice(0, 200)}`);
    }
    return { gatewayRefundId: data.refund_id || data.capture_id || null, status: data.status || 'refunded' };
};

const issueRefund = async ({ order, amount, reason, idempotencyKey }) => {
    const method = String(order.payment_method).toLowerCase();
    if (method === 'card') return { gateway: 'stripe', ...(await refundStripe(order, amount, reason, idempotencyKey)) };
    if (method === 'tamara') return { gateway: 'tamara', ...(await refundTamara(order, amount, reason)) };
    throw new Error(`No refund path for payment method "${method}"`);
};

module.exports = { issueRefund, refundBlocker, SUPPORTED };
