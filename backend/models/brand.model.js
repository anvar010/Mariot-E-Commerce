const db = require('../config/db');

class Brand {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM brands ORDER BY name ASC');
        return rows;
    }

    static async findByCategoryId(categoryId) {
        let query = `
            SELECT b.*, COUNT(p.id) as product_count
            FROM brands b
            JOIN products p ON b.id = p.brand_id
            JOIN categories c ON p.category_id = c.id
            WHERE (c.slug = ? OR c.id = ?) AND p.status = 'active'
            GROUP BY b.id
            ORDER BY b.name ASC
        `;
        const [rows] = await db.execute(query, [categoryId, categoryId]);
        return rows;
    }

    static async findBySlug(slug) {
        const [rows] = await db.execute('SELECT * FROM brands WHERE slug = ?', [slug]);
        return rows[0];
    }

    static async create({ name, name_ar = null, slug, image_url = null, description = null, description_ar = null, website_url = null, is_active = 1, brand_type = 'All' }) {
        const [result] = await db.execute(
            'INSERT INTO brands (name, name_ar, slug, image_url, description, description_ar, website_url, is_active, brand_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, name_ar, slug, image_url, description, description_ar, website_url, is_active, brand_type]
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
        await db.execute(`UPDATE brands SET ${fields} WHERE id = ?`, values);
    }

    static async delete(id) {
        await db.execute('DELETE FROM brands WHERE id = ?', [id]);
    }

    static async bulkDelete(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(`DELETE FROM brands WHERE id IN (${placeholders})`, ids);
    }
}

module.exports = Brand;
