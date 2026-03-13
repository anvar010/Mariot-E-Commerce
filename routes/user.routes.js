const express = require('express');
const { getProfile, getAddresses, addAddress, deleteAddress, updateAddress } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.route('/addresses')
    .get(getAddresses)
    .post(addAddress);

router.route('/addresses/:id')
    .put(updateAddress)
    .delete(deleteAddress);

module.exports = router;
