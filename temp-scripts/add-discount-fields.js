require('dotenv').config();
const db = require('./config/db');

async function addDiscountFields() {
    try {
        console.log('Adding discount fields to products table...');

        await db.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER price,
            ADD COLUMN IF NOT EXISTS offer_price DECIMAL(10,2) DEFAULT NULL AFTER discount_percentage
        `);

        console.log('✅ Discount fields added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addDiscountFields();
