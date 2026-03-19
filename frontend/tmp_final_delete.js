const mysql = require('mysql2/promise');

async function executeDeletion() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        // 1. Identify all redundant IDs (keeping the newest one per name)
        const [rows] = await db.query(`
            SELECT name, GROUP_CONCAT(id ORDER BY id DESC) as ids
            FROM products 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);

        if (rows.length === 0) {
            console.log('No duplicates found.');
            await db.end();
            return;
        }

        const idsToDelete = [];
        rows.forEach(row => {
            const parts = row.ids.split(',');
            // Keep the first (newest), collect the rest
            idsToDelete.push(...parts.slice(1));
        });

        console.log(`Total redundant IDs to delete: ${idsToDelete.length}`);

        // 2. Perform deletion in chunks
        const CHUNK_SIZE = 500;
        for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
            const chunk = idsToDelete.slice(i, i + CHUNK_SIZE);
            const placeholders = chunk.map(() => '?').join(',');

            // Delete product images first (if not cascaded)
            await db.query(`DELETE FROM product_images WHERE product_id IN (${placeholders})`, chunk);

            // Delete products
            await db.query(`DELETE FROM products WHERE id IN (${placeholders})`, chunk);

            console.log(`Successfully deleted chunk: ${i + chunk.length} / ${idsToDelete.length}`);
        }

        console.log('Final Deletion Completed Successfully!');

        await db.end();
    } catch (err) {
        console.error('Error during deletion:', err);
    } finally {
        process.exit();
    }
}

executeDeletion();
