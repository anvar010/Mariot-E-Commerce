const express = require('express');
const rateLimit = require('express-rate-limit');
const {
    sendOtp, checkOtp,
    sendEmailOtpForProfile, verifyEmailOtpForProfile,
    sendSignupOtp, verifySignupOtp
} = require('../controllers/verify.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// ── RATE LIMITING DISABLED ────────────────────────────────────────────────────
// Turned off at the owner's request. Delete the passthrough and uncomment the
// block below to restore protection.
//
// WARNING: this capped OTP SENDING to 3 a minute. With no cap, the endpoint can
// be driven in a loop to send unlimited codes to any address — both an abuse
// vector against third parties and a fast way to burn the SMTP quota.
const sendLimiter = (req, res, next) => next();

/* original definition, kept for restoring:
const sendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many OTP requests. Please wait a minute.' }
});
*/

// ── RATE LIMITING DISABLED ────────────────────────────────────────────────────
// Turned off at the owner's request. Delete the passthrough and uncomment the
// block below to restore protection.
//
// WARNING: this capped OTP VERIFICATION at 6 attempts a minute, which is what
// made guessing a 6-digit code impractical. Unlimited attempts make the code
// brute-forceable in minutes.
const checkLimiter = (req, res, next) => next();

/* original definition, kept for restoring:
const checkLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please wait a minute.' }
});
*/

// Public — signup OTP flow (account created only after OTP verified)
router.post('/signup/send-otp', sendLimiter, sendSignupOtp);
router.post('/signup/verify-otp', checkLimiter, verifySignupOtp);

// Authenticated — phone OTP (existing) + profile email change
router.post('/send-otp', protect, sendLimiter, sendOtp);
router.post('/check-otp', protect, checkLimiter, checkOtp);
router.post('/email/send-otp', protect, sendLimiter, sendEmailOtpForProfile);
router.post('/email/verify-otp', protect, checkLimiter, verifyEmailOtpForProfile);

module.exports = router;
