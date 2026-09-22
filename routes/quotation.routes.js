const express = require('express');
const { createQuotation, getMyQuotations, deleteQuotation, getQuotations, sendEmailWithPdf, sendSoftwareQuotationEmail } = require('../controllers/quotation.controller');
const { protect, authorize, optionalProtect, authorizeAdminOrStaff } = require('../middlewares/auth.middleware');
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
// Admins, and staff holding the `quotations` permission -- the same key that reveals the
// sidebar entry. It was authorize('admin') before, so granting that permission showed a
// staff member the tab and then answered it with a 403: the menu and the API disagreed
// about who may use this. These are customer-initiated quotations from the storefront, a
// shared queue rather than anyone's own records, so a permitted staff member sees all of
// them exactly as an admin does.
router.get('/', protect, authorizeAdminOrStaff('quotations'), getQuotations);
router.get('/my-quotations', protect, getMyQuotations);
router.delete('/:id', protect, deleteQuotation);

module.exports = router;
