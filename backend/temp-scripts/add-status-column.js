require('dotenv').config();
const db = require('./config/db');

async function migrate() {
    try {
        console.log('Adding status column to products table...');

        // Check if column exists
        const [columns] = await db.execute('SHOW COLUMNS FROM products LIKE "status"');

        if (columns.length === 0) {
            await db.execute("ALTER TABLE products ADD COLUMN status ENUM('active', 'draft') DEFAULT 'active' AFTER is_active");
            console.log('✅ Column "status" added successfully.');
        } else {
            console.log('✅ Column "status" already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
}

migrate();
