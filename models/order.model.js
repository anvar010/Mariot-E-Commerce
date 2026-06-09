const db = require('../config/db');
const { sendOrderConfirmationEmail } = require('../utils/sendEmail');

// Lazy migration: make sure order_items has the customization columns.
let customColsEnsured = false;
async function ensureCustomColumns(connection) {
    if (customColsEnsured) return;
    const conn = connection || db;
    const [cols] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'
           AND COLUMN_NAME IN ('custom_dimensions','custom_label','is_free_gift','bundle_parent_product_id')`
    );
    const have = new Set(cols.map(r => r.COLUMN_NAME));
    if (!have.has('custom_dimensions')) {
        await conn.query(`ALTER TABLE order_items ADD COLUMN custom_dimensions TEXT NULL`);
    }
    if (!have.has('custom_label')) {
        await conn.query(`ALTER TABLE order_items ADD COLUMN custom_label VARCHAR(255) NULL`);
    }
    if (!have.has('is_free_gift')) {
        await conn.query(`ALTER TABLE order_items ADD COLUMN is_free_gift TINYINT(1) NOT NULL DEFAULT 0`);
    }
    if (!have.has('bundle_parent_product_id')) {
        await conn.query(`ALTER TABLE order_items ADD COLUMN bundle_parent_product_id INT NULL`);
    }
    customColsEnsured = true;
}

class Order {
    static async create(userId, { items, shipping_address_id, billing_details, payment_method, total_amount, vat_amount, final_amount, points_to_use = 0, coupon_id = null, discount_amount = 0 }) {
        await ensureCustomColumns(null);
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

            // points_discount is recorded for the order, but NOT subtracted again here:
            // the controller already deducts points from the (pre-VAT) subtotal before
            // computing final_amount, so subtracting once more would double-count them.
            const pointsDiscount = points_to_use * aedPerPoint;
            const adjustedFinalAmount = Math.max(0, final_amount);

            const initialPaymentStatus = 'pending';

            // Receiver (who will be at the door) — comes from the checkout form.
            const receiverName = (billing_details?.name || '').trim() || null;
            const receiverPhone = (billing_details?.phone || '').trim() || null;

            // 1. Create order
            const [orderResult] = await connection.execute(
                `INSERT INTO orders (user_id, total_amount, vat_amount, final_amount, shipping_address_id, receiver_name, receiver_phone, payment_method, payment_status, points_used, points_discount, coupon_id, discount_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, total_amount, vat_amount, adjustedFinalAmount, finalAddressId, receiverName, receiverPhone, payment_method, initialPaymentStatus, points_to_use, pointsDiscount, coupon_id, discount_amount]
            );
            const orderId = orderResult.insertId;

            // 2. Create order items (No stock deduction yet)
            // Build cart_item_id -> product_id map so bundle linkage survives checkout.
            const cartItemToProduct = {};
            for (const it of items) {
                if (it.cart_item_id != null) cartItemToProduct[Number(it.cart_item_id)] = Number(it.product_id);
            }
            for (const item of items) {
                const customDims = (() => {
                    if (!item.custom_dimensions) return null;
                    if (typeof item.custom_dimensions === 'string') return item.custom_dimensions;
                    try { return JSON.stringify(item.custom_dimensions); } catch (e) { return null; }
                })();
                const customLabel = item.custom_label ? String(item.custom_label).slice(0, 255) : null;
                const isFreeGift = item.is_free_gift ? 1 : 0;
                const bundleParentProductId = item.bundle_parent_id != null
                    ? (cartItemToProduct[Number(item.bundle_parent_id)] || null)
                    : null;
                await connection.execute(
                    `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price_at_purchase, custom_dimensions, custom_label, is_free_gift, bundle_parent_product_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [orderId, item.product_id, item.variant_id || null, item.quantity, item.price, customDims, customLabel, isFreeGift, bundleParentProductId]
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
        // 1. Reduce stock — variant stock when line has a variant, else product stock (respecting track_inventory)
        for (const item of items) {
            if (item.variant_id) {
                await connection.execute(
                    'UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?',
                    [item.quantity, item.variant_id]
                );
            } else {
                await connection.execute(
                    'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ? AND track_inventory = 1',
                    [item.quantity, item.product_id]
                );
            }
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
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return rows;
    }

    static async findById(id) {
        await ensureCustomColumns(null);
        const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [id]);
        if (rows.length === 0) return null;

        const [items] = await db.execute(`
            SELECT oi.*,
                   p.name, p.name_ar, p.slug, p.model AS product_model,
                   pv.sku AS variant_sku,
                   pp.name AS bundle_parent_name, pp.name_ar AS bundle_parent_name_ar,
                   (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN product_variants pv ON pv.id = oi.variant_id
            LEFT JOIN products pp ON pp.id = oi.bundle_parent_product_id
            WHERE oi.order_id = ?
        `, [id]);

        // Surface the model number admins/PDFs should show: the selected variant's
        // SKU when present, otherwise the parent product's model.
        for (const it of items) {
            it.model_number = it.variant_sku || it.product_model || null;
        }

        // Parse stored JSON for custom_dimensions so consumers get an object
        for (const it of items) {
            if (it.custom_dimensions && typeof it.custom_dimensions === 'string') {
                try { it.custom_dimensions = JSON.parse(it.custom_dimensions); } catch (e) { it.custom_dimensions = null; }
            }
        }

        // Points credited for this order (earned entries live in the ledger,
        // not on the orders row). points_used (redeemed) is already on rows[0].
        const [[pe]] = await db.execute(
            "SELECT COALESCE(SUM(points), 0) AS points_earned FROM reward_points_history WHERE order_id = ? AND transaction_type = 'earned'",
            [id]
        );
        rows[0].points_earned = pe.points_earned;

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
                const [items] = await connection.execute('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?', [id]);

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
