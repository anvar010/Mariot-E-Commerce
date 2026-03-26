const mysql = require('mysql2/promise');

async function checkRelations() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        // 1. All duplicates groups
        const [rows] = await db.query(`
            SELECT name, GROUP_CONCAT(id ORDER BY id DESC) as ids
            FROM products 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);

        if (rows.length === 0) {
            console.log('No duplicates found in whole DB.');
            await db.end();
            process.exit();
        }

        const idsToDelete = [];
        rows.forEach(row => {
            const parts = row.ids.split(',');
            // First ID is latest, keep it. Rest to delete.
            idsToDelete.push(...parts.slice(1));
        });

        console.log(`Summary: Total IDs to DELETE: ${idsToDelete.length}`);

        // 2. Check risk tables
        const tables = ['order_items', 'cart_items', 'wishlists', 'reviews', 'product_images'];
        for (let table of tables) {
            try {
                const chunk = idsToDelete.slice(0, 500); // Check sample chunk
                const placeholders = chunk.map(() => '?').join(',');
                const [countRows] = await db.query(`SELECT COUNT(*) as cnt FROM ${table} WHERE product_id IN (${placeholders})`, chunk);
                console.log(`Relation check in [${table}]: ${countRows[0].cnt} references found in first 500 IDs.`);
            } catch (err) {
                console.warn(`Table [${table}] check skipped: ${err.message}`);
            }
        }

        // To delete safely:
        // We delete product_images first if it's not cascaded.
        // We delete from DB.

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkRelations();
