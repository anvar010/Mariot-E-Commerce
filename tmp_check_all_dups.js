const mysql = require('mysql2/promise');

async function checkDupsInWholeDB() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM products');
        const [[{ uniqueNames }]] = await db.query('SELECT COUNT(DISTINCT name) as uniqueNames FROM products');

        console.log(`Total Rows in DB: ${total}`);
        console.log(`Unique Names: ${uniqueNames}`);
        console.log(`Potential Duplicates to DELETE: ${total - uniqueNames}`);

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkDupsInWholeDB();
