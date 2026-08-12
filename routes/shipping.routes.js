const express = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate.middleware');
const { quoteShipping } = require('../services/shipping/shipping.service');

const router = express.Router();

// Quoting is open to guests: the cart offers delivery options before sign-in.
router.post(
    '/quote',
    [
        body('items').isArray({ min: 1 }).withMessage('At least one cart item is required.'),
        body('destination.country').trim().notEmpty().withMessage('A destination country is required.'),
    ],
    validate,
    async (req, res, next) => {
        try {
            const methods = await quoteShipping(req.body.items, req.body.destination);
            res.json({ success: true, count: methods.length, data: methods });
        } catch (error) {
            if (error.status === 400) {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }
);

module.exports = router;
