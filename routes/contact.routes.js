const express = require('express');
const router = express.Router();
const { 
    submitContactForm, 
    getAllContacts, 
    updateContactStatus, 
    deleteContact 
} = require('../controllers/contact.controller');
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middlewares/auth.middleware');

// ── RATE LIMITING DISABLED ────────────────────────────────────────────────────
// Turned off at the owner's request. Delete the passthrough and uncomment the
// block below to restore protection.
//
// WARNING: this is a public, unauthenticated form. With no limit it can be
// submitted continuously, which in practice means spam straight to the inbox.
const contactLimiter = (req, res, next) => next();

/* original definition, kept for restoring:
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // per IP per hour
    message: { success: false, message: 'Too many messages sent from this IP, please try again after an hour' }
});
*/

// @route   POST /api/v1/contact
// @desc    Save contact form submission
// @access  Public
router.post('/', contactLimiter, submitContactForm);

// @route   GET /api/v1/contact
// @desc    Get all contact submissions (admin)
// @access  Private/Admin
router.get('/', protect, authorize('admin', 'seller'), getAllContacts);

// @route   PUT /api/v1/contact/:id/status
// @desc    Update contact submission status
// @access  Private/Admin
router.put('/:id/status', protect, authorize('admin', 'seller'), updateContactStatus);

// @route   DELETE /api/v1/contact/:id
// @desc    Delete a contact submission
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin', 'seller'), deleteContact);

module.exports = router;
