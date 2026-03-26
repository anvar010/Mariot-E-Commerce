require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ...(process.env.NODE_ENV === 'production' && {
      ssl: { rejectUnauthorized: false }
    })
  });

  try {
    console.log('Adding status column to users table...');
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active' AFTER role_id
    `);
    console.log('✅ Successfully added status column to users table.');
  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('ℹ️  Column "status" already exists. Skipping.');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await connection.end();
  }
}

migrate();
