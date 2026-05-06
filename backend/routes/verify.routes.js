const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOtp, checkOtp } = require('../controllers/verify.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

const sendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many OTP requests. Please wait a minute.' }
});

const checkLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please wait a minute.' }
});

router.use(protect);
router.post('/send-otp', sendLimiter, sendOtp);
router.post('/check-otp', checkLimiter, checkOtp);

module.exports = router;
