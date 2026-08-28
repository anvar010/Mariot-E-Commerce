/**
 * Saved payment cards.
 *
 * No card data is stored here, ever. Card numbers, expiry and CVC go from the
 * shopper's browser straight to Stripe and never touch this server or our
 * database — that is what keeps us out of PCI scope. All we keep is
 * users.stripe_customer_id, a pointer to the Stripe Customer that owns the
 * saved cards, and every read below asks Stripe for the details.
 *
 * A card gets saved one of two ways:
 *   - during checkout, by passing setup_future_usage on the PaymentIntent
 *     (see order.controller) — the card is stored as a side effect of a real
 *     payment, so the shopper is never charged just to add it;
 *   - from the profile or the checkout card manager, via a SetupIntent, which
 *     authorises the card without taking money.
 */
const db = require('../config/db');

const stripe = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('REPLACE_WITH')
    ? require('stripe')(process.env.STRIPE_SECRET_KEY)
    : null;

const notConfigured = (res) =>
    res.status(503).json({ success: false, message: 'Card payments are not configured on this server.' });

// users.stripe_customer_id is added lazily, the same way the rest of the schema
// evolves here. CREATE TABLE IF NOT EXISTS never alters an existing table, so an
// explicit ADD COLUMN is the only thing that reaches a live database.
let columnEnsured = false;
const ensureCustomerColumn = async () => {
    if (columnEnsured) return;
    try {
        await db.query('ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) NULL');
        console.log('[PaymentMethods] Added users.stripe_customer_id');
    } catch (e) {
        // ER_DUP_FIELDNAME — already there, which is the normal case.
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    columnEnsured = true;
};

/**
 * The Stripe Customer for this user, created on first use.
 *
 * Reconciles rather than trusting the stored id: a customer created against the
 * test keys does not exist once the server switches to live keys, and a stale
 * pointer would make every card call fail with "No such customer". If the id we
 * hold no longer resolves, a fresh customer is created and stored.
 */
const ensureStripeCustomer = async (user) => {
    await ensureCustomerColumn();

    const [[row]] = await db.query('SELECT stripe_customer_id FROM users WHERE id = ?', [user.id]);
    const existing = row?.stripe_customer_id;

    if (existing) {
        try {
            const customer = await stripe.customers.retrieve(existing);
            if (!customer.deleted) return existing;
        } catch (e) {
            console.warn(`[PaymentMethods] Stored customer ${existing} for user #${user.id} is unusable (${e.message}) — creating a new one.`);
        }
    }

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { user_id: String(user.id) },
    });
    await db.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customer.id, user.id]);
    return customer.id;
};

/**
 * Resolve a payment method and prove it belongs to the caller.
 *
 * The id arrives from the client, so without this check any signed-in user could
 * pass someone else's pm_… and read, charge, edit or delete their card.
 */
const ownedPaymentMethod = async (paymentMethodId, customerId) => {
    if (!/^pm_[A-Za-z0-9_]+$/.test(paymentMethodId || '')) return null;
    try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== customerId) return null;
        return pm;
    } catch {
        return null;
    }
};

// Only ever expose the non-sensitive display fields. Stripe returns more than
// this; the client has no use for it and it should not sit in a browser.
const shape = (pm, defaultId) => ({
    id: pm.id,
    brand: pm.card?.brand || 'card',
    last4: pm.card?.last4 || '',
    exp_month: pm.card?.exp_month || null,
    exp_year: pm.card?.exp_year || null,
    funding: pm.card?.funding || null,
    country: pm.card?.country || null,
    name: pm.billing_details?.name || '',
    is_default: pm.id === defaultId,
    // An expired card still lists, flagged, so the shopper can see why it stopped
    // working instead of it silently vanishing.
    is_expired: isExpired(pm.card),
});

const isExpired = (card) => {
    if (!card?.exp_year || !card?.exp_month) return false;
    const now = new Date();
    // A card is valid through the last day of its expiry month.
    return card.exp_year < now.getFullYear()
        || (card.exp_year === now.getFullYear() && card.exp_month < now.getMonth() + 1);
};

/**
 * The customer's default card, ignoring a pointer that no longer resolves.
 *
 * Detaching a card does not clear invoice_settings.default_payment_method, so a
 * customer who removes their default is left pointing at a card that no longer
 * exists. Left alone that stale id makes every later card look non-default:
 * checkout preselects nothing and "first card becomes the default" stops
 * happening. Treat a pointer that isn't in the current card list as absent, and
 * repair it in Stripe so the next read is clean.
 */
const effectiveDefault = async (customerId, cards) => {
    const customer = await stripe.customers.retrieve(customerId);
    const stored = customer.invoice_settings?.default_payment_method || null;

    if (stored && cards.some(c => c.id === stored)) return stored;
    if (cards.length === 0) return null;

    const promoted = cards[0].id;
    await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: promoted },
    });
    if (stored) console.warn(`[PaymentMethods] ${customerId} pointed at removed card ${stored} — promoted ${promoted}.`);
    return promoted;
};

// @desc    List the signed-in user's saved cards
// @route   GET /api/v1/payment-methods
exports.listPaymentMethods = async (req, res, next) => {
    if (!stripe) return res.json({ success: true, data: [] });
    try {
        const customerId = await ensureStripeCustomer(req.user);
        const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 20 });
        const defaultId = await effectiveDefault(customerId, methods.data);

        // Default first, then newest — the order the shopper expects at checkout.
        const cards = methods.data
            .map(pm => shape(pm, defaultId))
            .sort((a, b) => Number(b.is_default) - Number(a.is_default));

        res.json({ success: true, data: cards });
    } catch (error) {
        console.error('[PaymentMethods] list failed:', error.message);
        next(error);
    }
};

// @desc    Start adding a card without charging it
// @route   POST /api/v1/payment-methods/setup-intent
exports.createSetupIntent = async (req, res, next) => {
    if (!stripe) return notConfigured(res);
    try {
        const customerId = await ensureStripeCustomer(req.user);
        const intent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
            // off_session is what later allows charging this card without the
            // shopper re-entering it.
            usage: 'off_session',
            metadata: { user_id: String(req.user.id) },
        });
        res.json({ success: true, client_secret: intent.client_secret });
    } catch (error) {
        console.error('[PaymentMethods] setup intent failed:', error.message);
        next(error);
    }
};

/**
 * @desc    Finish adding a card
 * @route   POST /api/v1/payment-methods/confirm
 *
 * The browser confirms the SetupIntent with Stripe directly, so the card is
 * already attached by the time this is called. This exists to make the first
 * saved card the default without the client being trusted to say so.
 */
exports.confirmSetup = async (req, res, next) => {
    if (!stripe) return notConfigured(res);
    try {
        const customerId = await ensureStripeCustomer(req.user);
        const pm = await ownedPaymentMethod(req.body.payment_method_id, customerId);
        if (!pm) return res.status(404).json({ success: false, message: 'Card not found' });

        const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 20 });
        const currentDefault = await effectiveDefault(customerId, methods.data.filter(c => c.id !== pm.id));

        const shouldBeDefault = req.body.set_default === true || !currentDefault;
        if (shouldBeDefault) {
            await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
        }

        res.json({ success: true, data: shape(pm, shouldBeDefault ? pm.id : currentDefault) });
    } catch (error) {
        console.error('[PaymentMethods] confirm failed:', error.message);
        next(error);
    }
};

/**
 * @desc    Edit a saved card
 * @route   PUT /api/v1/payment-methods/:id
 *
 * A card number can never be edited — Stripe does not allow it and neither
 * should we; replacing a number means adding a new card. What can change is the
 * expiry (banks reissue the same number with a new date) and the billing name.
 */
exports.updatePaymentMethod = async (req, res, next) => {
    if (!stripe) return notConfigured(res);
    try {
        const customerId = await ensureStripeCustomer(req.user);
        const pm = await ownedPaymentMethod(req.params.id, customerId);
        if (!pm) return res.status(404).json({ success: false, message: 'Card not found' });

        const update = {};

        if (req.body.exp_month !== undefined || req.body.exp_year !== undefined) {
            const month = Number(req.body.exp_month ?? pm.card.exp_month);
            const year = Number(req.body.exp_year ?? pm.card.exp_year);
            if (!Number.isInteger(month) || month < 1 || month > 12) {
                return res.status(400).json({ success: false, message: 'Expiry month must be between 1 and 12' });
            }
            const thisYear = new Date().getFullYear();
            if (!Number.isInteger(year) || year < thisYear || year > thisYear + 25) {
                return res.status(400).json({ success: false, message: 'Expiry year is out of range' });
            }
            update.card = { exp_month: month, exp_year: year };
        }

        if (typeof req.body.name === 'string') {
            update.billing_details = { name: req.body.name.trim().slice(0, 120) };
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        const updated = await stripe.paymentMethods.update(pm.id, update);
        const customer = await stripe.customers.retrieve(customerId);
        res.json({ success: true, data: shape(updated, customer.invoice_settings?.default_payment_method) });
    } catch (error) {
        console.error('[PaymentMethods] update failed:', error.message);
        // Stripe rejects a past expiry date with a card_error; that is the
        // shopper's mistake, not a server fault.
        if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// @desc    Make a card the default for future checkouts
// @route   PUT /api/v1/payment-methods/:id/default
exports.setDefaultPaymentMethod = async (req, res, next) => {
    if (!stripe) return notConfigured(res);
    try {
        const customerId = await ensureStripeCustomer(req.user);
        const pm = await ownedPaymentMethod(req.params.id, customerId);
        if (!pm) return res.status(404).json({ success: false, message: 'Card not found' });

        await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
        res.json({ success: true, data: shape(pm, pm.id) });
    } catch (error) {
        console.error('[PaymentMethods] set default failed:', error.message);
        next(error);
    }
};

/**
 * @desc    Remove a saved card
 * @route   DELETE /api/v1/payment-methods/:id
 *
 * Detaching only unlinks the card from the customer for future use. Payments
 * already taken with it are untouched, so order and refund history stays intact.
 */
exports.deletePaymentMethod = async (req, res, next) => {
    if (!stripe) return notConfigured(res);
    try {
        const customerId = await ensureStripeCustomer(req.user);
        const pm = await ownedPaymentMethod(req.params.id, customerId);
        if (!pm) return res.status(404).json({ success: false, message: 'Card not found' });

        await stripe.paymentMethods.detach(pm.id);

        // Removing the default would otherwise leave the shopper with cards but no
        // preselection at checkout. effectiveDefault promotes whatever remains and
        // clears the now-dangling pointer.
        const rest = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 20 });
        await effectiveDefault(customerId, rest.data);

        res.json({ success: true, message: 'Card removed' });
    } catch (error) {
        console.error('[PaymentMethods] delete failed:', error.message);
        next(error);
    }
};

// Shared with order.controller so a checkout can attach its PaymentIntent to the
// same customer these cards hang off.
exports.ensureStripeCustomer = ensureStripeCustomer;
exports.ownedPaymentMethod = ownedPaymentMethod;
