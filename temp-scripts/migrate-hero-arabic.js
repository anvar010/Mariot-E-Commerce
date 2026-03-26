const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require(path.join(__dirname, 'config', 'db'));

async function migrate() {
    try {
        console.log('Adding Arabic fields to hero_slides table...');

        await db.query(`ALTER TABLE hero_slides ADD COLUMN tagline_ar VARCHAR(255) AFTER tagline`);
        await db.query(`ALTER TABLE hero_slides ADD COLUMN title_ar VARCHAR(255) AFTER title`);
        await db.query(`ALTER TABLE hero_slides ADD COLUMN description_ar TEXT AFTER description`);
        await db.query(`ALTER TABLE hero_slides ADD COLUMN btnText_ar VARCHAR(255) AFTER btnText`);

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        // If columns already exist, it will fail, which is fine if we just want to ensure they are there
        process.exit(1);
    }
}

migrate();
