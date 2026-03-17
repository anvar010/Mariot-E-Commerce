const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    static async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT u.*, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ?',
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT u.id, u.name, u.email, u.phone_number, u.company_name, u.vat_number, u.reward_points, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
            [id]
        );
        return rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.name) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.phone_number !== undefined) {
            fields.push('phone_number = ?');
            values.push(data.phone_number);
        }
        if (data.company_name !== undefined) {
            fields.push('company_name = ?');
            values.push(data.company_name);
        }
        if (data.vat_number !== undefined) {
            fields.push('vat_number = ?');
            values.push(data.vat_number);
        }
        if (data.password) {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            fields.push('password = ?');
            values.push(hashedPassword);
        }

        if (fields.length === 0) return false;

        values.push(id);
        const [result] = await db.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    static async create({ name, email, password }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role_id, reward_points) VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = "user"), 1000)',
            [name, email, hashedPassword]
        );
        return result.insertId;
    }

    static async updatePoints(userId, points, type) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const updateQuery = type === 'earned'
                ? 'UPDATE users SET reward_points = reward_points + ? WHERE id = ?'
                : 'UPDATE users SET reward_points = reward_points - ? WHERE id = ?';

            await connection.execute(updateQuery, [points, userId]);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    /**
     * Store a hashed reset token and expiry for a user
     */
    static async setResetToken(userId, hashedToken, expires) {
        await db.execute(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [hashedToken, expires, userId]
        );
    }

    /**
     * Find user by hashed reset token that hasn't expired
     */
    static async findByResetToken(hashedToken) {
        const [rows] = await db.execute(
            'SELECT u.id, u.name, u.email, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.reset_password_token = ? AND u.reset_password_expires > NOW()',
            [hashedToken]
        );
        return rows[0];
    }

    /**
     * Clear the reset token fields after password has been reset
     */
    static async clearResetToken(userId) {
        await db.execute(
            'UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [userId]
        );
    }
}

module.exports = User;
