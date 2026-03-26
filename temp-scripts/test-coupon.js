require('dotenv').config();
const db = require('./config/db');
const Coupon = require('./models/coupon.model');

async function test() {
    try {
        console.log('Testing Coupon creation...');
        const id = await Coupon.create({
            code: 'TEST' + Date.now(),
            discount_type: 'percentage',
            discount_value: 10,
            expiry_date: '2026-12-31',
            usage_limit: 100,
            min_order_amount: 50,
            is_active: 1
        });
        console.log('✅ Created coupon with ID:', id);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating coupon:', error);
        process.exit(1);
    }
}

test();
