const db = require('../config/db');

/**
 * Shipping quote requests.
 *
 * Outside the UAE the delivery cost cannot be worked out automatically, so a shopper there
 * asks for a price rather than placing an order. Nothing is charged and no order exists
 * until they accept a figure and pay.
 *
 * Everything except the delivery charge is fixed when the request is made. A quote is an
 * offer: it has to still mean what it said when the shopper opens it days later, whatever
 * has happened to their cart or to the catalogue since.
 */

// How long an offer stands. Prices are held for this window, so it cannot be open-ended.
const QUOTE_VALID_DAYS = 14;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

class ShippingQuote {
    /**
     * Human reference, e.g. SQ-000042. Shown to the customer and quoted back in email, so
     * it stays readable rather than exposing the row id.
     */
    static reference(id) {
        return `SQ-${String(id).padStart(6, '0')}`;
    }

    static async create(userId, {
        country, state, city, address_line1, address_line2, zip_code,
        contact_name, contact_phone, contact_email, customer_note,
        items, subtotal, discount_amount = 0, coupon_id = null,
        points_used = 0, points_discount = 0, vat_amount = 0,
        locale = 'en',
    }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [res] = await connection.execute(
                `INSERT INTO shipping_quote_requests
                 (reference, user_id, locale, country, state, city, address_line1, address_line2, zip_code,
                  contact_name, contact_phone, contact_email, customer_note,
                  subtotal, discount_amount, coupon_id, points_used, points_discount, vat_amount, expires_at)
                 VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
                [userId || null, locale === 'ar' ? 'ar' : 'en',
                    country, state || null, city || null, address_line1 || null,
                    address_line2 || null, zip_code || null, contact_name || null, contact_phone || null,
                    contact_email || null, customer_note || null,
                    round2(subtotal), round2(discount_amount), coupon_id, points_used,
                    round2(points_discount), round2(vat_amount), QUOTE_VALID_DAYS]
            );
            const id = res.insertId;

            // The reference is derived from the id, so it is set once the row exists.
            await connection.execute(
                'UPDATE shipping_quote_requests SET reference = ? WHERE id = ?',
                [this.reference(id), id]
            );

            for (const item of items) {
                // Name and model are copied in, not referenced -- the quote must still say
                // what was asked for even if the product is deleted before it is accepted.
                const [[snapshot]] = await connection.execute(
                    'SELECT name, model FROM products WHERE id = ?', [item.product_id]
                );
                const customDims = item.custom_dimensions
                    ? (typeof item.custom_dimensions === 'string'
                        ? item.custom_dimensions
                        : JSON.stringify(item.custom_dimensions))
                    : null;
                await connection.execute(
                    `INSERT INTO shipping_quote_items
                     (quote_id, product_id, product_name, product_model, variant_id, quantity,
                      price_at_request, custom_dimensions, custom_label, is_free_gift, bundle_parent_product_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, item.product_id, snapshot?.name || null, snapshot?.model || null,
                        item.variant_id || null, item.quantity, round2(item.price),
                        customDims, item.custom_label || null, item.is_free_gift ? 1 : 0,
                        item.bundle_parent_product_id || null]
                );
            }

            await connection.commit();
            return id;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT q.*, u.name AS user_name, u.email AS user_email,
                    a.name AS quoted_by_name
             FROM shipping_quote_requests q
             LEFT JOIN users u ON u.id = q.user_id
             LEFT JOIN users a ON a.id = q.quoted_by
             WHERE q.id = ?`,
            [id]
        );
        if (!rows.length) return null;

        const [items] = await db.execute(
            `SELECT i.*,
                    COALESCE(p.name, i.product_name) AS name,
                    p.name_ar,
                    p.slug,
                    -- Shown under the line at checkout, the same way the cart shows it.
                    pv.sku AS variant_label,
                    (p.id IS NULL) AS product_removed,
                    COALESCE(
                        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1),
                        NULLIF(pv.image_url, '')
                    ) AS image
             FROM shipping_quote_items i
             LEFT JOIN products p ON p.id = i.product_id
             LEFT JOIN product_variants pv ON pv.id = i.variant_id
             WHERE i.quote_id = ?`,
            [id]
        );

        rows[0].items = items;
        return rows[0];
    }

    static async findAllForAdmin() {
        const [rows] = await db.execute(
            `SELECT q.*, u.name AS user_name, u.email AS user_email,
                    (SELECT COUNT(*) FROM shipping_quote_items i WHERE i.quote_id = q.id) AS item_count
             FROM shipping_quote_requests q
             LEFT JOIN users u ON u.id = q.user_id
             ORDER BY q.created_at DESC`
        );
        return rows;
    }

    static async findForUser(userId) {
        const [rows] = await db.execute(
            `SELECT q.*,
                    (SELECT COUNT(*) FROM shipping_quote_items i WHERE i.quote_id = q.id) AS item_count
             FROM shipping_quote_requests q
             WHERE q.user_id = ?
             ORDER BY q.created_at DESC`,
            [userId]
        );
        return rows;
    }

    /**
     * The admin's delivery figure. Everything else was fixed at request time, so the total
     * is simply rebuilt from the stored parts -- nothing is recalculated from the catalogue.
     *
     * The BNPL settlement fee is deliberately absent: it depends on the payment method the
     * customer picks later, so it is added at payment, exactly as at checkout.
     */
    static async setPrice(id, { delivery_charge, admin_note, adminId }) {
        const quote = await this.findById(id);
        if (!quote) return null;

        const delivery = round2(delivery_charge);
        const total = round2(Number(quote.subtotal) + Number(quote.vat_amount) + delivery);

        await db.execute(
            `UPDATE shipping_quote_requests
             SET delivery_charge = ?, quoted_total = ?, admin_note = ?, status = 'quoted',
                 quoted_at = NOW(), quoted_by = ?,
                 expires_at = DATE_ADD(NOW(), INTERVAL ? DAY)
             WHERE id = ?`,
            [delivery, total, admin_note || null, adminId || null, QUOTE_VALID_DAYS, id]
        );
        return this.findById(id);
    }

    static async respond(id, accepted) {
        await db.execute(
            `UPDATE shipping_quote_requests
             SET status = ?, responded_at = NOW()
             WHERE id = ?`,
            [accepted ? 'accepted' : 'declined', id]
        );
        return this.findById(id);
    }

    static async markOrdered(id, orderId) {
        await db.execute(
            "UPDATE shipping_quote_requests SET status = 'ordered', order_id = ? WHERE id = ?",
            [orderId, id]
        );
    }

    /** Past its window and never acted on. Checked on read rather than by a scheduled job. */
    static isExpired(quote) {
        if (!quote?.expires_at) return false;
        if (['ordered', 'declined'].includes(quote.status)) return false;
        return new Date(quote.expires_at).getTime() < Date.now();
    }
}

module.exports = ShippingQuote;
module.exports.QUOTE_VALID_DAYS = QUOTE_VALID_DAYS;
