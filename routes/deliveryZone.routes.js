const express = require('express');
const {
    listZones,
    listAllZones,
    upsertZone,
    deleteZone,
} = require('../controllers/deliveryZone.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public: the product page needs this before anyone signs in.
router.get('/', listZones);

router.get('/admin', protect, authorize('admin'), listAllZones);
router.post('/', protect, authorize('admin'), upsertZone);
router.delete('/:code', protect, authorize('admin'), deleteZone);

module.exports = router;
