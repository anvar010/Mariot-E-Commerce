const express = require('express');
const { createQuotation, getMyQuotations, deleteQuotation, getQuotations, sendEmailWithPdf, sendSoftwareQuotationEmail } = require('../controllers/quotation.controller');
const { protect, authorize, optionalProtect } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const quotationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    // Raised from 10. Limits are per IP, and a showroom or office shares one, so a
    // busy afternoon of legitimate quotations was hitting the old ceiling between
    // them. Still bounded, so an abusive client is capped.
    max: 200, // per IP per hour
    message: { success: false, message: 'Too many quotation requests from this IP, please try again after an hour' }
});

router.post('/', optionalProtect, quotationLimiter, createQuotation);
router.post('/software-email', quotationLimiter, sendSoftwareQuotationEmail);
router.post('/:id/send-email', sendEmailWithPdf);
router.get('/', protect, authorize('admin'), getQuotations);
router.get('/my-quotations', protect, getMyQuotations);
router.delete('/:id', protect, deleteQuotation);

module.exports = router;
