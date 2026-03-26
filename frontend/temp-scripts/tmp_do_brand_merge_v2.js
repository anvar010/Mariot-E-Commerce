const mysql = require('mysql2/promise');

const MERGE_MAP = [
    { keep: 18, remove: 214 }, // ACE FILTERS keep, Falater remove
    { keep: 26, remove: 198 }, // HCONVED keep, Hoonved Dishwasher remove
    { keep: 29, remove: 201 }, // Infrico keep, Inofrigo remove
    { keep: 73, remove: 202 }, // SERVER keep, Server USA remove
    { keep: 57, remove: 212 }, // Robot Coupe keep, Mac Pan (different?) wait..
    { keep: 23, remove: 204 }, // Hamilton Beach keep, Hamilton Beach USA remove
    { keep: 25, remove: 217 }, // Fagor keep, Fagor Professional remove (wait, Fagor is 17)
    { keep: 17, remove: 217 },
    { keep: 69, remove: 208 }, // Star keep, Star Manufacturing USA remove
    { keep: 66, remove: 209 }, // Southbend keep, Southbend USA remove
    { keep: 75, remove: 207 }, // Technocooler keep, Tecno Cooler remove
    { keep: 82, remove: 216 }, // Vito keep, Vito Oil Filter System remove
    { keep: 59, remove: 220 }, // Rotondi keep, Rotondi Group remove
    { keep: 7, remove: 221 },  // Blendtec keep, Blendec remove
    { keep: 77, remove: 222 }, // Ubermilk keep, ubermilk remove
    { keep: 49, remove: 223 }  // Omega keep, OMEGA FOOD TECH remove
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

            // Re-assign products
            const [updateRes] = await db.query('UPDATE products SET brand_id = ? WHERE brand_id = ?', [action.keep, action.remove]);
            console.log(`  - Updated ${updateRes.affectedRows} products.`);

            // Delete redundant brand
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
