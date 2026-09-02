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
    try {
        return await createStripeRefund(order, amount, reason, idempotencyKey);
    } catch (err) {
        // Stripe keys are per-mode: a payment taken with the test key does not exist to the
        // live key, and vice versa. Orders placed before the live switch therefore fail here
        // with a bare "No such payment_intent", which reads like a broken integration rather
        // than what it is.
        if (err?.code === 'resource_missing' || /No such payment_intent/i.test(err?.message || '')) {
            throw new Error(
                'Stripe does not recognise this payment. It was almost certainly taken in a '
                + 'different Stripe mode (test vs live) from the key in use now, so it has to be '
                + 'refunded from the Stripe dashboard where it was charged.'
            );
        }
        throw err;
    }
};

const createStripeRefund = async (order, amount, reason, idempotencyKey) => {
    const refund = await stripeClient().refunds.create(
        {
            payment_intent: order.stripe_payment_intent_id,
            // Stripe works in the smallest unit — fils, not dirhams.
            amount: Math.round(amount * 100),
            // Deliberately no free-text reason here. The idempotency key is built from the
            // order and the amount, so anything else that varies between attempts makes
            // Stripe reject the retry as "same key, different parameters" -- which is exactly
            // what a second attempt with a different reason typed in did. The reason is kept
            // in our own ledger, where it belongs.
            metadata: { order_id: String(order.id) },
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


/**
 * What the gateway has actually refunded on this order, regardless of what our ledger says.
 *
 * The two can diverge: a refund that succeeds at Stripe but fails to record leaves the money
 * returned and the books claiming otherwise, and the next attempt then collides with the
 * original idempotency key. Asking Stripe first makes that state recoverable instead of a
 * dead end. Only Stripe is queried; Tamara has no equivalent listing here.
 */
const gatewayRefundedTotal = async (order) => {
    if (String(order.payment_method).toLowerCase() !== 'card' || !order.stripe_payment_intent_id) return null;
    try {
        const list = await stripeClient().refunds.list({ payment_intent: order.stripe_payment_intent_id, limit: 100 });
        const total = list.data
            .filter(r => r.status === 'succeeded' || r.status === 'pending')
            .reduce((sum, r) => sum + r.amount, 0);
        return {
            amount: Math.round(total) / 100,
            latestId: list.data[0]?.id || null,
        };
    } catch (err) {
        console.warn('[refund] could not read existing Stripe refunds:', err.message);
        return null;
    }
};

const issueRefund = async ({ order, amount, reason, idempotencyKey }) => {
    const method = String(order.payment_method).toLowerCase();
    if (method === 'card') return { gateway: 'stripe', ...(await refundStripe(order, amount, reason, idempotencyKey)) };
    if (method === 'tamara') return { gateway: 'tamara', ...(await refundTamara(order, amount, reason)) };
    throw new Error(`No refund path for payment method "${method}"`);
};

module.exports = { issueRefund, refundBlocker, gatewayRefundedTotal, SUPPORTED };
