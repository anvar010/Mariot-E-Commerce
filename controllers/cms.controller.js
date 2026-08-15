const db = require('../config/db');

// One-time, idempotent migration: add the image columns that an existing
// hero_slides table may predate. CREATE TABLE IF NOT EXISTS won't alter a table
// that already exists, so every column added to the definition below must also be
// listed here — image_ar was not, so live tables never gained it. Guarded by a
// flag + try/catch so it runs at most once per process and silently no-ops when
// the columns already exist.
let heroImageColsEnsured = false;
const ensureHeroImageColumns = async () => {
    if (heroImageColsEnsured) return;
    for (const col of ['image_ar', 'image_mobile', 'image_mobile_ar']) {
        try { await db.query(`ALTER TABLE hero_slides ADD COLUMN ${col} TEXT`); }
        catch (e) { /* column already exists — ignore */ }
    }
    heroImageColsEnsured = true;
};
exports.ensureHeroImageColumns = ensureHeroImageColumns;

/**
 * @desc    Get homepage CMS content
 * @route   GET /api/v1/cms/homepage
 * @access  Public
 */
exports.getHomepageCms = async (req, res, next) => {
    try {
        // Table initializations (Lazy Migration)
        await db.query(`
            CREATE TABLE IF NOT EXISTS hero_slides (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tagline VARCHAR(255),
                tagline_ar VARCHAR(255),
                title VARCHAR(255),
                title_ar VARCHAR(255),
                description TEXT,
                description_ar TEXT,
                image TEXT,
                image_ar TEXT,
                image_mobile TEXT,
                image_mobile_ar TEXT,
                accent VARCHAR(50) DEFAULT '#3b82f6',
                btnText VARCHAR(100) DEFAULT 'Shop Now',
                btnText_ar VARCHAR(100),
                link VARCHAR(255) DEFAULT '/',
                order_index INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS hero_posters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255),
                title_ar VARCHAR(255),
                description TEXT,
                description_ar TEXT,
                badge VARCHAR(100),
                badge_ar VARCHAR(100),
                image TEXT,
                link VARCHAR(255),
                button_text VARCHAR(100),
                button_text_ar VARCHAR(100),
                order_index INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS homepage_cms (
                section_name VARCHAR(100) PRIMARY KEY,
                content_data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Ensure the newer image columns exist on older installs before reading.
        await ensureHeroImageColumns();

        // Get hero slides
        const [heroSlides] = await db.query('SELECT * FROM hero_slides WHERE is_active = 1 ORDER BY order_index ASC');

        // Get hero posters
        const [heroPosters] = await db.query('SELECT * FROM hero_posters WHERE is_active = 1 ORDER BY order_index ASC');

        // Get other CMS data (like announcements)
        const [cmsData] = await db.query('SELECT section_name, content_data FROM homepage_cms');

        const formattedData = (cmsData || []).reduce((acc, item) => {
            if (item && item.section_name) {
                try {
                    acc[item.section_name] = typeof item.content_data === 'string'
                        ? JSON.parse(item.content_data)
                        : item.content_data;
                } catch (e) {
                    acc[item.section_name] = item.content_data;
                }
            }
            return acc;
        }, {});

        // Combine
        formattedData.hero = heroSlides || [];
        formattedData.hero_posters = heroPosters || [];

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('[CMS] Fetch Error:', error.message);
        next(error);
    }
};
