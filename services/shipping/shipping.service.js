const db = require('../../config/db');

/**
 * Quotes delivery options for a cart.
 *
 * Carriers are adapters behind one interface, so a carrier being unconfigured, slow, or broken
 * degrades to the remaining options instead of failing checkout. If every carrier is
 * unavailable the flat fallback keeps checkout working -- a shopper must always be able to pay.
 */

// Products without a measured weight still have to quote, so substitute a house average.
const FALLBACK_WEIGHT_KG = Number(process.env.SHIPPING_FALLBACK_WEIGHT_KG) || 5;
// Carrier APIs are called while the shopper waits, so they get a short leash.
const CARRIER_TIMEOUT_MS = Number(process.env.SHIPPING_CARRIER_TIMEOUT_MS) || 6000;

const FALLBACK_METHOD = {
    code: 'standard',
    carrier: 'MARIOT',
    label: 'Standard Shipping',
    label_ar: 'الشحن القياسي',
    min_days: 3,
    max_days: 7,
    price: Number(process.env.SHIPPING_FALLBACK_PRICE) || 0,
    is_fallback: true,
};

/**
 * Total billable weight for a cart. Free gifts still ship, so they count.
 * Volumetric weight is the carrier's own job once dimensions are supplied; this is the
 * actual weight only.
 */
const resolveCartWeight = async (items) => {
    const ids = [...new Set((items || []).map(i => Number(i.product_id || i.id)).filter(Boolean))];
    if (ids.length === 0) return FALLBACK_WEIGHT_KG;

    const [rows] = await db.query('SELECT id, weight_kg FROM products WHERE id IN (?)', [ids]);
    const weightById = new Map(rows.map(r => [Number(r.id), r.weight_kg === null ? null : Number(r.weight_kg)]));

    let total = 0;
    let unmeasured = 0;
    for (const item of items || []) {
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const weight = weightById.get(Number(item.product_id || item.id));
        if (weight && weight > 0) {
            total += weight * quantity;
        } else {
            unmeasured += quantity;
            total += FALLBACK_WEIGHT_KG * quantity;
        }
    }

    if (unmeasured > 0) {
        console.warn(`[shipping] ${unmeasured} item(s) had no weight; used ${FALLBACK_WEIGHT_KG}kg each`);
    }
    // Carriers reject zero-weight shipments.
    return Math.max(total, 0.5);
};

/** Adapters are registered here; each exports isConfigured() and quote(). */
const loadCarriers = () => {
    const carriers = [];
    for (const modulePath of ['./dhl.adapter', './aramex.adapter']) {
        try {
            const adapter = require(modulePath);
            if (adapter.isConfigured()) carriers.push(adapter);
            else console.log(`[shipping] ${adapter.name} not configured, skipping`);
        } catch (err) {
            console.error(`[shipping] failed to load ${modulePath}:`, err.message);
        }
    }
    return carriers;
};

/**
 * @param {Array}  items       cart lines ({ id | product_id, quantity })
 * @param {Object} destination { country, city, zip_code, state }
 * @returns {Promise<Array>}   quoted methods, cheapest first
 */
const quoteShipping = async (items, destination) => {
    if (!destination || !destination.country) {
        throw Object.assign(new Error('A destination country is required to quote shipping.'), { status: 400 });
    }

    const weightKg = await resolveCartWeight(items);
    const carriers = loadCarriers();

    if (carriers.length === 0) return [FALLBACK_METHOD];

    // One slow carrier must not hold up the others, so they run together and are raced
    // against a timeout individually.
    const settled = await Promise.allSettled(carriers.map(carrier =>
        Promise.race([
            carrier.quote({ weightKg, destination }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${carrier.name} timed out`)), CARRIER_TIMEOUT_MS)),
        ])
    ));

    const methods = [];
    settled.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            methods.push(...result.value);
        } else if (result.status === 'rejected') {
            console.error(`[shipping] ${carriers[index].name} quote failed:`, result.reason?.message);
        }
    });

    if (methods.length === 0) return [FALLBACK_METHOD];

    return methods.sort((a, b) => a.price - b.price);
};

module.exports = { quoteShipping, resolveCartWeight, FALLBACK_METHOD, FALLBACK_WEIGHT_KG };
