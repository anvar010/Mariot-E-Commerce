const express = require('express');
const { resolveCountry } = require('../services/geo.service');

const router = express.Router();

/**
 * GET /api/v1/geo/country -> { success, country_code, source }
 *
 * Open to guests: the product page asks before anyone signs in. country_code is null when
 * the country could not be determined, and the caller keeps its default rather than guessing.
 */
router.get('/country', async (req, res) => {
    try {
        const result = await resolveCountry(req);
        // No Cache-Control override here on purpose. The app sets no-store across /api
        // because a shared cache in front of it would hand one visitor's answer to
        // another -- and a per-visitor country is precisely that kind of response.
        // Repeat lookups are avoided by the per-IP cache inside the service instead.
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[geo] country resolve failed:', error.message);
        res.json({ success: true, country_code: null, source: 'error' });
    }
});

module.exports = router;
