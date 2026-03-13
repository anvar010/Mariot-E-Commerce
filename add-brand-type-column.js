const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting brand_type migration...');

        // Add brand_type column if it doesn't exist
        const [columns] = await db.query('SHOW COLUMNS FROM brands LIKE "brand_type"');
        if (columns.length === 0) {
            await db.query('ALTER TABLE brands ADD COLUMN brand_type VARCHAR(255) DEFAULT "All"');
            console.log('Added brand_type column to brands table.');
        } else {
            console.log('brand_type column already exists.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
