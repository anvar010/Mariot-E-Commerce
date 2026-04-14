const db = require('../config/db');
const { sendOrderConfirmationEmail } = require('../utils/sendEmail');

class Order {
    static async create(userId, { items, shipping_address_id, billing_details, payment_method, total_amount, vat_amount, final_amount, points_to_use = 0, coupon_id = null, discount_amount = 0 }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            let finalAddressId = shipping_address_id;

            // If a form was given AND the user did NOT select an existing address (so shipping_address_id is the placeholder '1' or null),
            // ONLY THEN do we create a brand new address manually.
            if ((!shipping_address_id || shipping_address_id === 1) && billing_details && billing_details.streetAddress) {
                const [addrResult] = await connection.execute(
                    `INSERT INTO addresses (user_id, address_line1, address_line2, city, state, zip_code, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        billing_details.streetAddress,
                        billing_details.additionalAddress || null,
                        billing_details.city || 'Dubai',
                        billing_details.country || 'UAE',
                        billing_details.postcode || '00000',
                        billing_details.phone || ''
                    ]
                );
                finalAddressId = addrResult.insertId;
            } else if (shipping_address_id === 1) {
                // If it's a placeholder but no details were provided (like a purely digital good checkout), null it.
                finalAddressId = null;
            }

            // Fetch dynamic point value (default: 0.01 AED per point)
            const [settingRows] = await connection.execute('SELECT `value` FROM settings WHERE `key` = \'aed_per_point\'');
            const aedPerPoint = settingRows[0] ? parseFloat(settingRows[0].value) : 0.01;

            const pointsDiscount = points_to_use * aedPerPoint;
            const adjustedFinalAmount = Math.max(0, final_amount - pointsDiscount);

            const initialPaymentStatus = 'pending';

            // 1. Create order
            const [orderResult] = await connection.execute(
                `INSERT INTO orders (user_id, total_amount, vat_amount, final_amount, shipping_address_id, payment_method, payment_status, points_used, points_discount, coupon_id, discount_amount) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, total_amount, vat_amount, adjustedFinalAmount, finalAddressId, payment_method, initialPaymentStatus, points_to_use, pointsDiscount, coupon_id, discount_amount]
            );
            const orderId = orderResult.insertId;

            // 2. Create order items (No stock deduction yet)
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                     VALUES (?, ?, ?, ?)`,
                    [orderId, item.product_id, item.quantity, item.price]
                );
            }

            // 3. Update coupon usage (Coupons are consumed immediately to prevent reuse while pending)
            if (coupon_id) {
                await connection.execute(
                    'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
                    [coupon_id]
                );
            }

            // 4. Process completion operations (clearing cart, stock reduction, points) 
            // We do this immediately for all methods EXCEPT those that require a redirect to a 3rd party (like Tabby) 
            // where the user hasn't successfully finished the checkout yet.
            if (payment_method !== 'tabby' && payment_method !== 'card') {
                await this.processOrderCompletion(connection, userId, orderId, items, points_to_use, adjustedFinalAmount);
            }

            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Handles stock reduction, cart clearing, and reward point allocation.
     * Use this when an order successfully completes payment (Tabby redirect, Stripe Webhook, or immediate Card).
     */
    static async processOrderCompletion(connection, userId, orderId, items, points_to_use, adjustedFinalAmount) {
        // 1. Reduce stock (only if track_inventory is enabled)
        for (const item of items) {
            await connection.execute(
                'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ? AND track_inventory = 1',
                [item.quantity, item.product_id]
            );
        }

        // 2. Clear cart
        await connection.execute(
            'DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = ?)',
            [userId]
        );

        // 3. Deduct points used
        if (points_to_use > 0) {
            await connection.execute(
                'UPDATE users SET reward_points = GREATEST(0, reward_points - ?) WHERE id = ?',
                [points_to_use, userId]
            );

            await connection.execute(
                'INSERT INTO reward_points_history (user_id, points, transaction_type, order_id, description) VALUES (?, ?, \'redeemed\', ?, ?)',
                [userId, points_to_use, orderId, `Points redeemed for order #${orderId}`]
            );
        }

        // 4. Calculate and add rewards points
        const [settingRows] = await connection.execute('SELECT `value` FROM settings WHERE `key` = \'points_per_aed\'');
        const pointsPerAed = settingRows[0] ? parseFloat(settingRows[0].value) : 0.5;

        const pointsEarned = Math.floor(adjustedFinalAmount * pointsPerAed);
        if (pointsEarned > 0) {
            await connection.execute(
                'UPDATE users SET reward_points = reward_points + ? WHERE id = ?',
                [pointsEarned, userId]
            );

            await connection.execute(
                'INSERT INTO reward_points_history (user_id, points, transaction_type, order_id, description) VALUES (?, ?, \'earned\', ?, ?)',
                [userId, pointsEarned, orderId, `Points earned from order #${orderId}`]
            );
        }

        // 4. Update order to mark as processed
        await connection.execute(
            'UPDATE orders SET is_processed = 1 WHERE id = ?',
            [orderId]
        );

        // 5. Send Order Confirmation Email
        try {
            // Fetch User info
            const [userRows] = await connection.execute('SELECT name, email FROM users WHERE id = ?', [userId]);

            // Fetch Order info
            const [orderRows] = await connection.execute('SELECT * FROM orders WHERE id = ?', [orderId]);

            if (userRows[0] && orderRows[0]) {
                const { name, email } = userRows[0];
                const orderDataFromDb = orderRows[0];

                // Fetch full item details for the email table (names, prices, images)
                const [fullItems] = await connection.execute(`
                    SELECT oi.quantity, oi.price_at_purchase as price, p.name,
                    (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                `, [orderId]);

                // Fetch the actual address record used
                let billingDetails = {};
                if (orderDataFromDb.shipping_address_id) {
                    const [addrRows] = await connection.execute('SELECT * FROM addresses WHERE id = ?', [orderDataFromDb.shipping_address_id]);
                    if (addrRows[0]) {
                        const a = addrRows[0];
                        billingDetails = {
                            firstName: name.split(' ')[0],
                            lastName: name.split(' ').slice(1).join(' '),
                            streetAddress: a.address_line1 + (a.address_line2 ? ', ' + a.address_line2 : ''),
                            city: a.city,
                            country: a.state || 'UAE', // Using state field for country as per our address model earlier
                            phone: a.phone
                        };
                    }
                }

                // Attach billing details for the email helper
                orderDataFromDb.billing_details = billingDetails;

                sendOrderConfirmationEmail(email, name, orderId, orderDataFromDb.final_amount, fullItems, orderDataFromDb).catch(err =>
                    console.error(`Failed to send order confirmation email for order #${orderId}:`, err)
                );
            }
        } catch (emailError) {
            console.error(`Error attempting to send order confirmation for order #${orderId}:`, emailError);
        }
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [id]);
        if (rows.length === 0) return null;

        const [items] = await db.execute(`
            SELECT oi.*, p.name, (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id]);

        rows[0].items = items;
        return rows[0];
    }

    static async updateStatus(id, status) {
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }

    static async updatePaymentStatus(id, payment_status) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // First get the current order to see if we need to process completion logic
            const [order] = await connection.execute('SELECT user_id, payment_status, is_processed, points_used, final_amount FROM orders WHERE id = ?', [id]);
            if (order.length === 0) throw new Error("Order not found");

            const { payment_status: currentStatus, is_processed } = order[0];

            // Update status
            await connection.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id]);

            // If it's transitioning to paid, and wasn't processed before, process completion
            if (payment_status === 'paid' && !is_processed) {
                // Fetch items for stock reduction
                const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);

                await this.processOrderCompletion(
                    connection,
                    order[0].user_id,
                    id,
                    items,
                    order[0].points_used,
                    order[0].final_amount
                );
            } else if (payment_status === 'paid' && is_processed && currentStatus !== 'paid') {
                // Already processed (e.g. Bank/COD), but now admin confirmed payment
                // Trigger JUST the email part of completion
                try {
                    const [userRows] = await connection.execute('SELECT name, email FROM users WHERE id = ?', [order[0].user_id]);
                    const [orderRows] = await connection.execute('SELECT * FROM orders WHERE id = ?', [id]);

                    if (userRows[0] && orderRows[0]) {
                        const { name, email } = userRows[0];
                        const orderData = orderRows[0];

                        // Fetch items for email
                        const [fullItems] = await connection.execute(`
                            SELECT oi.quantity, oi.price_at_purchase as price, p.name,
                            (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image
                            FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?
                        `, [id]);

                        const { sendOrderConfirmationEmail } = require('../utils/sendEmail');
                        sendOrderConfirmationEmail(email, name, id, orderData.final_amount, fullItems, orderData).catch(e => console.error(e));
                    }
                } catch (e) { console.error("Email update failed:", e); }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Order;
