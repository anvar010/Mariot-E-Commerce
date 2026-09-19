const express = require('express');
const { getCoupons, getAvailableCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon, getCustomersForCoupon } = require('../controllers/coupon.controller');
const { protect, authorize, optionalProtect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public, but identify the shopper when they are signed in: a coupon can be reserved for
// named customers, and these two have to know whose cart they are looking at. Guests are
// still served -- they simply never match a reserved coupon.
router.get('/available', optionalProtect, getAvailableCoupons);
router.post('/validate', optionalProtect, validateCoupon);

router.use(protect);

// Admin routes
router.get('/customers', authorize('admin'), getCustomersForCoupon);

router.route('/')
    .get(authorize('admin'), getCoupons)
    .post(authorize('admin'), createCoupon);

router.route('/:id')
    .put(authorize('admin'), updateCoupon)
    .delete(authorize('admin'), deleteCoupon);

module.exports = router;
