const db = require('../config/db');

// Lazy migration: cart_items needs columns for custom-size persistence.
let cartCustomColsEnsured = false;
async function ensureCartCustomColumns() {
    if (cartCustomColsEnsured) return;
    const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cart_items'
           AND COLUMN_NAME IN ('custom_dimensions','custom_label','custom_signature')`
    );
    const have = new Set(cols.map(r => r.COLUMN_NAME));
    if (!have.has('custom_dimensions')) {
        await db.query(`ALTER TABLE cart_items ADD COLUMN custom_dimensions TEXT NULL`);
    }
    if (!have.has('custom_label')) {
        await db.query(`ALTER TABLE cart_items ADD COLUMN custom_label VARCHAR(255) NULL`);
    }
    if (!have.has('custom_signature')) {
        await db.query(`ALTER TABLE cart_items ADD COLUMN custom_signature VARCHAR(255) NULL`);
    }
    cartCustomColsEnsured = true;
}

function buildCustomSignature(dims) {
    if (!dims || typeof dims !== 'object') return null;
    const keys = Object.keys(dims).sort();
    const parts = keys
        .map(k => {
            const v = dims[k];
            if (v === undefined || v === null || v === '') return null;
            return `${k}:${v}`;
        })
        .filter(Boolean);
    return parts.length > 0 ? parts.join('|') : null;
}

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
        await ensureCartCustomColumns();
        const cartId = await this.getOrCreateCart(userId);
        const [items] = await db.execute(`
            SELECT
                ci.product_id,
                ci.variant_id,
                ci.quantity,
                ci.custom_dimensions,
                ci.custom_label,
                ci.custom_signature,
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
            let parsedDims = null;
            if (it.custom_dimensions) {
                try { parsedDims = typeof it.custom_dimensions === 'string' ? JSON.parse(it.custom_dimensions) : it.custom_dimensions; }
                catch (e) { parsedDims = null; }
            }
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
                variant_options: labelsByVariant[it.variant_id] || null,
                custom_dimensions: parsedDims,
                custom_label: it.custom_label || null,
                custom_signature: it.custom_signature || null
            };
        });
    }

    static async addItem(userId, productId, quantity, variantId = null, customDimensions = null, customLabel = null) {
        await ensureCartCustomColumns();
        const cartId = await this.getOrCreateCart(userId);
        const customSignature = buildCustomSignature(customDimensions);
        const customDimsStr = customDimensions ? JSON.stringify(customDimensions) : null;

        // Match on (cart, product, variant, custom_signature) — NULL compared with <=> (null-safe equal)
        const [existing] = await db.execute(
            'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id <=> ? AND custom_signature <=> ?',
            [cartId, productId, variantId, customSignature]
        );

        if (existing.length > 0) {
            await db.execute(
                'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                [quantity, existing[0].id]
            );
        } else {
            await db.execute(
                'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, custom_dimensions, custom_label, custom_signature) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [cartId, productId, variantId, quantity, customDimsStr, customLabel, customSignature]
            );
        }
    }

    static async updateQuantity(userId, productId, quantity, variantId = null, customSignature = null) {
        await ensureCartCustomColumns();
        const cartId = await this.getOrCreateCart(userId);
        if (quantity <= 0) {
            return this.removeItem(userId, productId, variantId, customSignature);
        }
        await db.execute(
            'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ? AND variant_id <=> ? AND custom_signature <=> ?',
            [quantity, cartId, productId, variantId, customSignature]
        );
    }

    static async removeItem(userId, productId, variantId = null, customSignature = null) {
        await ensureCartCustomColumns();
        const cartId = await this.getOrCreateCart(userId);
        await db.execute(
            'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id <=> ? AND custom_signature <=> ?',
            [cartId, productId, variantId, customSignature]
        );
    }

    static async clearCart(userId) {
        const cartId = await this.getOrCreateCart(userId);
        await db.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    }
}

module.exports = Cart;
