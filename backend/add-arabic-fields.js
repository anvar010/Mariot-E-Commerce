const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require(path.join(__dirname, 'config', 'db'));

async function addArabicFields() {
    try {
        console.log('Adding Arabic translation fields to products table...');
        const [columns] = await db.execute('DESCRIBE products');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('name_ar')) {
            await db.execute('ALTER TABLE products ADD COLUMN name_ar VARCHAR(255) AFTER name');
            console.log('✅ Added name_ar');
        }
        if (!columnNames.includes('description_ar')) {
            await db.execute('ALTER TABLE products ADD COLUMN description_ar TEXT AFTER description');
            console.log('✅ Added description_ar');
        }

        console.log('✅ All Arabic fields updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating database:', error);
        process.exit(1);
    }
}

addArabicFields();
