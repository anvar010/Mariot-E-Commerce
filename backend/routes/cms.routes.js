const express = require('express');
const { getHomepageCms } = require('../controllers/cms.controller');

const router = express.Router();

// @desc    Get homepage CMS content
// @route   GET /api/v1/cms/homepage
router.get('/homepage', getHomepageCms);

module.exports = router;
