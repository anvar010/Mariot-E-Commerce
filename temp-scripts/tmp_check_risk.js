const mysql = require('mysql2/promise');

async function checkOrderRisk() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        const [rows] = await db.query(`
            SELECT name, GROUP_CONCAT(id ORDER BY id DESC) as ids
            FROM products 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);

        if (rows.length === 0) {
            console.log('No duplicates found.');
            await db.end();
            process.exit();
        }

        const redundantIds = [];
        rows.forEach(row => {
            const parts = row.ids.split(',');
            redundantIds.push(...parts.slice(1));
        });

        // 2. Check if any are in order_items
        const placeholders = redundantIds.slice(0, 1000).map(() => '?').join(','); // Check first 1000
        const [orders] = await db.query(`SELECT DISTINCT product_id FROM order_items WHERE product_id IN (${placeholders})`, redundantIds.slice(0, 1000));

        console.log(`Redundant IDs checked for orders (sample 1000): ${redundantIds.slice(0, 1000).length}`);
        console.log(`Found in orders: ${orders.length}`);

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkOrderRisk();
