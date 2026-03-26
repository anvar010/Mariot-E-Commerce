require('dotenv').config();
const db = require('./config/db');

async function migrate() {
    try {
        console.log('Checking database tables...');
        const [tables] = await db.execute('SHOW TABLES');
        const tableList = tables.map(t => Object.values(t)[0]);
        console.log('Existing tables:', tableList);

        if (!tableList.includes('coupons')) {
            console.log('Table "coupons" is missing. Creating it...');
            await db.execute(`
                CREATE TABLE IF NOT EXISTS coupons (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
                    discount_value DECIMAL(10, 2) NOT NULL,
                    expiry_date DATE,
                    usage_limit INT DEFAULT 0,
                    used_count INT DEFAULT 0,
                    min_order_amount DECIMAL(10, 2) DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Table "coupons" created successfully!');
        } else {
            console.log('✅ Table "coupons" already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
}

migrate();
