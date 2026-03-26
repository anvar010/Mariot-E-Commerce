require('dotenv').config();
const db = require('./config/db');

async function migrate() {
    try {
        console.log('Adding heading and sub_category columns to products table...');

        // Check if heading column exists
        const [headingCols] = await db.execute('SHOW COLUMNS FROM products LIKE "heading"');
        if (headingCols.length === 0) {
            await db.execute("ALTER TABLE products ADD COLUMN heading VARCHAR(255) DEFAULT NULL AFTER category_id");
            console.log('✅ Column "heading" added successfully.');
        } else {
            console.log('✅ Column "heading" already exists.');
        }

        // Check if sub_category column exists
        const [subCatCols] = await db.execute('SHOW COLUMNS FROM products LIKE "sub_category"');
        if (subCatCols.length === 0) {
            await db.execute("ALTER TABLE products ADD COLUMN sub_category VARCHAR(255) DEFAULT NULL AFTER heading");
            console.log('✅ Column "sub_category" added successfully.');
        } else {
            console.log('✅ Column "sub_category" already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
}

migrate();
