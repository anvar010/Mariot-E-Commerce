const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Coupon = require('../models/coupon.model');
const db = require('../config/db');
const axios = require('axios');

exports.createOrder = async (req, res, next) => {
    try {
        const items = await Cart.getCartItems(req.user.id);
        if (items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        // Final Stock Validation
        for (const item of items) {
            const isTracked = item.track_inventory === 1 || item.track_inventory === true;
            if (isTracked && item.quantity > item.stock_quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Product "${item.name}" is out of stock or requested quantity exceeds available stock (${item.stock_quantity}).`
                });
            }
        }

        // Use the REAL price from DB (already fetched by Cart.getCartItems)
        const subtotal = items.reduce((sum, item) => {
            const unitPrice = Number(item.offer_price) > 0 ? Number(item.offer_price) : Number(item.price);
            return sum + (unitPrice * item.quantity);
        }, 0);

        const { shipping_address_id, payment_method, points_to_use = 0, coupon_id = null, billing_details = null, locale = 'en' } = req.body;
        // NOTE: discount_amount from req.body is intentionally IGNORED for security

        // ====================================================
        // SERVER-SIDE COUPON VALIDATION & DISCOUNT CALCULATION
        // ====================================================
        let calculatedCouponDiscount = 0;
        let validatedCouponId = null;

        if (coupon_id) {
            const [couponRows] = await db.execute('SELECT * FROM coupons WHERE id = ?', [coupon_id]);
            const coupon = couponRows[0];

            if (coupon && coupon.is_active) {
                const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date(new Date().setHours(0, 0, 0, 0));
                const isOverLimit = coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit;
                const isBelowMinimum = subtotal < Number(coupon.min_order_amount);

                if (!isExpired && !isOverLimit && !isBelowMinimum) {
                    // Determine the applicable total (respecting brand/product restrictions)
                    let applicableTotal = subtotal;

                    // Build cart items with brand info for restriction checks
                    const cartItemsWithBrand = items.map(item => ({
                        id: item.product_id,
                        name: item.name,
                        brand: item.brand_name || '',
                        price: Number(item.offer_price) > 0 ? Number(item.offer_price) : Number(item.price),
                        quantity: item.quantity
                    }));

                    let applicableItems = cartItemsWithBrand;

                    // Check brand restrictions
                    if (coupon.applicable_brands) {
                        try {
                            const allowedBrands = JSON.parse(coupon.applicable_brands);
                            applicableItems = applicableItems.filter(item => allowedBrands.includes(item.brand));
                        } catch (e) { /* invalid JSON, skip restriction */ }
                    }

                    // Check product restrictions
                    if (coupon.applicable_products) {
                        try {
                            const allowedProducts = JSON.parse(coupon.applicable_products);
                            applicableItems = applicableItems.filter(item => allowedProducts.includes(item.name) || allowedProducts.includes(String(item.id)));
                        } catch (e) { /* invalid JSON, skip restriction */ }
                    }

                    if (applicableItems.length > 0) {
                        applicableTotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        const discountValue = parseFloat(coupon.discount_value);

                        if (coupon.discount_type === 'percentage') {
                            calculatedCouponDiscount = (applicableTotal * discountValue) / 100;
                        } else {
                            calculatedCouponDiscount = discountValue;
                        }

                        // Cap discount at applicable total
                        if (calculatedCouponDiscount > applicableTotal) {
                            calculatedCouponDiscount = applicableTotal;
                        }

                        calculatedCouponDiscount = Number(calculatedCouponDiscount.toFixed(2));
                        validatedCouponId = coupon.id;
                    }
                }
            }
        }

        // ====================================================
        // SERVER-SIDE REWARD POINTS VALIDATION
        // ====================================================
        let validatedPointsToUse = 0;

        if (points_to_use > 0) {
            // Fetch the user's ACTUAL reward points from the database
            const [userRows] = await db.execute('SELECT reward_points FROM users WHERE id = ?', [req.user.id]);
            const actualPoints = userRows[0]?.reward_points || 0;

            // Ensure user actually has enough points
            const clampedPoints = Math.min(Number(points_to_use), actualPoints);

            // 100 points = 1 AED, and cannot exceed the remaining total after coupon
            const maxAEDFromPoints = clampedPoints / 100;
            const remainingAfterCoupon = subtotal - calculatedCouponDiscount;
            const finalAEDFromPoints = Math.min(maxAEDFromPoints, remainingAfterCoupon);

            validatedPointsToUse = Math.floor(finalAEDFromPoints * 100); // Round down to whole points
        }

        // ====================================================
        // CALCULATE FINAL AMOUNTS
        // ====================================================
        const totalDiscount = calculatedCouponDiscount + (validatedPointsToUse / 100);
        const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
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
            points_to_use: validatedPointsToUse,
            coupon_id: validatedCouponId,
            discount_amount: calculatedCouponDiscount
        };

        const orderId = await Order.create(req.user.id, orderData);

        // --- TABBY INTEGRATION ---
        if (payment_method === 'tabby') {
            try {
                // Prepare line items for Tabby API
                const tabbyItems = items.map(item => ({
                    title: item.name,
                    quantity: item.quantity,
                    unit_price: Number(item.price).toFixed(2),
                    category: item.category || 'Kitchen Equipment'
                }));

                // Sanitize phone number to contain only + and numbers
                let rawPhone = billing_details?.phone || req.user.phone || '+971500000001';
                let finalPhone = rawPhone.replace(/[^0-9+]/g, '');
                if (finalPhone.length < 8) finalPhone = '+971500000001';

                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const localePath = locale === 'ar' ? '/ar' : '/en';

                // --- TABBY MOCK FOR DEVELOPMENT TESTING ---
                // If you haven't replaced the placeholder keys with actual test keys,
                // we'll bypass the API call and mock a successful redirect.
                if (!process.env.TABBY_SECRET_KEY || process.env.TABBY_SECRET_KEY.includes('REPLACE_WITH_YOUR_KEY')) {
                    return res.status(201).json({
                        success: true,
                        requires_redirect: true,
                        redirect_url: `${frontendUrl}${localePath}/checkoutsuccess?orderId=${orderId}&tabby_status=success`,
                        data: { id: orderId, ...orderData }
                    });
                }
                // --- END TABBY MOCK ---

                // Build Tabby API Request
                const tabbyPayload = {
                    payment: {
                        amount: finalAmount.toFixed(2),
                        currency: 'AED',
                        description: `Order #${orderId} from Mariot Store`,
                        buyer: {
                            email: billing_details?.email || req.user.email,
                            name: billing_details?.name || req.user.name,
                            phone: finalPhone
                        },
                        shipping_address: {
                            city: billing_details?.city || 'Dubai',
                            address: billing_details?.streetAddress || 'N/A',
                            zip: billing_details?.postcode || '00000'
                        },
                        order: {
                            reference_id: orderId.toString(),
                            items: tabbyItems
                        },
                        buyer_history: {
                            registered_since: req.user.created_at || new Date().toISOString(),
                            loyalty_level: 0
                        }
                    },
                    lang: locale === 'ar' ? 'ar' : 'en',
                    merchant_code: process.env.TABBY_MERCHANT_CODE || 'default',
                    merchant_urls: {
                        success: `${frontendUrl}${localePath}/checkoutsuccess?orderId=${orderId}&tabby_status=success`,
                        cancel: `${frontendUrl}${localePath}/checkout?tabby_status=cancel&orderId=${orderId}`,
                        failure: `${frontendUrl}${localePath}/checkout?tabby_status=failure&orderId=${orderId}`
                    }
                };

                // Call Tabby Checkout API
                const tabbyResponse = await axios.post('https://api.tabby.ai/api/v2/checkout', tabbyPayload, {
                    headers: {
                        Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                const availableProducts = tabbyResponse.data?.configuration?.available_products;

                // Scenario 2: Background Pre-scoring Reject
                // If installments is empty or not available, Tabby rejected the buyer
                if (!availableProducts?.installments || availableProducts.installments.length === 0) {
                    // Tabby rejected this buyer - delete the pending order
                    return res.status(422).json({
                        success: false,
                        message: locale === 'ar'
                            ? 'نأسف، تابي غير قادرة على الموافقة على هذه العملية. الرجاء استخدام طريقة دفع أخرى.'
                            : 'Sorry, Tabby is unable to approve this purchase, please use an alternative payment method for your order.',
                        tabby_rejected: true
                    });
                }

                // Get Tabby's redirect URL
                const tabbyPaymentUrl = availableProducts.installments[0].web_url;

                // Return URL to frontend so it can redirect the user to Tabby HPP
                return res.status(201).json({
                    success: true,
                    requires_redirect: true,
                    redirect_url: tabbyPaymentUrl,
                    data: { id: orderId, ...orderData }
                });
            } catch (tabbyError) {
                console.error('Tabby Checkout Error:', JSON.stringify(tabbyError.response?.data || tabbyError.message, null, 2));
                return res.status(500).json({
                    success: false,
                    message: 'Failed to initialize Tabby payment flow',
                    error_details: tabbyError.response?.data || tabbyError.message
                });
            }
        }
        // --- END TABBY ---

        res.status(201).json({
            success: true,
            requires_redirect: false,
            data: { id: orderId, ...orderData }
        });
    } catch (error) {
        next(error);
    }
};

// --- TABBY WEBHOOK ---
// Tabby sends a POST webhook when payment status changes (AUTHORIZED, CLOSED, REJECTED, EXPIRED)
// This handles the "Corner Case" scenario where user closes browser before redirect
exports.tabbyWebhook = async (req, res) => {
    try {
        const { id: tabbyPaymentId, status } = req.body;

        console.log(`[Tabby Webhook] Payment ${tabbyPaymentId} status: ${status}`);

        if (!tabbyPaymentId) {
            return res.status(400).json({ success: false, message: 'Missing payment ID' });
        }

        // Fetch full payment details from Tabby to get the order reference_id
        const tabbyPayment = await axios.get(`https://api.tabby.ai/api/v2/payments/${tabbyPaymentId}`, {
            headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` }
        });

        const referenceId = tabbyPayment.data?.order?.reference_id;
        if (!referenceId) {
            console.error('[Tabby Webhook] No reference_id found in payment');
            return res.status(400).json({ success: false, message: 'No order reference found' });
        }

        const orderId = parseInt(referenceId);

        // If Tabby says AUTHORIZED or CLOSED, mark order as paid (triggers processOrderCompletion)
        if (status === 'AUTHORIZED' || status === 'CLOSED') {
            await Order.updatePaymentStatus(orderId, 'paid');
            console.log(`[Tabby Webhook] Order #${orderId} marked as PAID`);

            // Auto-capture if AUTHORIZED (Tabby expects merchants to capture)
            if (status === 'AUTHORIZED') {
                try {
                    await axios.post(`https://api.tabby.ai/api/v2/payments/${tabbyPaymentId}/captures`, {
                        amount: tabbyPayment.data.amount
                    }, {
                        headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` }
                    });
                    console.log(`[Tabby Webhook] Payment ${tabbyPaymentId} captured successfully`);
                } catch (captureErr) {
                    console.error('[Tabby Webhook] Capture failed:', captureErr.response?.data || captureErr.message);
                }
            }
        } else if (status === 'REJECTED' || status === 'EXPIRED') {
            await Order.updatePaymentStatus(orderId, 'failed');
            console.log(`[Tabby Webhook] Order #${orderId} marked as FAILED (${status})`);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Tabby Webhook] Error:', error.message);
        res.status(500).json({ success: false, message: 'Webhook processing failed' });
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
