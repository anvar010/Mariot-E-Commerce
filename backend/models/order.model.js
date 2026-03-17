const db = require('../config/db');

class Order {
    static async create(userId, { items, shipping_address_id, billing_details, payment_method, total_amount, vat_amount, final_amount, points_to_use = 0, coupon_id = null, discount_amount = 0 }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            let finalAddressId = shipping_address_id;

            // If a form was given and shipping_address_id is a placeholder (like 1), create the address real-time!
            if (billing_details && billing_details.streetAddress) {
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
                finalAddressId = null; // if default was placeholder and no details passed avoid error
            }

            const pointsDiscount = points_to_use / 100; // 100 points = 1 AED
            const adjustedFinalAmount = Math.max(0, final_amount - pointsDiscount);

            const initialPaymentStatus = payment_method === 'card' ? 'paid' : 'pending';

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
            if (payment_method !== 'tabby') {
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
                'INSERT INTO reward_points_history (user_id, points, transaction_type, order_id, description) VALUES (?, ?, "redeemed", ?, ?)',
                [userId, points_to_use, orderId, `Points redeemed for order #${orderId}`]
            );
        }

        // 4. Calculate and add rewards points
        const pointsEarned = Math.floor(adjustedFinalAmount / 2);
        if (pointsEarned > 0) {
            await connection.execute(
                'UPDATE users SET reward_points = reward_points + ? WHERE id = ?',
                [pointsEarned, userId]
            );

            await connection.execute(
                'INSERT INTO reward_points_history (user_id, points, transaction_type, order_id, description) VALUES (?, ?, "earned", ?, ?)',
                [userId, pointsEarned, orderId, `Points earned from order #${orderId}`]
            );
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
            const [order] = await connection.execute('SELECT user_id, payment_status, points_used, final_amount FROM orders WHERE id = ?', [id]);
            if (order.length === 0) throw new Error("Order not found");

            const currentStatus = order[0].payment_status;

            // Update status
            await connection.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id]);

            // If it's transitioning to paid, and wasn't paid before, process completion
            if (payment_status === 'paid' && currentStatus !== 'paid') {
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
