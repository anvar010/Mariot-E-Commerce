const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    console.log('Testing connection with:');
    console.log({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME
    });

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log('Successfully connected!');
        await connection.end();
    } catch (err) {
        console.error('Connection failed details:');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Error Stack:', err.stack);
    }
}

test();
