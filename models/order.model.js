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

            // 2. Create order items
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                     VALUES (?, ?, ?, ?)`,
                    [orderId, item.product_id, item.quantity, item.price]
                );

                // Reduce stock
                await connection.execute(
                    'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            // 3. Clear cart
            await connection.execute(
                'DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = ?)',
                [userId]
            );

            // 3.5 Update coupon usage
            if (coupon_id) {
                await connection.execute(
                    'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
                    [coupon_id]
                );
            }

            // 4. Deduct points used
            if (points_to_use > 0) {
                await connection.execute(
                    'UPDATE users SET reward_points = reward_points - ? WHERE id = ?',
                    [points_to_use, userId]
                );

                await connection.execute(
                    'INSERT INTO reward_points_history (user_id, points, transaction_type, order_id, description) VALUES (?, ?, "redeemed", ?, ?)',
                    [userId, points_to_use, orderId, `Points redeemed for order #${orderId}`]
                );
            }

            // 5. Calculate and add rewards points (on the remaining cash amount out of pocket)
            // Updated Rule: Award 1 point for every 2 AED spent
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

            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
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
        await db.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id]);
    }
}

module.exports = Order;
