const express = require('express');
const { createOrder, getMyOrders, getOrder, updateOrderStatus, tabbyWebhook, stripeWebhook } = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Webhooks - must be BEFORE protect middleware (called server-to-server)
router.post('/webhook/tabby', tabbyWebhook);
router.post('/webhook/stripe', stripeWebhook);

router.use(protect);

router.route('/')
    .get(getMyOrders)
    .post(createOrder);

router.route('/:id')
    .get(getOrder)
    .put(authorize('admin'), updateOrderStatus);

module.exports = router;
