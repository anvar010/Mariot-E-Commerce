/**
 * Delivery charged by destination, for places the flat per-product rate does not cover.
 *
 * Al Dhafra is Abu Dhabi's western region -- Zayed City, Liwa, Ghayathi, Dalma Island and
 * the rest. It is inside the UAE, so it goes through normal checkout rather than a shipping
 * quote, but it is hundreds of kilometres from the warehouse and cannot be delivered at the
 * same cost as a city address. The charge is banded by order value because that tracks the
 * size of the load closely enough, and it is a figure the shopper can be shown before they
 * commit rather than one worked out by hand afterwards.
 *
 * Above the top band delivery is free, which is the same promise the rest of the UAE gets.
 *
 * This file is the single source of the numbers. The storefront shows them from its own copy
 * in src/config/regionalDelivery.ts; the two must be kept in step, and the server's answer is
 * the one that is charged.
 */

/** Matched against the address's state/emirate, case- and spacing-insensitively. */
const AL_DHAFRA_KEYS = ['al dhafra region', 'al dhafra', 'aldhafra', 'الظفرة', 'منطقة الظفرة'];

/**
 * Bands are inclusive of `upTo`. The order they appear in is the order they are tested, so
 * the first band whose ceiling the goods total does not exceed is the one that applies.
 */
const AL_DHAFRA_BANDS = [
    { upTo: 3000, charge: 50 },
    { upTo: 6000, charge: 100 },
    { upTo: 8000, charge: 200 },
    { upTo: 10000, charge: 350 },
    { upTo: 14999, charge: 600 },
    // Anything above the last band ships free.
];

const normalise = (v) =>
    String(v ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

/** True when this address is in Al Dhafra. */
const isAlDhafra = (state) => {
    const s = normalise(state);
    if (!s) return false;
    return AL_DHAFRA_KEYS.some(k => s === k || s.includes(k));
};

/**
 * Delivery charge for one destination, or 0 when nothing extra applies.
 *
 * @param {object} address   needs `state` (the emirate/region) and `country`
 * @param {number} goodsTotal  order value the band is chosen by, before VAT and delivery
 * @returns {number} AED, 0 if this address has no regional charge
 */
const regionalDeliveryFor = (address, goodsTotal) => {
    if (!address) return 0;

    // UAE only. A foreign address is priced by a shipping quote, and adding this on top
    // would charge for the same journey twice.
    const country = normalise(address.country);
    if (country && !country.includes('emirates') && country !== 'uae' && !country.includes('الإمارات')) {
        return 0;
    }

    if (!isAlDhafra(address.state)) return 0;

    const total = Number(goodsTotal) || 0;
    const band = AL_DHAFRA_BANDS.find(b => total <= b.upTo);
    return band ? band.charge : 0;
};

module.exports = {
    AL_DHAFRA_BANDS,
    isAlDhafra,
    regionalDeliveryFor,
};
