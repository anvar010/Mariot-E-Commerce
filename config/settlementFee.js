// Settlement fee charged on Buy-Now-Pay-Later orders.
//
// Tabby and Tamara deduct a percentage of the settled transaction from what they pay
// us, so that cost is passed on as a line on the order. Card and cash orders never
// carry it.
//
// The rate is applied to the whole pre-fee total -- goods INCLUDING the 5% VAT, plus
// delivery -- because that is the figure the provider actually settles on. It is
// deliberately NOT part of the taxable base: VAT is computed first, the fee is added
// afterwards, and every VAT figure downstream (invoice, email) is derived from the
// total with this fee taken back out.
//
// Customer-facing text never names the percentage; only the resulting amount is shown.
// Keep this in step with the frontend mirror in frontend/src/config.ts.
const SETTLEMENT_FEE_RATE = 0.07;

const SETTLEMENT_FEE_METHODS = ['tabby', 'tamara'];

const hasSettlementFee = (paymentMethod) =>
    SETTLEMENT_FEE_METHODS.includes(String(paymentMethod || '').toLowerCase());

// Money is stored to 2dp, so round here rather than letting a long fraction reach the
// gateway: the amount we charge and the amount we record have to be the same number.
const settlementFeeFor = (paymentMethod, baseAmount) => {
    if (!hasSettlementFee(paymentMethod)) return 0;
    const base = Number(baseAmount);
    if (!Number.isFinite(base) || base <= 0) return 0;
    return Math.round(base * SETTLEMENT_FEE_RATE * 100) / 100;
};

module.exports = { SETTLEMENT_FEE_RATE, SETTLEMENT_FEE_METHODS, hasSettlementFee, settlementFeeFor };
