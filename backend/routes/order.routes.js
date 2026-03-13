const express = require('express');
const { createOrder, getMyOrders, getOrder, updateOrderStatus } = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getMyOrders)
    .post(createOrder);

router.route('/:id')
    .get(getOrder)
    .put(authorize('admin'), updateOrderStatus);

module.exports = router;
