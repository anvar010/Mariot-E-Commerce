const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Adding new fields to users table...');

        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
            ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50)
        `);

        console.log('Schema updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
