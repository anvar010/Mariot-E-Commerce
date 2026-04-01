const db = require('../config/db');

// @desc    Get dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
    try {
        const { timeRange } = req.query;
        let dateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"; // default
        let oDateCondition = "o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        let prevDateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)";

        switch (timeRange) {
            case '14d':
                dateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)";
                oDateCondition = "o.created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)";
                prevDateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 14 DAY)";
                break;
            case '30d':
                dateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                oDateCondition = "o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                prevDateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                break;
            case '3m':
                dateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
                oDateCondition = "o.created_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
                prevDateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND created_at < DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
                break;
            case '6m':
                dateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
                oDateCondition = "o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
                prevDateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND created_at < DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
                break;
            case '1y':
                dateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
                oDateCondition = "o.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
                prevDateCondition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR) AND created_at < DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
                break;
            case 'all':
                dateCondition = "1=1";
                oDateCondition = "1=1";
                prevDateCondition = "1=0";
                break;
        }

        const [[{ count: userCount }]] = await db.query(`SELECT COUNT(*) as count FROM users`);
        const [[{ count: totalProducts }]] = await db.query('SELECT COUNT(*) as count FROM products');
        const [[{ count: activeProducts }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE status = "active" AND is_active = 1');
        const [[{ count: totalOrders, total_sales: totalSales }]] = await db.query(`SELECT COUNT(*) as count, SUM(total_amount) as total_sales FROM orders WHERE status != "cancelled" AND ${dateCondition}`);
        const [[{ count: prevTotalOrders, total_sales: prevTotalSales }]] = await db.query(`SELECT COUNT(*) as count, SUM(total_amount) as total_sales FROM orders WHERE status != "cancelled" AND ${prevDateCondition}`);

        const currentSales = totalSales || 0;
        const previousSales = prevTotalSales || 0;
        const salesGrowth = previousSales > 0 ? Math.round(((currentSales - previousSales) / previousSales) * 100) : (currentSales > 0 ? 100 : 0);

        const currentOrders = totalOrders || 0;
        const previousOrders = prevTotalOrders || 0;
        const ordersGrowth = previousOrders > 0 ? Math.round(((currentOrders - previousOrders) / previousOrders) * 100) : (currentOrders > 0 ? 100 : 0);

        const [recentOrders] = await db.query(`
            SELECT o.*, u.name as user_name 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC 
            LIMIT 5
        `);

        // Sales over time
        const [salesHistory] = await db.query(`
            SELECT DATE(created_at) as date, SUM(total_amount) as amount
            FROM orders
            WHERE ${dateCondition}
              AND status != 'cancelled'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        `);

        // Sales by category
        const [categorySales] = await db.query(`
            SELECT 
                COALESCE(c.name, 'Uncategorized') as name, 
                SUM(oi.quantity * oi.price_at_purchase) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'cancelled' AND ${oDateCondition}
            GROUP BY COALESCE(c.name, 'Uncategorized')
            ORDER BY revenue DESC
        `);

        // Low stock alerts
        const [lowStockAlerts] = await db.query(`
            SELECT id, name, stock_quantity 
            FROM products 
            WHERE stock_quantity <= 5 AND track_inventory = 1 AND is_active = 1
            LIMIT 5
        `);

        // Top products
        const [topProducts] = await db.query(`
            SELECT p.id, p.name, SUM(oi.quantity) as sold_count
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'cancelled' AND ${oDateCondition}
            GROUP BY p.id, p.name
            ORDER BY sold_count DESC
            LIMIT 5
        `);

        // Recent reviews
        const [recentReviews] = await db.query(`
            SELECT r.*, u.name as user_name, p.name as product_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            ORDER BY r.created_at DESC
            LIMIT 5
        `);

        // SEO Stats calculations
        const [[{ count: missingImages }]] = await db.query('SELECT COUNT(*) as count FROM products p LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1 WHERE pi.id IS NULL');
        const [[{ count: missingDescription }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE description IS NULL OR description = ""');
        const [[{ count: shortTitles }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE CHAR_LENGTH(name) < 30');
        const [[{ count: longTitles }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE CHAR_LENGTH(name) > 60');
        const [[{ count: missingBrand }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE brand_id IS NULL');

        const totalProductsCount = totalProducts || 0;
        const totalPossibleIssues = totalProductsCount * 5;
        const actualIssues = (missingImages || 0) + (missingDescription || 0) + (shortTitles || 0) + (longTitles || 0) + (missingBrand || 0);
        const seoScore = totalProductsCount > 0 ? Math.round(((totalPossibleIssues - actualIssues) / totalPossibleIssues) * 100) : 100;

        // Users Growth
        const [[userGrowthStats]] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE ${dateCondition}) as current_period,
                (SELECT COUNT(*) FROM users WHERE ${prevDateCondition}) as prev_period
        `);

        const userGrowthPercentage = userGrowthStats.prev_period > 0
            ? Math.round(((userGrowthStats.current_period - userGrowthStats.prev_period) / userGrowthStats.prev_period) * 100)
            : (userGrowthStats.current_period > 0 ? 100 : 0);

        res.json({
            success: true,
            data: {
                totalUsers: userCount,
                userGrowth: userGrowthPercentage,
                totalProducts: totalProductsCount,
                activeProducts: activeProducts || 0,
                totalOrders: totalOrders || 0,
                totalSales: currentSales,
                salesGrowth,
                ordersGrowth,
                recentOrders,
                salesHistory,
                categorySales,
                lowStockAlerts,
                topProducts,
                recentReviews,
                seoStats: {
                    score: seoScore,
                    issues: {
                        missingImages,
                        missingDescription,
                        shortTitles,
                        longTitles,
                        missingBrand
                    }
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.name, u.email, u.reward_points, u.created_at, u.role_id, COALESCE(u.status, 'active') as status, COALESCE(r.name, 'user') as role 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user details (name, email, role)
// @route   PUT /api/v1/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
    try {
        const { name, email, role_id } = req.body;

        // Build update query dynamically based on provided fields
        const fields = [];
        const values = [];

        if (name) {
            fields.push('name = ?');
            values.push(name);
        }
        if (email) {
            fields.push('email = ?');
            values.push(email);
        }
        if (role_id) {
            fields.push('role_id = ?');
            values.push(role_id);
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(req.params.id);

        await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle user status (active/suspended)
// @route   PATCH /api/v1/admin/users/:id/status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT status FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const currentStatus = rows[0].status || 'active';
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

        await db.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, req.params.id]);
        res.json({ success: true, message: `User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`, data: { status: newStatus } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all orders
// @route   GET /api/v1/admin/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res, next) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);
        res.json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};
// @desc    Update homepage CMS content (generic)
// @route   PUT /api/v1/admin/cms/homepage
exports.updateHomepageCMS = async (req, res, next) => {
    try {
        const { section, data } = req.body;
        await db.query(`
            INSERT INTO homepage_cms (section_name, content_data) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE content_data = VALUES(content_data)
        `, [section, JSON.stringify(data)]);
        res.json({ success: true, message: `${section} updated successfully` });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all hero slides
// @route   GET /api/v1/admin/cms/hero-slides
exports.getHeroSlides = async (req, res, next) => {
    try {
        const [slides] = await db.query('SELECT * FROM hero_slides ORDER BY order_index ASC');
        res.json({ success: true, data: slides });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a new hero slide
// @route   POST /api/v1/admin/cms/hero-slides
exports.addHeroSlide = async (req, res, next) => {
    try {
        const { tagline, tagline_ar, title, title_ar, description, description_ar, image, accent, btnText, btnText_ar, link, order_index } = req.body;

        const [result] = await db.query(`
            INSERT INTO hero_slides (tagline, tagline_ar, title, title_ar, description, description_ar, image, accent, btnText, btnText_ar, link, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tagline, tagline_ar, title, title_ar, description, description_ar, image, accent || '#ff3b30', btnText || 'Shop Now', btnText_ar, link || '/shopnow', order_index || 0]);

        res.status(201).json({ success: true, message: 'Slide added successfully', data: { id: result.insertId } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a specific hero slide
// @route   PUT /api/v1/admin/cms/hero-slides/:id
exports.updateHeroSlide = async (req, res, next) => {
    try {
        const { tagline, tagline_ar, title, title_ar, description, description_ar, image, accent, btnText, btnText_ar, link, order_index, is_active } = req.body;

        await db.query(`
            UPDATE hero_slides 
            SET tagline = ?, tagline_ar = ?, title = ?, title_ar = ?, description = ?, description_ar = ?, image = ?, accent = ?, btnText = ?, btnText_ar = ?, link = ?, order_index = ?, is_active = ?
            WHERE id = ?
        `, [tagline, tagline_ar, title, title_ar, description, description_ar, image, accent, btnText, btnText_ar, link, order_index, is_active, req.params.id]);

        res.json({ success: true, message: 'Slide updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a hero slide
// @route   DELETE /api/v1/admin/cms/hero-slides/:id
exports.deleteHeroSlide = async (req, res, next) => {
    try {
        await db.query('DELETE FROM hero_slides WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Slide deleted successfully' });
    } catch (error) {
        next(error);
    }
};
// @desc    Export all products to CSV
// @route   GET /api/v1/admin/export/products
// @access  Private/Admin
exports.exportProducts = async (req, res, next) => {
    try {
        const [products] = await db.query(`
            SELECT p.id, p.name, p.slug, p.price, p.discount_percentage, p.offer_price, 
                   p.stock_quantity, c.name as category, b.name as brand, p.status, p.created_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            ORDER BY p.id ASC
        `);

        if (!products || products.length === 0) {
            return res.status(200).json({ success: false, message: 'No product data available to export' });
        }

        const { parse } = require('json2csv');
        const csv = parse(products);

        res.header('Content-Type', 'text/csv');
        res.attachment(`mariot_products_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    } catch (error) {
        console.error('Export Products Error:', error);
        next(error);
    }
};

// @desc    Export all orders to CSV
// @route   GET /api/v1/admin/export/orders
// @access  Private/Admin
exports.exportOrders = async (req, res, next) => {
    try {
        const [orders] = await db.query(`
            SELECT o.id, u.name as customer_name, u.email as customer_email, 
                   o.total_amount, o.vat_amount, o.discount_amount, o.final_amount,
                   o.status, o.payment_status, o.payment_method, o.created_at
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);

        if (!orders || orders.length === 0) {
            return res.status(200).json({ success: false, message: 'No order history available to export' });
        }

        const { parse } = require('json2csv');
        const csv = parse(orders);

        res.header('Content-Type', 'text/csv');
        res.attachment(`mariot_orders_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    } catch (error) {
        console.error('Export Orders Error:', error);
        next(error);
    }
};

// @desc    Get all roles
// @route   GET /api/v1/admin/roles
// @access  Private/Admin
exports.getRoles = async (req, res, next) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles');
        res.json({ success: true, data: roles });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all hero posters
// @route   GET /api/v1/admin/cms/hero-posters
exports.getHeroPosters = async (req, res, next) => {
    try {
        // Auto-create table if missing (Lazy Migration)
        await db.query(`
            CREATE TABLE IF NOT EXISTS hero_posters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                title_ar VARCHAR(255),
                description TEXT,
                description_ar TEXT,
                badge VARCHAR(100),
                badge_ar VARCHAR(100),
                image TEXT NOT NULL,
                link VARCHAR(255),
                button_text VARCHAR(100) DEFAULT 'SHOP NOW',
                button_text_ar VARCHAR(100),
                order_index INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        const [posters] = await db.query('SELECT * FROM hero_posters ORDER BY order_index ASC');
        res.json({ success: true, data: posters });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a new hero poster
// @route   POST /api/v1/admin/cms/hero-posters
exports.addHeroPoster = async (req, res, next) => {
    try {
        const { title, title_ar, description, description_ar, badge, badge_ar, image, link, button_text, button_text_ar, order_index } = req.body;

        // Ensure table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS hero_posters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                title_ar VARCHAR(255),
                description TEXT,
                description_ar TEXT,
                badge VARCHAR(100),
                badge_ar VARCHAR(100),
                image TEXT NOT NULL,
                link VARCHAR(255),
                button_text VARCHAR(100) DEFAULT 'SHOP NOW',
                button_text_ar VARCHAR(100),
                order_index INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        const [result] = await db.query(`
            INSERT INTO hero_posters (title, title_ar, description, description_ar, badge, badge_ar, image, link, button_text, button_text_ar, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [title, title_ar, description, description_ar, badge, badge_ar, image, link, button_text || 'SHOP NOW', button_text_ar, order_index || 0]);

        res.status(201).json({ success: true, message: 'Poster added successfully', data: { id: result.insertId } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a specific hero poster
// @route   PUT /api/v1/admin/cms/hero-posters/:id
exports.updateHeroPoster = async (req, res, next) => {
    try {
        const { title, title_ar, description, description_ar, badge, badge_ar, image, link, button_text, button_text_ar, order_index, is_active } = req.body;

        await db.query(`
            UPDATE hero_posters 
            SET title = ?, title_ar = ?, description = ?, description_ar = ?, badge = ?, badge_ar = ?, image = ?, link = ?, button_text = ?, button_text_ar = ?, order_index = ?, is_active = ?
            WHERE id = ?
        `, [title, title_ar, description, description_ar, badge, badge_ar, image, link, button_text, button_text_ar, order_index, is_active, req.params.id]);

        res.json({ success: true, message: 'Poster updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a hero poster
// @route   DELETE /api/v1/admin/cms/hero-posters/:id
exports.deleteHeroPoster = async (req, res, next) => {
    try {
        await db.query('DELETE FROM hero_posters WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Poster deleted successfully' });
    } catch (error) {
        next(error);
    }
};
