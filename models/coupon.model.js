const db = require('../config/db');

class Coupon {
    static async create(couponData) {
        const code = couponData.code;
        const discount_type = couponData.discount_type || 'percentage';
        const discount_value = parseFloat(couponData.discount_value) || 0;
        const expiry_date = couponData.expiry_date || null;
        const usage_limit = parseInt(couponData.usage_limit) || 0;
        const min_order_amount = parseFloat(couponData.min_order_amount) || 0;
        const is_active = couponData.is_active === undefined ? 1 : (couponData.is_active ? 1 : 0);
        const applicable_brands = couponData.applicable_brands || null;
        const applicable_products = couponData.applicable_products || null;
        const applicable_users = couponData.applicable_users || null;

        const [result] = await db.execute(
            `INSERT INTO coupons (code, discount_type, discount_value, expiry_date, usage_limit, min_order_amount, is_active, applicable_brands, applicable_products, applicable_users)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, discount_type, discount_value, expiry_date, usage_limit, min_order_amount, is_active, applicable_brands, applicable_products, applicable_users]
        );
        return result.insertId;
    }

    static async getAll() {
        const [rows] = await db.execute('SELECT * FROM coupons ORDER BY created_at DESC');
        return rows;
    }

    static async getAvailable() {
        const [rows] = await db.execute('SELECT * FROM coupons WHERE is_active = 1 AND (expiry_date >= CURDATE() OR expiry_date IS NULL) ORDER BY created_at DESC');
        return rows;
    }

    static async findByCode(code) {
        const [rows] = await db.execute('SELECT * FROM coupons WHERE code = ?', [code]);
        return rows[0];
    }

    static async updateUsage(id) {
        await db.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [id]);
    }

    /**
     * How many times has this customer already redeemed this coupon?
     *
     * Counted from the orders themselves rather than a separate tally, so it cannot drift
     * out of step with what was actually bought. Cancelled orders do not count -- a shopper
     * whose order was cancelled has not had the benefit and should not lose the code.
     */
    /**
     * Is this coupon reserved for particular customers, and is this one of them?
     *
     * The restriction is stored as email addresses rather than user ids so a code can be
     * promised to someone before they have an account -- it starts working the moment they
     * sign up with that address. Returns null when the coupon is open to everyone.
     *
     * Lives on the model because two controllers need it: the validate endpoint the cart
     * calls, and the order endpoint that actually grants the discount.
     */
    static userRestrictionError(coupon, user) {
        if (!coupon || !coupon.applicable_users) return null;

        let allowed;
        try {
            allowed = JSON.parse(coupon.applicable_users);
        } catch {
            return null; // An unreadable restriction is treated as none, as elsewhere here.
        }
        if (!Array.isArray(allowed) || allowed.length === 0) return null;

        // Deliberately vague: telling a stranger "this code belongs to someone else"
        // invites them to go looking for whom.
        const denied = 'This coupon code is not available for your account.';
        if (!user || !user.email) return denied;

        const mine = String(user.email).trim().toLowerCase();
        return allowed.some(e => String(e).trim().toLowerCase() === mine) ? null : denied;
    }

    static async timesUsedBy(couponId, userId) {
        if (!couponId || !userId) return 0;
        const [[row]] = await db.execute(
            `SELECT COUNT(*) AS n FROM orders
              WHERE coupon_id = ? AND user_id = ? AND status <> 'cancelled'`,
            [couponId, userId]
        );
        return Number(row?.n) || 0;
    }

    /**
     * Shoppers the admin can reserve a coupon for.
     *
     * Customers only -- staff and admins are not who a promotional code is aimed at, and
     * listing them just makes the picker longer.
     */
    static async listCustomers() {
        const [rows] = await db.execute(`
            SELECT u.id, u.name, u.email
              FROM users u
              LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.email IS NOT NULL AND u.email <> ''
               AND COALESCE(r.name, 'user') = 'user'
             ORDER BY u.name ASC
        `);
        return rows;
    }

    static async delete(id) {
        await db.execute('DELETE FROM coupons WHERE id = ?', [id]);
    }

    static async update(id, data) {
        const code = data.code;
        const discount_type = data.discount_type || 'percentage';
        const discount_value = parseFloat(data.discount_value) || 0;
        const expiry_date = data.expiry_date || null;
        const usage_limit = parseInt(data.usage_limit) || 0;
        const min_order_amount = parseFloat(data.min_order_amount) || 0;
        const is_active = data.is_active === undefined ? 1 : (data.is_active ? 1 : 0);
        const applicable_brands = data.applicable_brands || null;
        const applicable_products = data.applicable_products || null;
        const applicable_users = data.applicable_users || null;

        await db.execute(
            `UPDATE coupons SET code=?, discount_type=?, discount_value=?, expiry_date=?, usage_limit=?, min_order_amount=?, is_active=?, applicable_brands=?, applicable_products=?, applicable_users=? WHERE id=?`,
            [code, discount_type, discount_value, expiry_date, usage_limit, min_order_amount, is_active, applicable_brands, applicable_products, applicable_users, id]
        );
    }
}

module.exports = Coupon;
