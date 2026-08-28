const express = require('express');
const {
    listPaymentMethods,
    createSetupIntent,
    confirmSetup,
    updatePaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
} = require('../controllers/paymentMethod.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Saved cards belong to one account; there is no guest or public view of them.
router.use(protect);

router.get('/', listPaymentMethods);
router.post('/setup-intent', createSetupIntent);
router.post('/confirm', confirmSetup);

router.put('/:id/default', setDefaultPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.delete('/:id', deletePaymentMethod);

module.exports = router;
