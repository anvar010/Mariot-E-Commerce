const mysql = require('mysql2/promise');

async function listBrands() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        const [rows] = await db.query('SELECT id, name, image_url, description FROM brands');
        console.log(JSON.stringify(rows, null, 2));

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

listBrands();
