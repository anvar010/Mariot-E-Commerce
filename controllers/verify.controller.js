const User = require('../models/user.model');
const whatsapp = require('../services/whatsapp.service');

/**
 * Generate a random 6-digit OTP
 */
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.sendOtp = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const phone = (req.body.phone || user.phone_number || '').trim();
        if (!phone) return res.status(400).json({ success: false, message: 'No phone number on file. Add one in your profile first.' });

        if (!whatsapp.isConfigured()) {
            return res.status(503).json({ success: false, message: 'WhatsApp service not configured' });
        }

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Save OTP to database
        await User.saveOtp(req.user.id, otp, expiresAt);

        // Send via WhatsApp
        await whatsapp.sendOtp(phone, otp);

        const formatted = whatsapp.formatPhone(phone);
        const masked = formatted.slice(0, formatted.length - 4).replace(/\d/g, '*') + formatted.slice(-4);

        res.json({ success: true, message: 'OTP sent via WhatsApp', phone: masked });
    } catch (err) {
        console.error('Send OTP Error:', err);
        next(err);
    }
};

exports.checkOtp = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code || String(code).length !== 6) {
            return res.status(400).json({ success: false, message: 'Invalid OTP format. Must be 6 digits.' });
        }

        const user = await User.getOtp(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (!user.otp_code || user.otp_code !== String(code)) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        const fullUser = await User.findById(req.user.id);
        const phone = (req.body.phone || fullUser.phone_number || '').trim();

        // Mark as verified and clear OTP
        await User.setPhoneVerified(req.user.id, phone);

        res.json({ success: true, message: 'Phone verified successfully', phone_verified: 1 });
    } catch (err) {
        console.error('Check OTP Error:', err);
        next(err);
    }
};
