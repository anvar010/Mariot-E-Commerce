const db = require('../config/db');

class Address {
    static async getByUser(userId) {
        // Explicitly ordered. Without ORDER BY, MySQL returns these rows in whatever order
        // suits it, and that order changes between calls -- so checkout, which falls back to
        // the first row when no address is flagged default, would pre-select a different
        // address on different visits. Default first, then newest, which is also the order a
        // shopper expects to see them listed in.
        const [rows] = await db.execute(
            'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC, id DESC',
            [userId]
        );
        return rows;
    }

    static async create(userId, data) {
        const address_type = ['home', 'work', 'other'].includes(data.address_type) ? data.address_type : 'other';

        if (address_type === 'home' || address_type === 'work') {
            const [existing] = await db.execute(
                'SELECT id FROM addresses WHERE user_id = ? AND address_type = ?',
                [userId, address_type]
            );
            if (existing.length) {
                const err = new Error(`You can only save one ${address_type} address.`);
                err.statusCode = 400;
                throw err;
            }
        }

        if (data.is_default) {
            await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        }

        const { first_name, last_name, company_name, email, address_line1, address_line2, city, state, zip_code, country, phone, is_default } = data;
        const address_label = address_type === 'other' ? (data.address_label || null) : null;
        const [result] = await db.execute(
            `INSERT INTO addresses (user_id, address_type, address_label, first_name, last_name, company_name, email, address_line1, address_line2, city, state, zip_code, country, phone, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, address_type, address_label, first_name || null, last_name || null, company_name || null, email || null, address_line1, address_line2 || null, city, state || null, zip_code, country, phone, is_default]
        );
        return result.insertId;
    }

    /**
     * Make one address the default, without touching anything else about it.
     *
     * Separate from update() because that expects a whole address body: setting a default
     * from a list -- where only the id is known -- would otherwise mean sending every field
     * back, and any field missed would be overwritten with null.
     *
     * Ownership is enforced in the second statement's WHERE, and the clear-then-set order
     * means a failed id leaves the user with no default rather than two.
     */
    static async setDefault(userId, addressId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
            const [res] = await connection.execute(
                'UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?',
                [addressId, userId]
            );
            if (res.affectedRows === 0) {
                // Not theirs, or gone. Roll back rather than leave them with none.
                await connection.rollback();
                return false;
            }
            await connection.commit();
            return true;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    static async delete(userId, addressId) {
        await db.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
    }

    static async update(userId, addressId, data) {
        const address_type = ['home', 'work', 'other'].includes(data.address_type) ? data.address_type : 'other';

        if (address_type === 'home' || address_type === 'work') {
            const [existing] = await db.execute(
                'SELECT id FROM addresses WHERE user_id = ? AND address_type = ? AND id != ?',
                [userId, address_type, addressId]
            );
            if (existing.length) {
                const err = new Error(`You can only save one ${address_type} address.`);
                err.statusCode = 400;
                throw err;
            }
        }

        if (data.is_default) {
            await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        }

        const { first_name, last_name, company_name, email, address_line1, address_line2, city, state, zip_code, country, phone, is_default } = data;
        const address_label = address_type === 'other' ? (data.address_label || null) : null;
        await db.execute(
            `UPDATE addresses
             SET address_type = ?, address_label = ?, first_name = ?, last_name = ?, company_name = ?, email = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, zip_code = ?, country = ?, phone = ?, is_default = ?
             WHERE id = ? AND user_id = ?`,
            [address_type, address_label, first_name || null, last_name || null, company_name || null, email || null, address_line1, address_line2 || null, city, state || null, zip_code, country, phone, is_default, addressId, userId]
        );
    }
}

module.exports = Address;
