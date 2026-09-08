const ShippingQuote = require('../models/shippingQuote.model');
const Order = require('../models/order.model');
const db = require('../config/db');
const {
    sendShippingQuoteRequestEmail,
    sendShippingQuotePricedEmail,
    sendShippingQuoteResponseEmail,
} = require('../utils/sendEmail');

/**
 * Shipping quote requests, for destinations where delivery cannot be priced automatically.
 *
 * Nothing here charges anyone or creates an order. The request captures what the shopper
 * wants and where; an admin adds a delivery figure; the shopper accepts or declines. Only
 * a completed payment against an accepted quote turns into an order.
 */

// The one country the shop can price shipping for on its own.
const DOMESTIC_COUNTRY = 'United Arab Emirates';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const adminRecipients = () =>
    (process.env.RECEIVER_EMAIL || 'anvarshaknavas588@gmail.com');

exports.createQuoteRequest = async (req, res, next) => {
    try {
        const {
            country, state, city, address_line1, address_line2, zip_code,
            contact_name, contact_phone, contact_email, customer_note,
            items, coupon_id = null, points_to_use = 0, locale = 'en',
        } = req.body;

        if (!country) {
            return res.status(422).json({ success: false, message: 'A destination country is required.' });
        }
        if (country === DOMESTIC_COUNTRY) {
            // Domestic orders price their own shipping, so they go through checkout. Guarded
            // here as well as in the UI: the endpoint is public API surface.
            return res.status(422).json({
                success: false,
                message: 'Orders inside the UAE can be placed directly and do not need a shipping quote.',
            });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(422).json({ success: false, message: 'The request has no items.' });
        }

        // Prices come from the database, never from the request body -- the client is not
        // trusted with what anything costs, exactly as at checkout.
        const ids = [...new Set(items.map(i => Number(i.product_id)).filter(Boolean))];
        if (!ids.length) {
            return res.status(422).json({ success: false, message: 'The request has no valid products.' });
        }
        const [rows] = await db.execute(
            `SELECT id, price, offer_price, offer_start, offer_end FROM products WHERE id IN (${ids.map(() => '?').join(',')})`,
            ids
        );

        const now = Date.now();
        // An offer only counts inside its window. The window lives on the product even for a
        // variant line, which carries its own pair of prices but no dates of its own.
        const inOfferWindow = (p) =>
            (!p.offer_start || new Date(p.offer_start).getTime() <= now)
            && (!p.offer_end || new Date(p.offer_end).getTime() >= now);

        const productRow = new Map(rows.map(p => [p.id, p]));
        const priceOf = new Map(rows.map(p => {
            const onOffer = p.offer_price != null && Number(p.offer_price) > 0 && inOfferWindow(p);
            return [p.id, Number(onOffer ? p.offer_price : p.price) || 0];
        }));

        /**
         * A product with variants keeps no meaningful price on the parent row -- the money is
         * on the variant the shopper actually chose. Reading the parent priced a 10.00 variant
         * at the parent's 900.00, so the quote disagreed with the basket the shopper had just
         * been looking at.
         */
        const variantIds = [...new Set(items.map(i => Number(i.variant_id)).filter(Boolean))];
        const variantPrice = new Map();
        if (variantIds.length) {
            const [vrows] = await db.execute(
                `SELECT id, product_id, price, offer_price FROM product_variants
                  WHERE id IN (${variantIds.map(() => '?').join(',')})`,
                variantIds
            );
            for (const v of vrows) {
                const parent = productRow.get(v.product_id);
                const onOffer = v.offer_price != null && Number(v.offer_price) > 0
                    && (!parent || inOfferWindow(parent));
                const amount = Number(onOffer ? v.offer_price : v.price) || 0;
                if (amount > 0) variantPrice.set(v.id, amount);
            }
        }

        const priced = items.map(i => ({
            ...i,
            product_id: Number(i.product_id),
            quantity: Math.max(1, Number(i.quantity) || 1),
            price: Number(i.is_free_gift) === 1
                ? 0
                : (variantPrice.get(Number(i.variant_id))
                    ?? priceOf.get(Number(i.product_id))
                    ?? 0),
        }));

        const subtotalGross = priced.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // Coupon and points are validated the same way the order path validates them, so a
        // quote cannot be used to claim a discount checkout would refuse.
        let discount = 0;
        if (coupon_id) {
            const [[coupon]] = await db.execute(
                'SELECT discount_type, discount_value FROM coupons WHERE id = ? AND is_active = 1',
                [coupon_id]
            );
            if (coupon) {
                discount = coupon.discount_type === 'percentage'
                    ? subtotalGross * (Number(coupon.discount_value) / 100)
                    : Number(coupon.discount_value);
            }
        }

        let pointsUsed = 0;
        let pointsDiscount = 0;
        if (points_to_use > 0 && req.user) {
            const [[u]] = await db.execute('SELECT reward_points FROM users WHERE id = ?', [req.user.id]);
            const [[setting]] = await db.execute("SELECT `value` FROM settings WHERE `key` = 'aed_per_point'");
            const aedPerPoint = setting ? parseFloat(setting.value) : 0.01;
            const clamped = Math.min(Number(points_to_use), u?.reward_points || 0);
            const maxAed = Math.min(clamped * aedPerPoint, Math.max(0, subtotalGross - discount));
            pointsUsed = Math.floor(maxAed / aedPerPoint);
            pointsDiscount = round2(pointsUsed * aedPerPoint);
        }

        const subtotal = Math.max(0, round2(subtotalGross - discount - pointsDiscount));
        const vat = round2(subtotal * 0.05);

        const id = await ShippingQuote.create(req.user?.id || null, {
            country, state, city, address_line1, address_line2, zip_code,
            contact_name, contact_phone,
            contact_email: contact_email || req.user?.email || null,
            customer_note,
            items: priced,
            subtotal, discount_amount: round2(discount), coupon_id,
            points_used: pointsUsed, points_discount: pointsDiscount, vat_amount: vat,
            locale,
        });

        const quote = await ShippingQuote.findById(id);

        // Email the office. Failing to send must not lose the request -- it is already saved.
        (async () => {
            try {
                await sendShippingQuoteRequestEmail(adminRecipients(), quote);
            } catch (err) {
                console.error(`[QUOTE] Admin alert failed for ${quote.reference}:`, err.message);
            }
        })();

        res.status(201).json({ success: true, data: { id, reference: quote.reference } });
    } catch (error) {
        next(error);
    }
};

exports.getMyQuotes = async (req, res, next) => {
    try {
        res.json({ success: true, data: await ShippingQuote.findForUser(req.user.id) });
    } catch (error) {
        next(error);
    }
};

exports.getQuote = async (req, res, next) => {
    try {
        const quote = await ShippingQuote.findById(req.params.id);
        if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
        if (quote.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this quote' });
        }
        res.json({ success: true, data: { ...quote, expired: ShippingQuote.isExpired(quote) } });
    } catch (error) {
        next(error);
    }
};

exports.getAllQuotes = async (req, res, next) => {
    try {
        res.json({ success: true, data: await ShippingQuote.findAllForAdmin() });
    } catch (error) {
        next(error);
    }
};

exports.setQuotePrice = async (req, res, next) => {
    try {
        const { delivery_charge, admin_note } = req.body;
        const amount = Number(delivery_charge);
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(422).json({ success: false, message: 'Enter a delivery cost of zero or more.' });
        }

        const existing = await ShippingQuote.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: 'Quote not found' });
        if (existing.status === 'ordered') {
            return res.status(422).json({ success: false, message: 'This quote has already been paid and cannot be repriced.' });
        }

        const quote = await ShippingQuote.setPrice(req.params.id, {
            delivery_charge: amount, admin_note, adminId: req.user.id,
        });

        const to = quote.contact_email || quote.user_email;
        if (to) {
            (async () => {
                try {
                    await sendShippingQuotePricedEmail(to, quote, quote.locale || 'en');
                } catch (err) {
                    console.error(`[QUOTE] Customer email failed for ${quote.reference}:`, err.message);
                }
            })();
        }

        res.json({ success: true, message: 'Quote sent to the customer.', data: quote });
    } catch (error) {
        next(error);
    }
};

exports.respondToQuote = async (req, res, next) => {
    try {
        const accepted = req.body.accept === true;
        const quote = await ShippingQuote.findById(req.params.id);
        if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
        if (quote.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to respond to this quote' });
        }
        if (quote.status !== 'quoted') {
            return res.status(422).json({
                success: false,
                message: quote.status === 'pending'
                    ? 'This quote has not been priced yet.'
                    : 'This quote has already been answered.',
            });
        }
        if (ShippingQuote.isExpired(quote)) {
            return res.status(422).json({ success: false, message: 'This quote has expired. Please request a new one.' });
        }

        const updated = await ShippingQuote.respond(req.params.id, accepted);

        (async () => {
            try {
                await sendShippingQuoteResponseEmail(adminRecipients(), updated, accepted);
            } catch (err) {
                console.error(`[QUOTE] Response alert failed for ${updated.reference}:`, err.message);
            }
        })();

        // Accepting agrees a price but pays nothing, so the customer is left holding a
        // quote with one thing still to do. This is their way back to it -- the same email
        // as before, but now the button goes straight to payment.
        if (accepted) {
            const to = updated.contact_email || updated.user_email;
            if (to) {
                (async () => {
                    try {
                        await sendShippingQuotePricedEmail(to, updated, updated.locale || 'en');
                    } catch (err) {
                        console.error(`[QUOTE] Acceptance email failed for ${updated.reference}:`, err.message);
                    }
                })();
            }
        }

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
