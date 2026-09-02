export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export const BASE_URL = API_BASE_URL.replace(/\/api\/v1(\/)?$/, '').replace(/\/$/, '');

// Use BASE_URL for images as a default so local development works out-of-the-box
// But allow hardcoding for specific CDNs if needed
export const MEDIA_BASE_URL = BASE_URL || 'https://mariot-backend.onrender.com';

/**
 * Tabby is hidden until its keys are live again. Flip this to true to bring back the
 * payment option, the instalment promos on the product page and checkout, and the entry
 * on the payment-information page -- everything is gated on this one flag rather than
 * commented out, so restoring it can't half-happen.
 */
export const TABBY_ENABLED = false;

/**
 * Live carrier shipping quotes (Aramex / DHL) at checkout. Off until the carrier accounts
 * and credentials are in place -- with none configured the backend can only return a flat
 * fallback, which reads to the customer as free shipping. Turning this on restores the
 * quote request, the method selector, and the requirement to pick one before paying.
 */
export const SHIPPING_QUOTES_ENABLED = false;

/**
 * Settlement fee on Buy-Now-Pay-Later orders (Tabby / Tamara).
 *
 * These providers keep a percentage of what they settle, so the cost is passed on as its
 * own line on the order. It is charged on the whole pre-fee total -- goods INCLUDING the
 * 5% VAT, plus delivery -- and is itself outside the taxable base.
 *
 * Display rule: show the amount, never the rate. Nothing customer-facing may name the
 * percentage.
 *
 * This mirrors backend/config/settlementFee.js, which is the authority: the server
 * recomputes the fee on every order and charges its own figure. This copy exists only so
 * checkout can show the customer the same number before they commit.
 */
export const SETTLEMENT_FEE_RATE = 0.07;

export const SETTLEMENT_FEE_METHODS = ['tabby', 'tamara'];

export const settlementFeeFor = (paymentMethod: string, baseAmount: number): number => {
    if (!SETTLEMENT_FEE_METHODS.includes(String(paymentMethod || '').toLowerCase())) return 0;
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) return 0;
    // Rounded to 2dp exactly as the server does, so the displayed total matches the charge.
    return Math.round(baseAmount * SETTLEMENT_FEE_RATE * 100) / 100;
};
