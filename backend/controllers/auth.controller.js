const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user.id);

    const isProd = process.env.NODE_ENV === 'production';
    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true,
        secure: isProd, // Must be true for SameSite=None
        sameSite: isProd ? 'none' : 'lax',
        path: '/'
    };

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        user
    });
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const userId = await User.create({ name, email, password });
        const user = { id: userId, name, email, role: 'user', reward_points: 1000 };
        sendTokenResponse(user, 201, res);
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        sendTokenResponse({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone_number: user.phone_number,
            company_name: user.company_name,
            vat_number: user.vat_number,
            reward_points: user.reward_points
        }, 200, res);
    } catch (error) {
        next(error);
    }
};

exports.googleLogin = async (req, res, next) => {
    try {
        const { token } = req.body;

        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            return res.status(401).json({ success: false, message: 'Invalid Google Token' });
        }

        const { name, email, picture } = await response.json();

        let user = await User.findByEmail(email);

        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const userId = await User.create({ name, email, password: randomPassword });
            user = await User.findById(userId);
        }

        sendTokenResponse({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone_number: user.phone_number,
            company_name: user.company_name,
            vat_number: user.vat_number,
            reward_points: user.reward_points
        }, 200, res);
    } catch (error) {
        console.error('Google login error:', error);
        res.status(401).json({ success: false, message: 'Google authentication failed' });
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

exports.updateMe = async (req, res, next) => {
    try {
        const success = await User.update(req.user.id, req.body);
        if (success) {
            const updatedUser = await User.findById(req.user.id);
            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser
            });
        } else {
            res.status(400).json({ success: false, message: 'Failed to update profile' });
        }
    } catch (error) {
        next(error);
    }
};

exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ success: true, data: {} });
};
