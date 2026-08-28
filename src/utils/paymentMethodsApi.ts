/**
 * Saved cards API client.
 *
 * The browser never sends a card number here. Card details go from Stripe
 * Elements straight to Stripe; these calls only ever move around the resulting
 * `pm_…` reference and the display fields (brand, last four, expiry).
 */
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';

export interface SavedCard {
    id: string;
    brand: string;
    last4: string;
    exp_month: number | null;
    exp_year: number | null;
    funding: string | null;
    country: string | null;
    name: string;
    is_default: boolean;
    is_expired: boolean;
}

const BASE = `${API_BASE_URL}/payment-methods`;

const request = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        ...init,
    });

    // A signed-out shopper is an expected state on a page that also serves guests,
    // not an error worth throwing over.
    if (res.status === 401) return { success: false, unauthorized: true, data: [] as any };

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
        throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
};

export const listCards = async (): Promise<SavedCard[]> => {
    const data = await request('');
    return Array.isArray(data.data) ? data.data : [];
};

/** Returns a SetupIntent client secret for authorising a new card without charging it. */
export const createSetupIntent = async (): Promise<string> => {
    const data = await request('/setup-intent', { method: 'POST', body: '{}' });
    return data.client_secret;
};

/** Called after the browser confirms the SetupIntent, so the server can set the default. */
export const confirmCard = async (paymentMethodId: string, setDefault = false): Promise<SavedCard> => {
    const data = await request('/confirm', {
        method: 'POST',
        body: JSON.stringify({ payment_method_id: paymentMethodId, set_default: setDefault }),
    });
    return data.data;
};

/**
 * A card number can never be changed — that means adding a new card. Only the
 * expiry (banks reissue the same number with a later date) and the name on the
 * card can be edited.
 */
export const updateCard = async (
    id: string,
    changes: { exp_month?: number; exp_year?: number; name?: string },
): Promise<SavedCard> => {
    const data = await request(`/${id}`, { method: 'PUT', body: JSON.stringify(changes) });
    return data.data;
};

export const setDefaultCard = async (id: string): Promise<SavedCard> => {
    const data = await request(`/${id}/default`, { method: 'PUT' });
    return data.data;
};

export const deleteCard = async (id: string): Promise<void> => {
    await request(`/${id}`, { method: 'DELETE' });
};

/** "visa" → "Visa", "amex" → "Amex". Stripe returns lower-case brand slugs. */
export const brandLabel = (brand: string): string => {
    const named: Record<string, string> = {
        visa: 'Visa',
        mastercard: 'Mastercard',
        amex: 'Amex',
        discover: 'Discover',
        diners: 'Diners Club',
        jcb: 'JCB',
        unionpay: 'UnionPay',
    };
    return named[brand] || (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card');
};

export const formatExpiry = (month: number | null, year: number | null): string =>
    month && year ? `${String(month).padStart(2, '0')}/${String(year).slice(-2)}` : '—';
