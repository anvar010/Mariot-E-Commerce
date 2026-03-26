const db = require('../config/db');

/**
 * @desc    Get homepage CMS content
 * @route   GET /api/v1/cms/homepage
 * @access  Public
 */
exports.getHomepageCms = async (req, res, next) => {
    try {
        // Get hero slides
        const [heroSlides] = await db.query('SELECT * FROM hero_slides WHERE is_active = 1 ORDER BY order_index ASC');

        // Get hero posters
        const [heroPosters] = await db.query('SELECT * FROM hero_posters WHERE is_active = 1 ORDER BY order_index ASC');

        // Get other CMS data (like announcements)
        const [cmsData] = await db.query('SELECT section_name, content_data FROM homepage_cms');

        const formattedData = cmsData.reduce((acc, item) => {
            acc[item.section_name] = typeof item.content_data === 'string'
                ? JSON.parse(item.content_data)
                : item.content_data;
            return acc;
        }, {});

        // Combine
        formattedData.hero = heroSlides;
        formattedData.hero_posters = heroPosters;

        res.json({ success: true, data: formattedData });
    } catch (error) {
        next(error);
    }
};
