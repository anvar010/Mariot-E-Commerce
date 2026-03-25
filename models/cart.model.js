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
            SELECT ci.product_id, ci.quantity, p.name, p.price, p.offer_price, p.slug, p.stock_quantity, b.name as brand_name,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            LEFT JOIN brands b ON b.id = p.brand_id
            WHERE ci.cart_id = ?
        `, [cartId]);
        return items;
    }

    static async addItem(userId, productId, quantity) {
        const cartId = await this.getOrCreateCart(userId);

        // Check if item already exists
        const [existing] = await db.execute(
            'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cartId, productId]
        );

        if (existing.length > 0) {
            await db.execute(
                'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                [quantity, existing[0].id]
            );
        } else {
            await db.execute(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                [cartId, productId, quantity]
            );
        }
    }

    static async updateQuantity(userId, productId, quantity) {
        const cartId = await this.getOrCreateCart(userId);
        if (quantity <= 0) {
            return this.removeItem(userId, productId);
        }
        await db.execute('UPDATE cart_items SET quantity = ? WHERE product_id = ? AND cart_id = ?', [quantity, productId, cartId]);
    }

    static async removeItem(userId, productId) {
        const cartId = await this.getOrCreateCart(userId);
        await db.execute('DELETE FROM cart_items WHERE product_id = ? AND cart_id = ?', [productId, cartId]);
    }

    static async clearCart(userId) {
        const cartId = await this.getOrCreateCart(userId);
        await db.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    }
}

module.exports = Cart;
