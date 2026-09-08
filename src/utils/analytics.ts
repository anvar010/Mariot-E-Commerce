/**
 * Ecommerce events, pushed to the dataLayer.
 *
 * Tag Manager's tags listen for these by name: the Google Ads conversion tags are triggered
 * by "add_to_cart" and "purchase", and read ecommerce.value, ecommerce.transaction_id and
 * ecommerce.currency from the object below. GA4 reads the same shape, so one push serves
 * both and there is nothing to keep in step.
 *
 * These names are not ours to choose -- they are what the container was configured for three
 * years ago, and what GA4 expects. Renaming one silently stops a conversion being recorded.
 */

type Money = number | string | null | undefined;

const CURRENCY = 'AED';

const num = (v: Money): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

interface DataLayerWindow extends Window {
    dataLayer?: Record<string, any>[];
}

/**
 * Nothing is pushed when Tag Manager is absent -- during local development, in preview
 * builds, or if the container is ever removed. dataLayer is created if missing so an event
 * fired before GTM finishes loading is still picked up when it does.
 */
const push = (payload: Record<string, any>): void => {
    if (typeof window === 'undefined') return;
    try {
        const w = window as DataLayerWindow;
        w.dataLayer = w.dataLayer || [];
        // Cleared first, so values from a previous event cannot leak into this one -- a
        // known trap with GTM, where the dataLayer persists across pushes.
        w.dataLayer.push({ ecommerce: null });
        w.dataLayer.push(payload);
    } catch {
        /* analytics must never break a purchase */
    }
};

export interface TrackedItem {
    id: number | string;
    name: string;
    price: Money;
    quantity?: number;
    brand?: string | null;
    category?: string | null;
    variant?: string | null;
}

const toGA4Item = (item: TrackedItem) => ({
    item_id: String(item.id),
    item_name: item.name,
    price: num(item.price),
    quantity: Number(item.quantity) || 1,
    ...(item.brand ? { item_brand: item.brand } : {}),
    ...(item.category ? { item_category: item.category } : {}),
    ...(item.variant ? { item_variant: item.variant } : {}),
});

/** Fired when a product goes into the basket. */
export const trackAddToCart = (item: TrackedItem): void => {
    const quantity = Number(item.quantity) || 1;
    push({
        event: 'add_to_cart',
        ecommerce: {
            currency: CURRENCY,
            value: num(item.price) * quantity,
            items: [toGA4Item({ ...item, quantity })],
        },
    });
};

/**
 * Fired once an order is actually paid for.
 *
 * transaction_id is what stops a refresh of the success page counting as a second sale --
 * both Google Ads and GA4 deduplicate on it. Sending the order id rather than anything
 * generated here is what makes that work.
 */
export const trackPurchase = (order: {
    id: number | string;
    value: Money;
    tax?: Money;
    shipping?: Money;
    coupon?: string | null;
    items?: TrackedItem[];
}): void => {
    push({
        event: 'purchase',
        ecommerce: {
            transaction_id: String(order.id),
            currency: CURRENCY,
            value: num(order.value),
            ...(order.tax != null ? { tax: num(order.tax) } : {}),
            ...(order.shipping != null ? { shipping: num(order.shipping) } : {}),
            ...(order.coupon ? { coupon: order.coupon } : {}),
            items: (order.items || []).map(toGA4Item),
        },
    });
};

/** Product page view. GA4 reports on it; no Ads tag currently listens for it. */
export const trackViewItem = (item: TrackedItem): void => {
    push({
        event: 'view_item',
        ecommerce: {
            currency: CURRENCY,
            value: num(item.price),
            items: [toGA4Item(item)],
        },
    });
};

/** Reaching checkout. The step before purchase, and where drop-off is worth seeing. */
export const trackBeginCheckout = (value: Money, items: TrackedItem[] = []): void => {
    push({
        event: 'begin_checkout',
        ecommerce: {
            currency: CURRENCY,
            value: num(value),
            items: items.map(toGA4Item),
        },
    });
};
