const express = require('express');
const rateLimit = require('express-rate-limit');
const { createOrder, getMyOrders, getOrder, updateOrderStatus, tabbyWebhook, stripeWebhook, tamaraWebhook, refundOrder, getOrderRefunds } = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Checkout rate limiter — prevents order spam
// ── RATE LIMITING DISABLED ────────────────────────────────────────────────────
// Turned off at the owner's request. Delete the passthrough and uncomment the
// block below to restore protection.
//
// WARNING: this capped order creation per IP, which is also what limited repeated
// card attempts through checkout.
const checkoutLimiter = (req, res, next) => next();

/* original definition, kept for restoring:
const checkoutLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 60, // per IP per hour
    message: { success: false, message: 'Too many orders placed from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
*/

// Webhooks - must be BEFORE protect middleware (called server-to-server)
router.post('/webhook/tabby', tabbyWebhook);
router.post('/webhook/stripe', stripeWebhook);
router.post('/webhook/tamara', tamaraWebhook);

router.use(protect);

router.route('/')
    .get(getMyOrders)
    .post(checkoutLimiter, createOrder);

router.route('/:id')
    .get(getOrder)
    .put(authorize('admin'), updateOrderStatus);

// Refunds are admin-only and move real money, so they sit behind the same authorisation
// as status changes rather than anything looser.
router.get('/:id/refunds', authorize('admin'), getOrderRefunds);
router.post('/:id/refund', authorize('admin'), refundOrder);

module.exports = router;
