const mysql = require('mysql2/promise');

async function stats() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM products');
        const [[{ featuredTotal }]] = await db.query('SELECT COUNT(*) as featuredTotal FROM products WHERE is_featured = 1');
        const [[{ uniqueFeaturedNames }]] = await db.query('SELECT COUNT(DISTINCT name) as uniqueFeaturedNames FROM products WHERE is_featured = 1');

        console.log(`Total Products in DB: ${total}`);
        console.log(`Current Featured (Total Rows): ${featuredTotal}`);
        console.log(`Featured (Unique Names): ${uniqueFeaturedNames}`);
        console.log(`Dups to remove: ${featuredTotal - uniqueFeaturedNames}`);

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

stats();
