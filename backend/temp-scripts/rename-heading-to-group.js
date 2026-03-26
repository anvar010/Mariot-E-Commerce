require('dotenv').config();
const db = require('./config/db');

async function migrate() {
    try {
        console.log('Renaming "heading" column to "product_group" in products table...');

        // Check if heading column exists
        const [headingCols] = await db.execute('SHOW COLUMNS FROM products LIKE "heading"');
        if (headingCols.length > 0) {
            // Also check if product_group already exists to avoid errors on re-run
            const [groupCols] = await db.execute('SHOW COLUMNS FROM products LIKE "product_group"');
            if (groupCols.length === 0) {
                await db.execute("ALTER TABLE products CHANGE COLUMN heading product_group VARCHAR(255) DEFAULT NULL");
                console.log('✅ Column "heading" renamed to "product_group" successfully.');
            } else {
                console.log('✅ Column "product_group" already exists, likely renamed already.');
            }
        } else {
            const [groupCols] = await db.execute('SHOW COLUMNS FROM products LIKE "product_group"');
            if (groupCols.length === 0) {
                // Neither heading nor product_group exists? Add it
                await db.execute("ALTER TABLE products ADD COLUMN product_group VARCHAR(255) DEFAULT NULL AFTER category_id");
                console.log('✅ Column "product_group" added successfully.');
            } else {
                console.log('✅ Column "product_group" already exists.');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
}

migrate();
