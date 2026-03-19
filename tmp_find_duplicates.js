const mysql = require('mysql2/promise');

async function findDuplicates() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        const [rows] = await db.query(`
            SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids 
            FROM products 
            WHERE is_featured = 1 
            GROUP BY name 
            HAVING count > 1
        `);
        console.log('Duplicate Featured Products Found:');
        console.log(JSON.stringify(rows, null, 2));

        await db.end();
    } catch (err) {
        console.error('Error finding duplicates:', err);
    } finally {
        process.exit();
    }
}

findDuplicates();
