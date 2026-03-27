const db = require('./db');

/**
 * Initialize all database tables and perform required migrations
 */
const initDb = async () => {
    try {
        console.log('[DB] Running initialization and migrations...');

        // 1. Contact Submissions Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                country_code VARCHAR(10) DEFAULT '+971',
                phone VARCHAR(50),
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('new', 'read', 'replied', 'closed') DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[DB] contact_submissions table verified');

        // 2. User Status Migration
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'status'");
            if (columns.length === 0) {
                await db.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active' AFTER role_id");
                console.log('[DB] Migration: Added status column to users table');
            }
        } catch (err) {
            console.error('[DB] Error migrating users table:', err.message);
        }

        // 3. Address Table Migrations
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM addresses");
            const columnNames = columns.map(c => c.Field);

            const addressColumns = [
                { name: 'first_name', definition: "VARCHAR(255) AFTER user_id" },
                { name: 'last_name', definition: "VARCHAR(255) AFTER first_name" },
                { name: 'company_name', definition: "VARCHAR(255) AFTER last_name" },
                { name: 'email', definition: "VARCHAR(255) AFTER company_name" }
            ];

            for (const col of addressColumns) {
                if (!columnNames.includes(col.name)) {
                    await db.query(`ALTER TABLE addresses ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`[DB] Migration: Added ${col.name} column to addresses table`);
                }
            }
        } catch (err) {
            console.error('[DB] Error migrating addresses table:', err.message);
        }

        console.log('[DB] Initialization complete');
    } catch (error) {
        console.error('[DB] Fatal Initialization Error:', error.message);
        throw error; // Rethrow to stop server startup if initialization fails
    }
};

module.exports = { initDb };
