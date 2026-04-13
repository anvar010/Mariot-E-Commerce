
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mariot_db'
};

async function migrate() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database.');

    try {
        // 1. Fetch main categories for mapping
        const [categories] = await connection.execute('SELECT id, name FROM categories WHERE type = "main_category"');
        const catMap = {};
        categories.forEach(c => {
            catMap[c.name.toLowerCase()] = c.id;
        });

        // 2. Define fuzzy mappings
        const fuzzyMappings = [
            { pattern: 'ICE', target: 'Ice Equipment' },
            { pattern: 'REFRIGERATION', target: 'Refrigeration' },
            { pattern: 'COOKING', target: 'Cooking Equipment' },
            { pattern: 'KITCHEN', target: 'Cooking Equipment' },
            { pattern: 'COFFEE', target: 'Coffee Makers' },
            { pattern: 'BEVERAGE', target: 'Beverage Equipment' },
            { pattern: 'OVEN', target: 'Commercial Ovens' },
            { pattern: 'FOOD PREP', target: 'Food Preparation' },
            { pattern: 'PREPARATION', target: 'Food Preparation' }
        ];

        // 3. Fetch products missing category_id
        const [products] = await connection.execute('SELECT id, name, product_group, sub_category FROM products WHERE category_id IS NULL OR category_id = 0');
        console.log(`Found ${products.length} products to map.`);

        let updatedCount = 0;
        for (const p of products) {
            let targetId = null;
            const groupText = (p.product_group || '').toUpperCase();
            const nameText = (p.name || '').toUpperCase();
            const subText = (p.sub_category || '').toUpperCase();

            for (const map of fuzzyMappings) {
                if (groupText.includes(map.pattern) || nameText.includes(map.pattern) || subText.includes(map.pattern)) {
                    targetId = catMap[map.target.toLowerCase()];
                    if (targetId) break;
                }
            }

            if (targetId) {
                // Also try to find a sub-category if possible
                // For simplicity, we just set the main category first
                await connection.execute('UPDATE products SET category_id = ? WHERE id = ?', [targetId, p.id]);
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} products.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
