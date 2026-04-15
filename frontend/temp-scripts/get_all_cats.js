const mysql = require('mysql2/promise');
const fs = require('fs');
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mariot_b2b'
};

async function getFullList() {
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.query('SELECT name FROM categories');
        fs.writeFileSync('all_categories.json', JSON.stringify(rows));
        console.log(`Saved ${rows.length} categories to all_categories.json`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

getFullList();
