require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDb() {
  const connection = await mysql.createConnection({
    host: 'mysql-aceb4f7-anvarshaknavas123-2aa6.f.aivencloud.com',
    port: 15790,
    user: 'avnadmin',
    password: process.env.DB_PASS,
    database: 'defaultdb',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Adding reset_password_token and reset_password_expires columns...');
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN reset_password_token VARCHAR(255) NULL AFTER password,
      ADD COLUMN reset_password_expires DATETIME NULL AFTER reset_password_token;
    `);
    console.log('Successfully updated the users table.');
  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Error updating table:', error);
    }
  } finally {
    await connection.end();
  }
}

fixDb();
