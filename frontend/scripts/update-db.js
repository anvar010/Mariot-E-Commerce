const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mariot_b2b',
    });

    try {
        await connection.query("ALTER TABLE orders ADD COLUMN points_used INT DEFAULT 0;");
        console.log("points_used added");
    } catch (e) { console.log(e.message) }

    try {
        await connection.query("ALTER TABLE orders ADD COLUMN points_discount DECIMAL(10,2) DEFAULT 0.00;");
        console.log("points_discount added");
    } catch (e) { console.log(e.message) }

    try {
        await connection.query("ALTER TABLE orders ADD COLUMN coupon_id INT DEFAULT NULL;");
        console.log("coupon_id added");
    } catch (e) { console.log(e.message) }

    await connection.end();
}
run();
