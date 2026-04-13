const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    const [rows] = await connection.execute('SELECT COUNT(*) as count, type FROM categories GROUP BY type');
    console.log(rows);
    await connection.end();
}
check();
