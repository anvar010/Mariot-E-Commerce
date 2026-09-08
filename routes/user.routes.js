const express = require('express');
const { getProfile, getRewardHistory, getAddresses,
    setDefaultAddress, addAddress, deleteAddress, updateAddress } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.get('/reward-history', getRewardHistory);
router.route('/addresses')
    .get(getAddresses)
    .post(addAddress);

router.put('/addresses/:id/default', setDefaultAddress);

router.route('/addresses/:id')
    .put(updateAddress)
    .delete(deleteAddress);

module.exports = router;
