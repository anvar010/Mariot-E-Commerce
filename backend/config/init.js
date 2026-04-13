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

        // 4. Orders completion tracking and points
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM orders");
            const columnNames = columns.map(c => c.Field);

            const orderColumns = [
                { name: 'is_processed', definition: "BOOLEAN DEFAULT FALSE AFTER payment_status" },
                { name: 'stripe_payment_intent_id', definition: "VARCHAR(255) AFTER payment_method" },
                { name: 'points_used', definition: "INT DEFAULT 0" },
                { name: 'points_discount', definition: "DECIMAL(10, 2) DEFAULT 0.00" },
                { name: 'coupon_id', definition: "INT" },
                { name: 'discount_amount', definition: "DECIMAL(10, 2) DEFAULT 0.00" }
            ];

            for (const col of orderColumns) {
                if (!columnNames.includes(col.name)) {
                    await db.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`[DB] Migration: Added ${col.name} column to orders table`);
                }
            }
        } catch (err) {
            console.error('[DB] Error migrating orders table:', err.message);
        }

        // 5. Products missing columns migration
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM products");
            const columnNames = columns.map(c => c.Field);

            const productColumns = [
                { name: 'name_ar', definition: "VARCHAR(255)" },
                { name: 'short_description', definition: "TEXT" },
                { name: 'short_description_ar', definition: "TEXT" },
                { name: 'description_ar', definition: "TEXT" },
                { name: 'specifications', definition: "TEXT" },
                { name: 'track_inventory', definition: "BOOLEAN DEFAULT TRUE" },
                { name: 'brand_id', definition: "INT" },
                { name: 'seller_id', definition: "INT" },
                { name: 'is_weekly_deal', definition: "BOOLEAN DEFAULT FALSE" },
                { name: 'is_limited_offer', definition: "BOOLEAN DEFAULT FALSE" },
                { name: 'is_daily_offer', definition: "BOOLEAN DEFAULT FALSE" },
                { name: 'is_best_seller', definition: "BOOLEAN DEFAULT FALSE" },
                { name: 'status', definition: "VARCHAR(50) DEFAULT 'active'" },
                { name: 'product_group', definition: "VARCHAR(255)" },
                { name: 'sub_category', definition: "VARCHAR(255)" },
                { name: 'model', definition: "VARCHAR(255)" },
                { name: 'youtube_video_link', definition: "JSON" },
                { name: 'resources', definition: "JSON" },
                { name: 'offer_start', definition: "DATETIME" },
                { name: 'offer_end', definition: "DATETIME" }
            ];

            for (const col of productColumns) {
                if (!columnNames.includes(col.name)) {
                    await db.query(`ALTER TABLE products ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`[DB] Migration: Added ${col.name} column to products table`);
                }
            }
        } catch (err) {
            console.error('[DB] Error migrating products table:', err.message);
        }

        // 6. Hierarchical Categories migration
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM categories");
            const columnNames = columns.map(c => c.Field);

            const categoryColumns = [
                { name: 'parent_id', definition: "INT NULL" },
                { name: 'type', definition: "ENUM('main_category', 'sub_category', 'sub_sub_category') DEFAULT 'main_category'" },
                { name: 'level', definition: "INT DEFAULT 0" },
                { name: 'order_index', definition: "INT DEFAULT 0" },
                { name: 'is_active', definition: "BOOLEAN DEFAULT TRUE" }
            ];

            for (const col of categoryColumns) {
                if (!columnNames.includes(col.name)) {
                    await db.query(`ALTER TABLE categories ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`[DB] Migration: Added ${col.name} column to categories table`);
                }
            }

            // Ensure foreign key for parent_id if it doesn't exist
            try {
                await db.query("ALTER TABLE categories ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL");
            } catch (fkErr) {
                // Ignore if it already exists
            }
        } catch (err) {
            console.error('[DB] Error migrating categories table:', err.message);
        }

        // 7. Settings Table (Ensure it exists)
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                \`value\` TEXT,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('[DB] settings table verified');
    } catch (error) {
        console.error('[DB] Fatal Initialization Error:', error.message);
        throw error; // Rethrow to stop server startup if initialization fails
    }
};

module.exports = { initDb };
