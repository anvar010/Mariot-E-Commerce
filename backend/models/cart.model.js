const db = require('../config/db');

class Cart {
    static async getOrCreateCart(userId) {
        let [rows] = await db.execute('SELECT id FROM carts WHERE user_id = ?', [userId]);
        if (rows.length === 0) {
            const [result] = await db.execute('INSERT INTO carts (user_id) VALUES (?)', [userId]);
            return result.insertId;
        }
        return rows[0].id;
    }

    static async getCartItems(userId) {
        const cartId = await this.getOrCreateCart(userId);
        const [items] = await db.execute(`
            SELECT
                ci.product_id,
                ci.variant_id,
                ci.quantity,
                p.name, p.name_ar, p.price, p.offer_price, p.slug, p.stock_quantity, p.track_inventory,
                b.name as brand_name,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
                pv.sku AS variant_sku,
                pv.price AS variant_price,
                pv.offer_price AS variant_offer_price,
                pv.stock_quantity AS variant_stock,
                pv.image_url AS variant_image,
                pv.use_primary_image AS variant_use_primary
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            LEFT JOIN brands b ON b.id = p.brand_id
            LEFT JOIN product_variants pv ON pv.id = ci.variant_id
            WHERE ci.cart_id = ?
        `, [cartId]);

        if (items.length === 0) return [];

        // Attach variant option labels when present
        const variantIds = items.map(i => i.variant_id).filter(Boolean);
        const labelsByVariant = {};
        if (variantIds.length > 0) {
            const [rows] = await db.query(
                `SELECT pvo.variant_id, po.name AS option_name, po.name_ar AS option_name_ar,
                        pvo.value, pvo.value_ar
                 FROM product_variant_options pvo
                 JOIN product_options po ON po.id = pvo.option_id
                 WHERE pvo.variant_id IN (?)
                 ORDER BY po.position ASC, po.id ASC`,
                [variantIds]
            );
            rows.forEach(r => {
                if (!labelsByVariant[r.variant_id]) labelsByVariant[r.variant_id] = [];
                labelsByVariant[r.variant_id].push({
                    name: r.option_name, name_ar: r.option_name_ar,
                    value: r.value, value_ar: r.value_ar
                });
            });
        }

        return items.map(it => {
            const hasVariant = it.variant_id != null;
            const usePrimary = hasVariant && Number(it.variant_use_primary) === 1;
            return {
                product_id: it.product_id,
                variant_id: it.variant_id,
                quantity: it.quantity,
                name: it.name,
                name_ar: it.name_ar,
                slug: it.slug,
                brand_name: it.brand_name,
                // Variant lines always honor stock, regardless of product-level track_inventory
                track_inventory: hasVariant ? 1 : it.track_inventory,
                // Price: variant wins when present
                price: hasVariant ? Number(it.variant_price) : Number(it.price),
                offer_price: hasVariant
                    ? (it.variant_offer_price !== null ? Number(it.variant_offer_price) : null)
                    : (it.offer_price !== null ? Number(it.offer_price) : null),
                stock_quantity: hasVariant ? Number(it.variant_stock) : Number(it.stock_quantity),
                image: (hasVariant && !usePrimary && it.variant_image) ? it.variant_image : it.primary_image,
                variant_sku: it.variant_sku,
                variant_options: labelsByVariant[it.variant_id] || null
            };
        });
    }

    static async addItem(userId, productId, quantity, variantId = null) {
        const cartId = await this.getOrCreateCart(userId);

        // Match on (cart, product, variant) — NULL compared with <=> (null-safe equal)
        const [existing] = await db.execute(
            'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id <=> ?',
            [cartId, productId, variantId]
        );

        if (existing.length > 0) {
            await db.execute(
                'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                [quantity, existing[0].id]
            );
        } else {
            await db.execute(
                'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
                [cartId, productId, variantId, quantity]
            );
        }
    }

    static async updateQuantity(userId, productId, quantity, variantId = null) {
        const cartId = await this.getOrCreateCart(userId);
        if (quantity <= 0) {
            return this.removeItem(userId, productId, variantId);
        }
        await db.execute(
            'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ? AND variant_id <=> ?',
            [quantity, cartId, productId, variantId]
        );
    }

    static async removeItem(userId, productId, variantId = null) {
        const cartId = await this.getOrCreateCart(userId);
        await db.execute(
            'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id <=> ?',
            [cartId, productId, variantId]
        );
    }

    static async clearCart(userId) {
        const cartId = await this.getOrCreateCart(userId);
        await db.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    }
}

module.exports = Cart;
