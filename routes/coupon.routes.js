const express = require('express');
const { getCoupons, getAvailableCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon, getCustomersForCoupon } = require('../controllers/coupon.controller');
const { protect, authorize, optionalProtect, authorizeAdminOrStaff } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public, but identify the shopper when they are signed in: a coupon can be reserved for
// named customers, and these two have to know whose cart they are looking at. Guests are
// still served -- they simply never match a reserved coupon.
router.get('/available', optionalProtect, getAvailableCoupons);
router.post('/validate', optionalProtect, validateCoupon);

router.use(protect);

// Admins, and staff holding the `coupons` permission -- the same key that reveals the
// sidebar entry, so the menu and the API agree about who may use this. Previously these
// were admin-only, which meant granting a staff member the Coupons permission showed them
// the tab and then answered every request with a 403.
router.get('/customers', authorizeAdminOrStaff('coupons'), getCustomersForCoupon);

router.route('/')
    .get(authorizeAdminOrStaff('coupons'), getCoupons)
    .post(authorizeAdminOrStaff('coupons'), createCoupon);

router.route('/:id')
    .put(authorizeAdminOrStaff('coupons'), updateCoupon)
    .delete(authorizeAdminOrStaff('coupons'), deleteCoupon);

module.exports = router;
