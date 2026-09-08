const express = require('express');
const {
    createQuoteRequest, getMyQuotes, getQuote, getAllQuotes, setQuotePrice, respondToQuote,
} = require('../controllers/shippingQuote.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Every route needs a signed-in customer. A quote is tied to a person: they have to be able
// to come back to it, and only they can accept it.
router.use(protect);

router.post('/', createQuoteRequest);
router.get('/my', getMyQuotes);

// Admin listing sits above /:id so "all" is never read as an id.
router.get('/all', authorize('admin'), getAllQuotes);

router.get('/:id', getQuote);
// Pricing is the shop's side of the conversation; accepting is the customer's.
router.put('/:id/price', authorize('admin'), setQuotePrice);
router.post('/:id/respond', respondToQuote);

module.exports = router;
