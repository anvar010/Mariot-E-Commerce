const express = require('express');
const { createQuotation, getMyQuotations, deleteQuotation, getQuotations } = require('../controllers/quotationController');
const { protect, authorize, optionalProtect } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/', optionalProtect, createQuotation);
router.get('/', protect, authorize('admin'), getQuotations);
router.get('/my-quotations', protect, getMyQuotations);
router.delete('/:id', protect, deleteQuotation);

module.exports = router;
