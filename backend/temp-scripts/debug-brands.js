const db = require('./config/db');
const fs = require('fs');

async function inspect() {
    try {
        const [rows] = await db.query('SELECT name, slug, brand_type, image_url FROM brands ORDER BY name');
        fs.writeFileSync('all_brands_debug.json', JSON.stringify(rows, null, 2));
        console.log(`Saved ${rows.length} brands to all_brands_debug.json`);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspect();
