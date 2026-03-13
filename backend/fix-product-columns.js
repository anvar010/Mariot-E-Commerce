require('dotenv').config();
const db = require('./config/db');

async function checkColumns() {
    try {
        console.log('Checking products table structure...');
        const [columns] = await db.execute('DESCRIBE products');
        console.log('Current columns:', columns.map(c => c.Field));

        const hasDiscount = columns.some(c => c.Field === 'discount_percentage');
        const hasOfferPrice = columns.some(c => c.Field === 'offer_price');

        if (!hasDiscount || !hasOfferPrice) {
            console.log('Fields missing. Adding them now...');
            // Need to use ALTER TABLE
            if (!hasDiscount) {
                await db.execute('ALTER TABLE products ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER price');
                console.log('Added discount_percentage');
            }
            if (!hasOfferPrice) {
                await db.execute('ALTER TABLE products ADD COLUMN offer_price DECIMAL(10,2) DEFAULT NULL AFTER discount_percentage');
                console.log('Added offer_price');
            }
            console.log('✅ Fields added successfully!');
        } else {
            console.log('✅ All fields already exist.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkColumns();
