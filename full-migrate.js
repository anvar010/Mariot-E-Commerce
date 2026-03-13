/**
 * Comprehensive Database Migration Script
 * Run after fresh XAMPP install to ensure all tables and columns exist
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('=== MARIOT Comprehensive Database Migration ===\n');

        // 1. Create database if not exists
        console.log('1. Ensuring database exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log('   ✓ Database ready\n');

        // 2. Create all base tables (IF NOT EXISTS ensures safety)
        console.log('2. Creating base tables...');

        await connection.query(`CREATE TABLE IF NOT EXISTS roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        // Seed roles
        await connection.query(`INSERT IGNORE INTO roles (name) VALUES ('admin'), ('user'), ('seller')`);
        console.log('   ✓ roles');

        await connection.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role_id INT DEFAULT 2,
            reward_points INT DEFAULT 0,
            phone_number VARCHAR(50) DEFAULT NULL,
            company_name VARCHAR(255) DEFAULT NULL,
            vat_number VARCHAR(100) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
        )`);
        console.log('   ✓ users');

        await connection.query(`CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            image_url VARCHAR(255),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (slug)
        )`);
        console.log('   ✓ categories');

        await connection.query(`CREATE TABLE IF NOT EXISTS brands (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            image_url VARCHAR(255),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (slug)
        )`);
        console.log('   ✓ brands');

        await connection.query(`CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            name_ar VARCHAR(255) DEFAULT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            description_ar TEXT DEFAULT NULL,
            short_description TEXT DEFAULT NULL,
            short_description_ar TEXT DEFAULT NULL,
            specifications TEXT DEFAULT NULL,
            price DECIMAL(10, 2) NOT NULL,
            discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
            offer_price DECIMAL(10, 2) DEFAULT NULL,
            stock_quantity INT DEFAULT 0,
            category_id INT,
            brand_id INT,
            seller_id INT DEFAULT NULL,
            is_featured BOOLEAN DEFAULT FALSE,
            is_weekly_deal BOOLEAN DEFAULT FALSE,
            is_limited_offer BOOLEAN DEFAULT FALSE,
            is_daily_offer BOOLEAN DEFAULT FALSE,
            is_best_seller TINYINT(1) DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            status ENUM('active','draft') DEFAULT 'active',
            product_group VARCHAR(255) DEFAULT NULL,
            sub_category VARCHAR(255) DEFAULT NULL,
            model VARCHAR(255) DEFAULT NULL,
            youtube_video_link TEXT DEFAULT NULL,
            resources TEXT DEFAULT NULL,
            offer_start DATETIME DEFAULT NULL,
            offer_end DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
            INDEX (slug),
            INDEX (category_id),
            INDEX (brand_id),
            FULLTEXT(name)
        )`);
        console.log('   ✓ products');

        await connection.query(`CREATE TABLE IF NOT EXISTS product_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            image_url VARCHAR(255) NOT NULL,
            is_primary BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);
        console.log('   ✓ product_images');

        await connection.query(`CREATE TABLE IF NOT EXISTS addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            address_line1 VARCHAR(255) NOT NULL,
            address_line2 VARCHAR(255),
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100),
            zip_code VARCHAR(20),
            country VARCHAR(100) DEFAULT 'United Arab Emirates',
            phone VARCHAR(20),
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);
        console.log('   ✓ addresses');

        await connection.query(`CREATE TABLE IF NOT EXISTS carts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);
        console.log('   ✓ carts');

        await connection.query(`CREATE TABLE IF NOT EXISTS cart_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cart_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);
        console.log('   ✓ cart_items');

        await connection.query(`CREATE TABLE IF NOT EXISTS coupons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
            discount_value DECIMAL(10, 2) NOT NULL,
            expiry_date DATE,
            usage_limit INT DEFAULT 0,
            used_count INT DEFAULT 0,
            min_order_amount DECIMAL(10, 2) DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            applicable_brands TEXT DEFAULT NULL,
            applicable_products TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log('   ✓ coupons');

        await connection.query(`CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            vat_amount DECIMAL(10, 2) NOT NULL,
            discount_amount DECIMAL(10, 2) DEFAULT 0.00,
            final_amount DECIMAL(10, 2) NOT NULL,
            status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
            payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
            payment_method VARCHAR(50),
            points_used INT DEFAULT 0,
            points_discount DECIMAL(10, 2) DEFAULT 0.00,
            coupon_id INT DEFAULT NULL,
            shipping_address_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
            FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
        )`);
        console.log('   ✓ orders');

        await connection.query(`CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price_at_purchase DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);
        console.log('   ✓ order_items');

        await connection.query(`CREATE TABLE IF NOT EXISTS wishlists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);
        console.log('   ✓ wishlists');

        await connection.query(`CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            rating TINYINT CHECK (rating BETWEEN 1 AND 5),
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);
        console.log('   ✓ reviews');

        await connection.query(`CREATE TABLE IF NOT EXISTS reward_points_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            points INT NOT NULL,
            transaction_type ENUM('earned', 'redeemed', 'expired') NOT NULL,
            order_id INT,
            description VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
        )`);
        console.log('   ✓ reward_points_history');

        // Quotations (MySQL version)
        await connection.query(`CREATE TABLE IF NOT EXISTS quotations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            quotation_ref VARCHAR(50) UNIQUE NOT NULL,
            user_id INT,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) NOT NULL,
            vat_number VARCHAR(50),
            items JSON NOT NULL,
            subtotal DECIMAL(10, 2) NOT NULL,
            tax_amount DECIMAL(10, 2) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )`);
        console.log('   ✓ quotations');

        // CMS tables
        await connection.query(`CREATE TABLE IF NOT EXISTS homepage_cms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            section_name VARCHAR(100) NOT NULL UNIQUE,
            content_data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log('   ✓ homepage_cms');

        await connection.query(`CREATE TABLE IF NOT EXISTS hero_slides (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tagline VARCHAR(255),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            image VARCHAR(255) NOT NULL,
            accent VARCHAR(20) DEFAULT '#ff3b30',
            btnText VARCHAR(100) DEFAULT 'Shop Now',
            link VARCHAR(255) DEFAULT '/shopnow',
            order_index INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log('   ✓ hero_slides');

        // Contact submissions (auto-created in route but let's ensure)
        await connection.query(`CREATE TABLE IF NOT EXISTS contact_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            subject VARCHAR(255),
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('   ✓ contact_submissions');

        console.log('\n   All base tables created!\n');

        // 3. Add missing columns to existing tables (ALTER TABLE IF NOT EXISTS style)
        console.log('3. Adding missing columns to existing tables...');

        const addColumn = async (table, column, definition) => {
            try {
                await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`   ✓ Added ${table}.${column}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`   - ${table}.${column} already exists`);
                } else {
                    console.log(`   ⚠ ${table}.${column}: ${err.message}`);
                }
            }
        };

        // Users table extras
        await addColumn('users', 'phone_number', 'VARCHAR(50) DEFAULT NULL');
        await addColumn('users', 'company_name', 'VARCHAR(255) DEFAULT NULL');
        await addColumn('users', 'vat_number', 'VARCHAR(100) DEFAULT NULL');

        // Products table extras
        await addColumn('products', 'name_ar', 'VARCHAR(255) DEFAULT NULL AFTER name');
        await addColumn('products', 'description_ar', 'TEXT DEFAULT NULL AFTER description');
        await addColumn('products', 'short_description', 'TEXT DEFAULT NULL AFTER description_ar');
        await addColumn('products', 'short_description_ar', 'TEXT DEFAULT NULL AFTER short_description');
        await addColumn('products', 'specifications', 'TEXT DEFAULT NULL AFTER short_description_ar');
        await addColumn('products', 'discount_percentage', 'DECIMAL(5,2) DEFAULT 0.00 AFTER price');
        await addColumn('products', 'offer_price', 'DECIMAL(10,2) DEFAULT NULL AFTER discount_percentage');
        await addColumn('products', 'seller_id', 'INT DEFAULT NULL AFTER brand_id');
        await addColumn('products', 'is_weekly_deal', 'BOOLEAN DEFAULT FALSE AFTER is_featured');
        await addColumn('products', 'is_limited_offer', 'BOOLEAN DEFAULT FALSE AFTER is_weekly_deal');
        await addColumn('products', 'is_daily_offer', 'BOOLEAN DEFAULT FALSE AFTER is_limited_offer');
        await addColumn('products', 'is_best_seller', 'TINYINT(1) DEFAULT 0 AFTER is_daily_offer');
        await addColumn('products', 'status', "ENUM('active','draft') DEFAULT 'active' AFTER is_active");
        await addColumn('products', 'product_group', 'VARCHAR(255) DEFAULT NULL');
        await addColumn('products', 'sub_category', 'VARCHAR(255) DEFAULT NULL');
        await addColumn('products', 'model', 'VARCHAR(255) DEFAULT NULL');
        await addColumn('products', 'youtube_video_link', 'TEXT DEFAULT NULL');
        await addColumn('products', 'resources', 'TEXT DEFAULT NULL');
        await addColumn('products', 'offer_start', 'DATETIME DEFAULT NULL');
        await addColumn('products', 'offer_end', 'DATETIME DEFAULT NULL');

        // Orders table extras
        await addColumn('orders', 'points_used', 'INT DEFAULT 0 AFTER payment_method');
        await addColumn('orders', 'points_discount', 'DECIMAL(10, 2) DEFAULT 0.00 AFTER points_used');
        await addColumn('orders', 'coupon_id', 'INT DEFAULT NULL AFTER points_discount');

        // Coupons table extras
        await addColumn('coupons', 'applicable_brands', 'TEXT DEFAULT NULL');
        await addColumn('coupons', 'applicable_products', 'TEXT DEFAULT NULL');

        // Brands table extras
        await addColumn('brands', 'description', 'TEXT DEFAULT NULL');
        await addColumn('brands', 'website_url', 'VARCHAR(255) DEFAULT NULL');
        await addColumn('brands', 'is_active', 'TINYINT(1) DEFAULT 1');
        await addColumn('brands', 'brand_type', "VARCHAR(50) DEFAULT 'All'");

        console.log('\n   All column additions processed!\n');

        // 4. Seed default data
        console.log('4. Seeding default data...');

        // Check if hero_slides is empty
        const [slideCount] = await connection.execute('SELECT COUNT(*) as cnt FROM hero_slides');
        if (slideCount[0].cnt === 0) {
            await connection.execute(`
                INSERT INTO hero_slides (tagline, title, description, image, accent, btnText, link, order_index)
                VALUES 
                ('MARIOT KITCHEN SOLUTIONS', 'Premium Cookware & Kitchen Equipment', 'Discover our exclusive collection of professional-grade kitchen solutions trusted by chefs worldwide.', '/assets/banner.webp', '#ff3b30', 'Shop Now', '/shopnow', 0),
                ('QUALITY YOU CAN TRUST', 'Professional Grade Kitchen Equipment', 'From commercial kitchens to your home — experience the difference of premium kitchen technology.', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop', '#0056b3', 'Shop Now', '/shopnow', 1)
            `);
            console.log('   ✓ Seeded default hero slides');
        } else {
            console.log('   - Hero slides already exist');
        }

        console.log('\n=== Migration completed successfully! ===\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

migrate();
