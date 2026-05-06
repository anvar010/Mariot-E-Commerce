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

        // 1.5 Category Brands Junction Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS category_brands (
                category_id INT NOT NULL,
                brand_id INT NOT NULL,
                PRIMARY KEY (category_id, brand_id)
            )
        `);
        console.log('[DB] category_brands table verified');

        // 1.6 Reward Points History Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS reward_points_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                points INT NOT NULL,
                transaction_type ENUM('earned', 'redeemed', 'expired') NOT NULL,
                order_id INT,
                description VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[DB] reward_points_history table verified');

        // 1.7 Seed 'staff' role (INSERT IGNORE is safe — no error if it already exists)
        try {
            await db.query("INSERT IGNORE INTO roles (name) VALUES ('staff')");
            console.log('[DB] staff role verified');
        } catch (err) {
            console.error('[DB] Error seeding staff role:', err.message);
        }

        // 2. User Status Migration & Missing Columns
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM users");
            const columnNames = columns.map(c => c.Field);
            const userColumns = [
                { name: 'status', definition: "ENUM('active', 'suspended') DEFAULT 'active' AFTER role_id" },
                { name: 'phone_number', definition: "VARCHAR(50)" },
                { name: 'company_name', definition: "VARCHAR(255)" },
                { name: 'vat_number', definition: "VARCHAR(100)" },
                { name: 'reset_password_token', definition: "VARCHAR(255)" },
                { name: 'reset_password_expires', definition: "DATETIME" },
                { name: 'staff_permissions', definition: "JSON NULL" }
            ];
            for (const col of userColumns) {
                if (!columnNames.includes(col.name)) {
                    await db.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`[DB] Migration: Added ${col.name} column to users table`);
                }
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
                { name: 'is_active', definition: "BOOLEAN DEFAULT TRUE" },
                { name: 'name_ar', definition: "VARCHAR(255)" },
                { name: 'description_ar', definition: "TEXT NULL" },
                { name: 'brand_names', definition: "TEXT" }
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

        // 6.5 Coupons missing columns migration
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM coupons");
            const columnNames = columns.map(c => c.Field);

            const couponColumns = [
                { name: 'max_discount', definition: "DECIMAL(10, 2) DEFAULT NULL" },
                { name: 'applicable_brands', definition: "JSON" },
                { name: 'applicable_products', definition: "JSON" }
            ];

            for (const col of couponColumns) {
                if (!columnNames.includes(col.name)) {
                    await db.query(`ALTER TABLE coupons ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`[DB] Migration: Added ${col.name} column to coupons table`);
                }
            }
        } catch (err) {
            console.error('[DB] Error migrating coupons table:', err.message);
        }

        // 6.7 Product Variants Tables
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS product_options (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    product_id INT NOT NULL,
                    name VARCHAR(50) NOT NULL,
                    name_ar VARCHAR(50) NULL,
                    position INT DEFAULT 0,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    INDEX idx_po_product (product_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            await db.query(`
                CREATE TABLE IF NOT EXISTS product_variants (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    product_id INT NOT NULL,
                    sku VARCHAR(100) NULL,
                    price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    offer_price DECIMAL(10,2) NULL,
                    stock_quantity INT NOT NULL DEFAULT 0,
                    image_url VARCHAR(500) NULL,
                    use_primary_image TINYINT(1) NOT NULL DEFAULT 1,
                    options_signature VARCHAR(500) NOT NULL,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    is_default TINYINT(1) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    UNIQUE KEY uk_variant_sig (product_id, options_signature),
                    UNIQUE KEY uk_variant_sku (sku),
                    INDEX idx_pv_product (product_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            await db.query(`
                CREATE TABLE IF NOT EXISTS product_variant_options (
                    variant_id INT NOT NULL,
                    option_id INT NOT NULL,
                    value VARCHAR(100) NOT NULL,
                    value_ar VARCHAR(100) NULL,
                    PRIMARY KEY (variant_id, option_id),
                    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
                    FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('[DB] product variant tables verified');

            // Add has_variants column to products
            const [pColumns] = await db.query("SHOW COLUMNS FROM products");
            if (!pColumns.map(c => c.Field).includes('has_variants')) {
                await db.query("ALTER TABLE products ADD COLUMN has_variants TINYINT(1) NOT NULL DEFAULT 0");
                console.log('[DB] Migration: Added has_variants column to products table');
            }

            // Add variant_id to cart_items
            const [ciColumns] = await db.query("SHOW COLUMNS FROM cart_items");
            if (!ciColumns.map(c => c.Field).includes('variant_id')) {
                await db.query("ALTER TABLE cart_items ADD COLUMN variant_id INT NULL AFTER product_id");
                await db.query("ALTER TABLE cart_items ADD CONSTRAINT fk_ci_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE");
                console.log('[DB] Migration: Added variant_id column to cart_items table');
            }

            // Add variant_id to order_items
            const [oiColumns] = await db.query("SHOW COLUMNS FROM order_items");
            if (!oiColumns.map(c => c.Field).includes('variant_id')) {
                await db.query("ALTER TABLE order_items ADD COLUMN variant_id INT NULL AFTER product_id");
                console.log('[DB] Migration: Added variant_id column to order_items table');
            }
        } catch (err) {
            console.error('[DB] Error migrating product variant tables:', err.message);
        }

        // Migration: Add you_may_also_need column to products
        try {
            const [prodCols] = await db.query("SHOW COLUMNS FROM products");
            if (!prodCols.map(c => c.Field).includes('you_may_also_need')) {
                await db.query("ALTER TABLE products ADD COLUMN you_may_also_need TEXT NULL");
                console.log('[DB] Migration: Added you_may_also_need column to products table');
            }
        } catch (err) {
            console.error('[DB] Error adding you_may_also_need column:', err.message);
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
