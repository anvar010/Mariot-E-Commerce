const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require(path.join(__dirname, 'config', 'db'));

async function migrate() {
    try {
        console.log('Migrating brands table...');
        await db.execute(`
            ALTER TABLE brands 
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
            ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1
        `);

        console.log('Migrating categories table...');
        await db.execute(`
            ALTER TABLE categories 
            ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1
        `);

        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
