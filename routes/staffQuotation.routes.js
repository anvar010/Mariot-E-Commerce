const express = require('express');
const {
    createStaffQuotation,
    getStaffQuotations,
    getStaffQuotation,
    updateStaffQuotation,
    deleteStaffQuotation,
    sendStaffQuotationEmail,
    getStaffQuotationEmails,
    reviewStaffQuotation,
    lookupCustomers,
    getCustomerProfile,
    matchCustomer,
    getBranches,
} = require('../controllers/staffQuotation.controller');
const { protect, authorize, authorizeAdminOrStaff } = require('../middlewares/auth.middleware');

const router = express.Router();

// Every route is back-office only. authorizeAdminOrStaff lets admins through
// unconditionally and staff through only when they hold the `staff_quotations`
// permission key — the same key that reveals the sidebar entry, so the menu and
// the API can never disagree about who may use this.
router.use(protect, authorizeAdminOrStaff('staff_quotations'));

router.route('/')
    .get(getStaffQuotations)
    .post(createStaffQuotation);

// MUST stay above '/:id' — Express matches in order, so a later ':id' route would
// otherwise swallow this path with id === 'customers'.
router.get('/customers', lookupCustomers);
// Likewise above '/:id'. '/customers/match' also has to precede '/customers/:id/profile',
// or 'match' is read as a customer id.
router.get('/customers/match', matchCustomer);
router.get('/customers/:id/profile', getCustomerProfile);
router.get('/branches', getBranches);

router.route('/:id')
    .get(getStaffQuotation)
    .put(updateStaffQuotation)
    .delete(deleteStaffQuotation);

router.post('/:id/send-email', sendStaffQuotationEmail);
// The send history, and the CC list last used, for the send dialog.
router.get('/:id/emails', getStaffQuotationEmails);

// Approving is an admin act. authorize('admin') runs after the router-level guard
// above, so staff reaching this route are refused even though they may use the rest.
router.patch('/:id/review', authorize('admin'), reviewStaffQuotation);

module.exports = router;
