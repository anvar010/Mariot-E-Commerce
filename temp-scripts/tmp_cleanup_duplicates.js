const mysql = require('mysql2/promise');

async function cleanupDuplicates() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        // 1. Find all duplicate featured names
        const [rows] = await db.query(`
            SELECT name, GROUP_CONCAT(id ORDER BY id DESC) as ids
            FROM products 
            WHERE is_featured = 1 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);

        if (rows.length === 0) {
            console.log('No duplicates found.');
        } else {
            const idsToDelete = [];
            rows.forEach(row => {
                const parts = row.ids.split(',');
                // Keep the first one (highest ID), delete the rest
                const toDel = parts.slice(1);
                idsToDelete.push(...toDel);
            });

            console.log(`Summary: Found ${rows.length} groups of duplicates.`);
            console.log(`Total IDs to remove from featured (or delete): ${idsToDelete.length}`);
            console.log('IDs: ' + idsToDelete.join(', '));

            // To be safe, we just set is_featured = 0 instead of deleting the whole product entry?
            // "Remove duplicated featured products" usually means clean the list.
            // If I delete the row, I might break something.
            // Let's ask or just un-feature them.
        }

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

cleanupDuplicates();
