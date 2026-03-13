const Order = require('../models/order.model');
const Cart = require('../models/cart.model');

exports.createOrder = async (req, res, next) => {
    try {
        const items = await Cart.getCartItems(req.user.id);
        if (items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const { shipping_address_id, payment_method, points_to_use = 0, coupon_id = null, discount_amount = 0, billing_details = null } = req.body;

        const discountedSubtotal = Math.max(0, subtotal - parseFloat(discount_amount || 0));
        const vatRate = 0.05; // 5% VAT in UAE
        const vatAmount = discountedSubtotal * vatRate;
        const finalAmount = discountedSubtotal + vatAmount;

        const orderData = {
            items,
            shipping_address_id,
            billing_details,
            payment_method,
            total_amount: subtotal,
            vat_amount: vatAmount,
            final_amount: finalAmount,
            points_to_use,
            coupon_id,
            discount_amount: parseFloat(discount_amount || 0)
        };

        const orderId = await Order.create(req.user.id, orderData);

        res.status(201).json({
            success: true,
            data: { id: orderId, ...orderData }
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.findByUserId(req.user.id);
        res.json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if order belongs to user or user is admin
        if (order.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status, payment_status } = req.body;

        if (status) {
            await Order.updateStatus(req.params.id, status);
        }

        if (payment_status) {
            await Order.updatePaymentStatus(req.params.id, payment_status);
        }

        res.json({ success: true, message: `Order updated successfully` });
    } catch (error) {
        next(error);
    }
};
