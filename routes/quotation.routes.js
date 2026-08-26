const express = require('express');
const { createQuotation, getMyQuotations, deleteQuotation, getQuotations, sendEmailWithPdf, sendSoftwareQuotationEmail } = require('../controllers/quotation.controller');
const { protect, authorize, optionalProtect } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// ── RATE LIMITING DISABLED ────────────────────────────────────────────────────
// Turned off at the owner's request. Delete the passthrough and uncomment the
// block below to restore protection.
//
// WARNING: quotation creation is reachable without logging in (optionalProtect)
// and sends an email on success, so an unlimited endpoint here can be used to
// generate mail volume from our own domain.
const quotationLimiter = (req, res, next) => next();

/* original definition, kept for restoring:
const quotationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 200, // per IP per hour
    message: { success: false, message: 'Too many quotation requests from this IP, please try again after an hour' }
});
*/

router.post('/', optionalProtect, quotationLimiter, createQuotation);
router.post('/software-email', quotationLimiter, sendSoftwareQuotationEmail);
router.post('/:id/send-email', sendEmailWithPdf);
router.get('/', protect, authorize('admin'), getQuotations);
router.get('/my-quotations', protect, getMyQuotations);
router.delete('/:id', protect, deleteQuotation);

module.exports = router;
