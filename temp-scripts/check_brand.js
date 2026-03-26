require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [rows] = await conn.execute('SELECT id, name, image_url FROM brands WHERE name LIKE ?', ['%Rational%']);
        console.log(JSON.stringify(rows, null, 2));

        await conn.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
