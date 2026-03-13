require('dotenv').config({ path: 'd:/MARIOT/backend/.env' });
const mysql = require('mysql2/promise');

(async () => {
    let conn;
    try {
        console.log("Connecting to DB...");
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log("Adding specifications column...");
        await conn.query("ALTER TABLE products ADD COLUMN specifications LONGTEXT DEFAULT NULL;");
        console.log("Column added safely.");

    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Column already exists.");
        } else {
            console.error(err);
        }
    } finally {
        if (conn) await conn.end();
    }
})();
