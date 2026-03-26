const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function test(host) {
    console.log(`Testing connection to ${host}...`);
    try {
        const start = Date.now();
        const connection = await mysql.createConnection({
            host: host,
            port: 3306,
            user: 'root',
            password: '',
            database: 'mariot_b2b',
            connectTimeout: 5000
        });
        console.log(`✅ Success for ${host} in ${Date.now() - start}ms`);
        await connection.end();
    } catch (err) {
        console.error(`❌ Failed for ${host}: ${err.message}`);
    }
}

async function run() {
    await test('localhost');
    await test('127.0.0.1');
    await test('::1');
}

run();
