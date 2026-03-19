const mysql = require('mysql2/promise');

async function performCleanup() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        // 1. Identify all duplicate featured groups
        const [rows] = await db.query(`
            SELECT name, GROUP_CONCAT(id ORDER BY id DESC) as ids
            FROM products 
            WHERE is_featured = 1 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);

        if (rows.length === 0) {
            console.log('No duplicates found in featured products.');
            await db.end();
            process.exit();
        }

        const idsToUnfeature = [];
        rows.forEach(row => {
            const parts = row.ids.split(',');
            // The first ID in the list is the highest/most recent (because of ORDER BY id DESC)
            // We keep that one, and un-feature the rest.
            const redundant = parts.slice(1);
            idsToUnfeature.push(...redundant);
        });

        console.log(`Working... Un-featuring ${idsToUnfeature.length} redundant products.`);

        // 2. Perform the update in chunks (to be safe with large lists)
        const CHUNK_SIZE = 500;
        for (let i = 0; i < idsToUnfeature.length; i += CHUNK_SIZE) {
            const chunk = idsToUnfeature.slice(i, i + CHUNK_SIZE);
            const placeholders = chunk.map(() => '?').join(',');
            await db.query(`UPDATE products SET is_featured = 0 WHERE id IN (${placeholders})`, chunk);
            console.log(`Processed chunk: ${i + chunk.length} / ${idsToUnfeature.length}`);
        }

        console.log('Successfully cleaned up featured products!');

        await db.end();
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        process.exit();
    }
}

performCleanup();
