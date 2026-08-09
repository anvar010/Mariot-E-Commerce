/**
 * Delivery promise shown on the product page, and the admin field that feeds it.
 *
 * The admin stores a number of days, never a date: the date is derived at render time from
 * today + N, so a product set to "3 days" keeps promising a correct date forever without
 * anyone editing it.
 *
 * The cut-off is midnight local time. "Order in 9h 9m" is the time left today, and when it
 * reaches zero the promised date rolls forward with it.
 */

export const DEFAULT_DELIVERY_DAYS = 3;
/** Up to this many days still counts as express and earns the yellow badge. */
export const EXPRESS_MAX_DAYS = 2;
const MAX_DELIVERY_DAYS = 365;

export const DELIVERY_PRESETS: { days: number; label: string }[] = [
    { days: 1, label: 'Next day' },
    { days: 3, label: '3 days' },
    { days: 7, label: '1 week' },
    { days: 15, label: '15 days' },
    { days: 30, label: '1 month' },
];

/** Mirrors the backend rule: blank or nonsense means the house default, never zero. */
export const normalizeDeliveryDays = (value: unknown): number => {
    const parsed = parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DELIVERY_DAYS;
    return Math.min(parsed, MAX_DELIVERY_DAYS);
};

export const isExpressDelivery = (days: number): boolean => days <= EXPRESS_MAX_DAYS;

/** The date an order placed now would arrive. Midnight-based, so it rolls at 00:00. */
export const deliveryDate = (days: number, from: Date = new Date()): Date => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    date.setDate(date.getDate() + normalizeDeliveryDays(days));
    return date;
};

/** Short weekday + day + month, e.g. "Wed, 12 Aug". */
export const deliveryDateLabel = (days: number, locale = 'en', from: Date = new Date()): string => {
    const date = deliveryDate(normalizeDeliveryDays(days), from);

    if (locale === 'ar') {
        try {
            return new Intl.DateTimeFormat('ar-AE', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
        } catch {
            /* fall through to the English form rather than showing nothing */
        }
    }

    // Composed from parts instead of one pattern: en-GB omits the comma and abbreviates
    // September as "Sept", which reads inconsistently beside the other months.
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    return `${weekday}, ${date.getDate()} ${month}`;
};

/** Milliseconds left before the promise rolls to the next day. */
export const msUntilMidnight = (from: Date = new Date()): number => {
    const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 0, 0, 0);
    return midnight.getTime() - from.getTime();
};

/** Hours and minutes left today, for the "Order in 9h 9m" counter. */
export const timeUntilMidnight = (from: Date = new Date()): { hours: number; minutes: number } => {
    const remaining = Math.max(0, msUntilMidnight(from));
    return {
        hours: Math.floor(remaining / 3_600_000),
        minutes: Math.floor((remaining % 3_600_000) / 60_000),
    };
};
