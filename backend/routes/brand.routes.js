const express = require('express');
const { getBrands, getBrand, createBrand, updateBrand, deleteBrand } = require('../controllers/brand.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.route('/')
    .get(getBrands)
    .post(protect, authorize('admin'), createBrand);

router.route('/:slug')
    .get(getBrand);

router.route('/:id')
    .put(protect, authorize('admin'), updateBrand)
    .delete(protect, authorize('admin'), deleteBrand);

module.exports = router;
