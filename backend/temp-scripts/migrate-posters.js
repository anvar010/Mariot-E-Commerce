const db = require('./config/db');

const migrateHeroPosters = async () => {
    try {
        console.log('Starting Hero Posters migration...');

        // Create hero_posters table
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
        console.log('hero_posters table created or already exists.');

        // Insert some initial data if empty
        const [existing] = await db.query('SELECT COUNT(*) as count FROM hero_posters');
        if (existing[0].count === 0) {
            await db.query(`
                INSERT INTO hero_posters (title, title_ar, description, description_ar, badge, badge_ar, image, link, button_text, button_text_ar, order_index)
                VALUES 
                ('Premium Kitchen Gear', 'معدات مطبخ متميزة', 'Explore our latest collection of professional grade equipment.', 'استكشف أحدث مجموعتنا من المعدات الاحترافية.', 'NEW ARRIVAL', 'وصل حديثاً', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1470&auto=format&fit=crop', '/shopnow', 'EXPLORE NOW', 'استكشف الآن', 0),
                ('Commercial Refrigeration', 'تبريد تجاري', 'Energy efficient cooling solutions for your business.', 'حلول تبريد موفرة للطاقة لعملك.', 'SAVE 20%', 'وفر 20%', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop', '/shopnow', 'VIEW DEALS', 'عرض العروض', 1),
                ('Chef''s Best Choice', 'أفضل خيار للشيف', 'Top rated tools favored by master chefs worldwide.', 'الأدوات الأعلى تقييماً المفضلة من قبل كبار الطهاة في جميع أنحاء العالم.', 'BEST SELLER', 'الأكثر مبيعاً', 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=1470&auto=format&fit=crop', '/shopnow', 'SHOP NOW', 'تسوق الآن', 2)
            `);
            console.log('Inserted default hero posters.');
        }

        console.log('Hero Posters migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateHeroPosters();
