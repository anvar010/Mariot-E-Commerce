/**
 * Has a coupon's expiry date passed?
 *
 * `expiry_date` is a DATE, not a timestamp -- it arrives as midnight ("2026-09-19" or
 * "2026-09-19T00:00:00.000Z"). Comparing that midnight against `new Date()` marks a coupon
 * expired from one second past midnight on its final day, so checkout greyed out coupons
 * the server was still accepting: the cart applied them and checkout called them expired.
 *
 * A coupon is valid THROUGH its expiry date, so the question is whether that date falls
 * before today -- a date-to-date comparison, with no clock in it. This matches the server,
 * which tests against `new Date().setHours(0, 0, 0, 0)`.
 *
 * The date part is taken from the string rather than via the Date object, because
 * `new Date("2026-09-19")` parses as UTC midnight and would read as the previous day
 * anywhere west of Greenwich.
 */
export const isCouponExpired = (expiryDate?: string | null): boolean => {
    if (!expiryDate) return false; // No expiry date means it never expires.

    const raw = String(expiryDate);
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

    const expiry = ymd
        ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
        : new Date(raw);
    if (Number.isNaN(expiry.getTime())) return false; // Unparseable: let the server decide.

    expiry.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expiry.getTime() < today.getTime();
};
