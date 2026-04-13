const mysql = require('mysql2/promise');
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mariot_b2b'
};

async function listCategories() {
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.query('SELECT id, name FROM categories');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

listCategories();
