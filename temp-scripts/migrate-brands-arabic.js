const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require(path.join(__dirname, 'config', 'db'));

async function migrateBrands() {
    try {
        console.log('Adding Arabic fields to brands table...');
        const [columns] = await db.execute('DESCRIBE brands');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('name_ar')) {
            await db.execute('ALTER TABLE brands ADD COLUMN name_ar VARCHAR(255) AFTER name');
            console.log('✅ Added name_ar');
        }
        if (!columnNames.includes('description_ar')) {
            await db.execute('ALTER TABLE brands ADD COLUMN description_ar TEXT AFTER description');
            console.log('✅ Added description_ar');
        }

        console.log('✅ Brands Arabic fields migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateBrands();
