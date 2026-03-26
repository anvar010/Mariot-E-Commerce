const mysql = require('mysql2/promise');

async function executeDeletion() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        // 1. Identify all redundant IDs
        const [rows] = await db.query(`
            SELECT p1.id FROM products p1
            JOIN (
                SELECT name, MAX(id) as max_id FROM products GROUP BY name
            ) p2 ON p1.name = p2.name AND p1.id < p2.max_id
        `);

        if (rows.length === 0) {
            console.log('No redundant IDs found via join.');
            await db.end();
            return;
        }

        const idsToDelete = rows.map(r => r.id);
        console.log(`Total redundant IDs to delete: ${idsToDelete.length}`);

        // 2. Perform deletion in chunks
        const CHUNK_SIZE = 500;
        for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
            const chunk = idsToDelete.slice(i, i + CHUNK_SIZE);
            const placeholders = chunk.map(() => '?').join(',');

            await db.query(`DELETE FROM product_images WHERE product_id IN (${placeholders})`, chunk);
            await db.query(`DELETE FROM products WHERE id IN (${placeholders})`, chunk);

            console.log(`Successfully deleted chunk: ${i + chunk.length} / ${idsToDelete.length}`);
        }

        console.log('Final Deletion Completed Successfully!');

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

executeDeletion();
