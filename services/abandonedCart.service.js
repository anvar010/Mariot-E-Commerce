/**
 * Abandoned Cart Reminder Service
 * 
 * Runs on a schedule to find users who have items in their cart but haven't
 * completed checkout, and sends reminder emails.
 * 
 * Reminder #1: Sent 1 hour after cart inactivity
 * Reminder #2: Sent 24 hours after cart inactivity
 */

const db = require('../config/db');
const { sendAbandonedCartEmail } = require('../utils/sendEmail');

// Ensure the tracking table exists
const ensureTable = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS cart_abandonment_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            reminder_number TINYINT NOT NULL DEFAULT 1,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_reminder (user_id, reminder_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
};

/**
 * Find carts that have been inactive (items not updated) and whose users
 * haven't placed a recent order. Send reminder emails.
 */
const processAbandonedCarts = async () => {
    try {
        await ensureTable();

        console.log('[ABANDONED CART] 🔍 Scanning for abandoned carts...');

        // ─── Reminder #1: Cart items older than 1 hour, no order in last 2 hours ───
        const [reminder1Users] = await db.query(`
            SELECT 
                c.user_id,
                u.name AS user_name,
                u.email
            FROM carts c
            JOIN cart_items ci ON ci.cart_id = c.id
            JOIN users u ON u.id = c.user_id
            WHERE ci.created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
              AND u.email IS NOT NULL
              AND u.email != ''
              AND c.user_id NOT IN (
                  SELECT user_id FROM orders WHERE created_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)
              )
              AND c.user_id NOT IN (
                  SELECT user_id FROM cart_abandonment_log WHERE reminder_number = 1 AND sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
              )
            GROUP BY c.user_id
        `);

        // ─── Reminder #2: Cart items older than 24 hours, already got reminder #1 ───
        const [reminder2Users] = await db.query(`
            SELECT 
                c.user_id,
                u.name AS user_name,
                u.email
            FROM carts c
            JOIN cart_items ci ON ci.cart_id = c.id
            JOIN users u ON u.id = c.user_id
            WHERE ci.created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
              AND u.email IS NOT NULL
              AND u.email != ''
              AND c.user_id NOT IN (
                  SELECT user_id FROM orders WHERE created_at > DATE_SUB(NOW(), INTERVAL 48 HOUR)
              )
              AND c.user_id IN (
                  SELECT user_id FROM cart_abandonment_log WHERE reminder_number = 1
              )
              AND c.user_id NOT IN (
                  SELECT user_id FROM cart_abandonment_log WHERE reminder_number = 2 AND sent_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
              )
            GROUP BY c.user_id
        `);

        let totalSent = 0;

        // Send Reminder #1
        for (const user of reminder1Users) {
            try {
                const cartItems = await getCartItemsForEmail(user.user_id);
                if (cartItems.length === 0) continue;

                await sendAbandonedCartEmail(user.email, user.user_name, cartItems, 1);

                await db.query(
                    `INSERT INTO cart_abandonment_log (user_id, reminder_number) VALUES (?, 1)
                     ON DUPLICATE KEY UPDATE sent_at = NOW()`,
                    [user.user_id]
                );
                totalSent++;
            } catch (err) {
                console.error(`[ABANDONED CART] ❌ Failed for user ${user.user_id}:`, err.message);
            }
        }

        // Send Reminder #2
        for (const user of reminder2Users) {
            try {
                const cartItems = await getCartItemsForEmail(user.user_id);
                if (cartItems.length === 0) continue;

                await sendAbandonedCartEmail(user.email, user.user_name, cartItems, 2);

                await db.query(
                    `INSERT INTO cart_abandonment_log (user_id, reminder_number) VALUES (?, 2)
                     ON DUPLICATE KEY UPDATE sent_at = NOW()`,
                    [user.user_id]
                );
                totalSent++;
            } catch (err) {
                console.error(`[ABANDONED CART] ❌ Failed for user ${user.user_id}:`, err.message);
            }
        }

        console.log(`[ABANDONED CART] ✅ Scan complete. Sent ${totalSent} reminder(s).`);
        return totalSent;
    } catch (error) {
        console.error('[ABANDONED CART] ❌ Error processing abandoned carts:', error.message);
        return 0;
    }
};

/**
 * Get formatted cart items for email rendering
 */
const getCartItemsForEmail = async (userId) => {
    const [items] = await db.query(`
        SELECT
            ci.quantity,
            p.name, p.price, p.offer_price, p.slug,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image,
            pv.price AS variant_price,
            pv.offer_price AS variant_offer_price,
            pv.image_url AS variant_image,
            pv.use_primary_image AS variant_use_primary
        FROM cart_items ci
        JOIN carts c ON c.id = ci.cart_id
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN product_variants pv ON pv.id = ci.variant_id
        WHERE c.user_id = ?
    `, [userId]);

    const MEDIA = process.env.MEDIA_BASE_URL || 'https://mariot-backend.onrender.com';

    return items.map(item => {
        const hasVariant = item.variant_price != null;
        const usePrimary = hasVariant && Number(item.variant_use_primary) === 1;
        const rawImg = (hasVariant && !usePrimary && item.variant_image) ? item.variant_image : item.image;
        const fullImage = rawImg
            ? (rawImg.startsWith('http') ? rawImg : `${MEDIA}/uploads/${rawImg}`)
            : 'https://mariotstore.com/assets/mariot-logo.webp';

        return {
            name: item.name,
            quantity: item.quantity,
            price: hasVariant ? Number(item.variant_price) : Number(item.price),
            offer_price: hasVariant
                ? (item.variant_offer_price != null ? Number(item.variant_offer_price) : null)
                : (item.offer_price != null ? Number(item.offer_price) : null),
            image: fullImage,
            slug: item.slug
        };
    });
};

/**
 * Start the abandoned cart reminder cron job
 * Runs every 30 minutes
 */
const startAbandonedCartJob = () => {
    console.log('[ABANDONED CART] 🚀 Cron job started (runs every 30 minutes)');

    // Run once on startup (delayed by 30 seconds to let server fully boot)
    setTimeout(() => {
        processAbandonedCarts();
    }, 30000);

    // Then run every 30 minutes
    setInterval(() => {
        processAbandonedCarts();
    }, 30 * 60 * 1000);
};

module.exports = {
    startAbandonedCartJob,
    processAbandonedCarts,
    getCartItemsForEmail
};
