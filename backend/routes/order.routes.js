const express = require('express');
const { createOrder, getMyOrders, getOrder, updateOrderStatus, tabbyWebhook } = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Tabby webhook - must be BEFORE protect middleware (Tabby calls this server-to-server)
router.post('/webhook/tabby', tabbyWebhook);

router.use(protect);

router.route('/')
    .get(getMyOrders)
    .post(createOrder);

router.route('/:id')
    .get(getOrder)
    .put(authorize('admin'), updateOrderStatus);

module.exports = router;
