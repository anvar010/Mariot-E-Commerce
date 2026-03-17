const express = require('express');
const { body } = require('express-validator');
const { register, login, googleLogin, getMe, updateMe, logout, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], register);

router.post('/login', [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').exists().withMessage('Password is required'),
    validate
], login);

router.post('/google-login', googleLogin);

router.get('/logout', logout);

router.post('/forgot-password', [
    body('email').isEmail().withMessage('Please include a valid email'),
    validate
], forgotPassword);

router.post('/reset-password', [
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], resetPassword);

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

module.exports = router;
