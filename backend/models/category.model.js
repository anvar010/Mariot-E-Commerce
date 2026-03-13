const db = require('../config/db');

class Category {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM categories ORDER BY name ASC');
        return rows;
    }

    static async findBySlug(slug) {
        const [rows] = await db.execute('SELECT * FROM categories WHERE slug = ?', [slug]);
        return rows[0];
    }

    static async create({ name, slug, image_url = null, description = null, is_active = 1 }) {
        const [result] = await db.execute(
            'INSERT INTO categories (name, slug, image_url, description, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, slug, image_url, description, is_active]
        );
        return result.insertId;
    }

    static async update(id, data) {
        const cleanData = {};
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                cleanData[key] = data[key];
            }
        });

        if (Object.keys(cleanData).length === 0) return;

        const fields = Object.keys(cleanData).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(cleanData), id];
        await db.execute(`UPDATE categories SET ${fields} WHERE id = ?`, values);
    }

    static async delete(id) {
        await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    }
}

module.exports = Category;
