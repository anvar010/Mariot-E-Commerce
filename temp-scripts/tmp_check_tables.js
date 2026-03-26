const mysql = require('mysql2/promise');

async function checkTables() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        const [tables] = await db.query('SHOW TABLES');
        console.log(JSON.stringify(tables, null, 2));

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkTables();
