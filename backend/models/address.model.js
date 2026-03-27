const db = require('../config/db');

class Address {
    static async getByUser(userId) {
        const [rows] = await db.execute('SELECT * FROM addresses WHERE user_id = ?', [userId]);
        return rows;
    }

    static async create(userId, data) {
        if (data.is_default) {
            await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        }

        const { first_name, last_name, company_name, email, address_line1, address_line2, city, state, zip_code, country, phone, is_default } = data;
        const [result] = await db.execute(
            `INSERT INTO addresses (user_id, first_name, last_name, company_name, email, address_line1, address_line2, city, state, zip_code, country, phone, is_default) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, first_name || null, last_name || null, company_name || null, email || null, address_line1, address_line2 || null, city, state || null, zip_code, country, phone, is_default]
        );
        return result.insertId;
    }

    static async delete(userId, addressId) {
        await db.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
    }

    static async update(userId, addressId, data) {
        if (data.is_default) {
            await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        }

        const { first_name, last_name, company_name, email, address_line1, address_line2, city, state, zip_code, country, phone, is_default } = data;
        await db.execute(
            `UPDATE addresses 
             SET first_name = ?, last_name = ?, company_name = ?, email = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, zip_code = ?, country = ?, phone = ?, is_default = ? 
             WHERE id = ? AND user_id = ?`,
            [first_name || null, last_name || null, company_name || null, email || null, address_line1, address_line2 || null, city, state || null, zip_code, country, phone, is_default, addressId, userId]
        );
    }
}

module.exports = Address;
