const mysql = require('mysql2/promise');
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mariot_b2b'
};

async function exportCategories() {
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.query('SELECT name FROM categories');
        const names = rows.map(r => r.name);
        console.log(JSON.stringify(names));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

exportCategories();
