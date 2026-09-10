/**
 * Delivery charged by destination, for places the flat per-product rate does not cover.
 *
 * Al Dhafra is Abu Dhabi's western region -- Zayed City, Liwa, Ghayathi, Dalma Island and
 * the rest. It is inside the UAE, so it goes through normal checkout rather than a shipping
 * quote, but it is hundreds of kilometres from the warehouse and cannot be delivered at the
 * same cost as a city address.
 *
 * This is the storefront's copy of backend/config/regionalDelivery.js, so the shopper can be
 * shown the charge before they commit. The two must be kept in step; the server recomputes
 * the figure on every order and its answer is the one that is charged, so a drift here shows
 * up as a total that changes at payment rather than as money lost.
 */

/** Matched against the address's state/emirate, case- and spacing-insensitively. */
const AL_DHAFRA_KEYS = ['al dhafra region', 'al dhafra', 'aldhafra', 'الظفرة', 'منطقة الظفرة'];

/** Bands are inclusive of `upTo`; above the last one, delivery is free. */
export const AL_DHAFRA_BANDS: { upTo: number; charge: number }[] = [
    { upTo: 3000, charge: 50 },
    { upTo: 6000, charge: 100 },
    { upTo: 8000, charge: 200 },
    { upTo: 10000, charge: 350 },
    { upTo: 14999, charge: 600 },
];

const normalise = (v: unknown): string =>
    String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** True when this address is in Al Dhafra. */
export const isAlDhafra = (state: unknown): boolean => {
    const s = normalise(state);
    if (!s) return false;
    return AL_DHAFRA_KEYS.some(k => s === k || s.includes(k));
};

/**
 * Delivery charge for one destination, or 0 when nothing extra applies.
 *
 * @param address     needs `state` (the emirate/region) and `country`
 * @param goodsTotal  order value the band is chosen by, before VAT and delivery
 */
export const regionalDeliveryFor = (
    address: { state?: unknown; country?: unknown } | null | undefined,
    goodsTotal: number,
): number => {
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
