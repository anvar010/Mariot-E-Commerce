/**
 * Migration: Add reset_password_token and reset_password_expires columns to users table
 * Run this script once: node add-reset-token-columns.js
 */
const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Adding reset password columns to users table...');

        await db.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS reset_password_expires DATETIME DEFAULT NULL
        `);

        console.log('✅ Columns added successfully!');
        process.exit(0);
    } catch (error) {
        // If columns already exist, MySQL will throw error — handle gracefully
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  Columns already exist, skipping.');
            process.exit(0);
        }
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
