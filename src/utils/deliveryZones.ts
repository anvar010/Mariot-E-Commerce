/**
 * Delivery zones — where the shopper wants it, and how much longer that takes.
 *
 * A product's delivery_days is the UAE promise. Each zone adds its own offset, so
 * one row per destination moves the promise for the whole catalogue rather than
 * requiring a per-product, per-country matrix.
 */
import { API_BASE_URL } from '@/config';

export interface DeliveryZone {
    country_code: string;
    country_name: string;
    country_name_ar: string | null;
    extra_days: number;
}

export const DEFAULT_ZONE_CODE = 'AE';
const STORAGE_KEY = 'mariot.deliveryCountry';

/**
 * Shown until the real list arrives, and used if the request fails.
 *
 * The product page must always be able to make *some* delivery promise; a
 * selector that is empty because an API call failed is worse than one showing
 * the home country.
 */
export const FALLBACK_ZONES: DeliveryZone[] = [
    { country_code: 'AE', country_name: 'United Arab Emirates', country_name_ar: 'الإمارات العربية المتحدة', extra_days: 0 },
];

let cache: DeliveryZone[] | null = null;
let inFlight: Promise<DeliveryZone[]> | null = null;

/**
 * The zone list, fetched once per page load.
 *
 * Every product page would otherwise re-request an identical seven-row list on
 * each mount, so the result is memoised and concurrent callers share one request.
 */
export const getDeliveryZones = async (): Promise<DeliveryZone[]> => {
    if (cache) return cache;
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/delivery-zones`);
            const data = await res.json();
            const zones: DeliveryZone[] = Array.isArray(data?.data) && data.data.length > 0
                ? data.data
                : FALLBACK_ZONES;
            cache = zones;
            return zones;
        } catch {
            cache = FALLBACK_ZONES;
            return FALLBACK_ZONES;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
};

/** The shopper's last choice, so it carries between products. */
export const readStoredCountry = (): string | null => {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        // Private windows and blocked site data throw on access rather than
        // returning null.
        return null;
    }
};

export const storeCountry = (code: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY, code);
    } catch {
        /* the selection simply will not persist */
    }
};

export const zoneLabel = (zone: DeliveryZone, locale: string): string =>
    (locale === 'ar' && zone.country_name_ar) ? zone.country_name_ar : zone.country_name;

export const findZone = (zones: DeliveryZone[], code: string | null): DeliveryZone | undefined =>
    zones.find(z => z.country_code === code);
