const mysql = require('mysql2/promise');

const MERGE_MAP = [
    { keep: 4, remove: 213 },
    { keep: 15, remove: 197 },
    { keep: 21, remove: 210 },
    { keep: 31, remove: 215 },
    { keep: 34, remove: 206 },
    { keep: 41, remove: 205 },
    { keep: 53, remove: 219 }
];

async function mergeBrands() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        for (const action of MERGE_MAP) {
            console.log(`Merging Brand ID ${action.remove} into ${action.keep}...`);

            // 1. Update products table
            const [updateRes] = await db.query('UPDATE products SET brand_id = ? WHERE brand_id = ?', [action.keep, action.remove]);
            console.log(`  - Updated ${updateRes.affectedRows} products.`);

            // 2. Delete the redundant brand
            await db.query('DELETE FROM brands WHERE id = ?', [action.remove]);
            console.log(`  - Deleted Brand ID ${action.remove}.`);
        }

        console.log('Final Brand Cleanup Completed Successfully!');

        await db.end();
    } catch (err) {
        console.error('Error during brand merge:', err);
    } finally {
        process.exit();
    }
}

mergeBrands();
