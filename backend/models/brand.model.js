const db = require('../config/db');

class Brand {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM brands ORDER BY name ASC');
        return rows;
    }

    static async findByCategoryId(categoryId) {
        const [catRows] = await db.execute(
            'SELECT id FROM categories WHERE slug = ? OR id = ? LIMIT 1',
            [categoryId, categoryId]
        );
        if (catRows.length === 0) return [];

        const rootId = catRows[0].id;
        const [allCatRows] = await db.execute(
            'SELECT id FROM categories WHERE id = ? OR parent_id = ? OR parent_id IN (SELECT id FROM categories WHERE parent_id = ?)',
            [rootId, rootId, rootId]
        );
        const catIds = allCatRows.map(r => r.id);
        const placeholders = catIds.map(() => '?').join(',');

        const query = `
            SELECT b.*, COUNT(p.id) as product_count
            FROM brands b
            JOIN products p ON b.id = p.brand_id
            WHERE (p.category_id IN (${placeholders}) OR p.sub_category_id IN (${placeholders}) OR p.sub_sub_category_id IN (${placeholders}))
              AND p.status = 'active' AND b.is_active = 1
            GROUP BY b.id
            ORDER BY b.name ASC
        `;
        const [rows] = await db.execute(query, [...catIds, ...catIds, ...catIds]);
        return rows;
    }

    static async findBySlug(slug) {
        const [rows] = await db.execute('SELECT * FROM brands WHERE slug = ?', [slug]);
        return rows[0];
    }

    static async create({ name, name_ar = null, slug, image_url = null }) {
        const [result] = await db.execute(
            'INSERT INTO brands (name, name_ar, slug, image_url) VALUES (?, ?, ?, ?)',
            [name, name_ar, slug, image_url]
        );
        return result.insertId;
    }

    static async findByName(name) {
        const [rows] = await db.execute('SELECT * FROM brands WHERE name = ?', [name]);
        return rows[0];
    }

    static async upsert({ name, name_ar = null, slug, image_url = null }) {
        const [result] = await db.execute(
            'INSERT INTO brands (name, name_ar, slug, image_url) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), name_ar = VALUES(name_ar), image_url = VALUES(image_url)',
            [name, name_ar, slug, image_url]
        );
        return result.insertId || result.affectedRows;
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
