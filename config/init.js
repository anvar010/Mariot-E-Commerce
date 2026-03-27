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

        // 2. User Status Migration (if column doesn't exist)
        try {
            await db.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active' AFTER role_id");
            console.log('[DB] Migration: Added status column to users table');
        } catch (err) {
            if (err.code !== 'ER_DUP_COLUMN_NAME') throw err;
        }

        // 3. Address Table Migrations
        const addressColumns = [
            { name: 'first_name', definition: "VARCHAR(255) AFTER user_id" },
            { name: 'last_name', definition: "VARCHAR(255) AFTER first_name" },
            { name: 'company_name', definition: "VARCHAR(255) AFTER last_name" },
            { name: 'email', definition: "VARCHAR(255) AFTER company_name" }
        ];

        for (const col of addressColumns) {
            try {
                await db.query(`ALTER TABLE addresses ADD COLUMN ${col.name} ${col.definition}`);
                console.log(`[DB] Migration: Added ${col.name} column to addresses table`);
            } catch (err) {
                if (err.code !== 'ER_DUP_COLUMN_NAME') throw err;
            }
        }

        console.log('[DB] Initialization complete');
    } catch (error) {
        console.error('[DB] Initialization Error:', error.message);
    }
};

module.exports = { initDb };
