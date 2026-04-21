const db = require('../config/db');

class Category {
    static async findAll() {
        // Using GROUP_CONCAT for compatibility with MySQL 5.7+
        // and including brand_names column for direct DB visibility
        const [rows] = await db.execute(`
            SELECT c.*, 
                   (SELECT GROUP_CONCAT(brand_id) FROM category_brands cb WHERE cb.category_id = c.id) as brand_ids_str
            FROM categories c
            ORDER BY c.name ASC
        `);

        return rows.map(row => ({
            ...row,
            brand_ids: row.brand_ids_str ? row.brand_ids_str.split(',').map(Number) : []
        }));
    }

    static async findBySlug(slug) {
        const [rows] = await db.execute(`
            SELECT c.*, 
                   (SELECT GROUP_CONCAT(brand_id) FROM category_brands cb WHERE cb.category_id = c.id) as brand_ids_str
            FROM categories c WHERE c.slug = ?
        `, [slug]);

        if (!rows[0]) return null;

        return {
            ...rows[0],
            brand_ids: rows[0].brand_ids_str ? rows[0].brand_ids_str.split(',').map(Number) : []
        };
    }

    static async create({ name, name_ar = null, slug, image_url = null, description = null, description_ar = null, is_active = 1, parent_id = null, type = 'main_category', brands = [] }) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Fetch brand names to sync brand_names column
            let brandNames = [];
            if (brands && brands.length > 0) {
                const [rows] = await conn.query('SELECT name FROM brands WHERE id IN (?)', [brands]);
                brandNames = rows.map(r => r.name);
            }
            const brandNamesStr = brandNames.join(', ');

            const [result] = await conn.execute(
                'INSERT INTO categories (name, name_ar, slug, image_url, description, description_ar, is_active, parent_id, type, brand_names) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, name_ar, slug, image_url, description, description_ar, is_active, parent_id, type, brandNamesStr]
            );
            const categoryId = result.insertId;

            if (brands && Array.isArray(brands) && brands.length > 0) {
                for (const brandId of brands) {
                    await conn.execute('INSERT INTO category_brands (category_id, brand_id) VALUES (?, ?)', [categoryId, brandId]);
                }
            }

            await conn.commit();
            return categoryId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async update(id, data) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const cleanData = { ...data };
            // Specifically manage brands and brand_names manually
            delete cleanData.brands;
            delete cleanData.brand_ids;
            delete cleanData.brand_ids_str;
            delete cleanData.brand_names;

            // Handle brand association update and brand_names sync
            if (data.brands !== undefined && Array.isArray(data.brands)) {
                // Delete existing ones
                await conn.execute('DELETE FROM category_brands WHERE category_id = ?', [id]);

                let brandNames = [];
                if (data.brands.length > 0) {
                    for (const brandId of data.brands) {
                        await conn.execute('INSERT INTO category_brands (category_id, brand_id) VALUES (?, ?)', [id, brandId]);
                    }
                    // Fetch latest names
                    const [rows] = await conn.query('SELECT name FROM brands WHERE id IN (?)', [data.brands]);
                    brandNames = rows.map(r => r.name);
                }
                cleanData.brand_names = brandNames.join(', ');
            }

            if (Object.keys(cleanData).length > 0) {
                const fields = Object.keys(cleanData).map(key => `${key} = ?`).join(', ');
                const values = [...Object.values(cleanData), id];
                await conn.execute(`UPDATE categories SET ${fields} WHERE id = ?`, values);
            }

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    static async delete(id) {
        await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    }
}

module.exports = Category;
