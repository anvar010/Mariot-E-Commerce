const express = require('express');
const {
    getDashboardStats,
    getAllUsers,
    updateUser,
    deleteUser,
    toggleUserStatus,
    adjustUserPoints,
    getAllOrders,
    updateHomepageCMS,
    getHeroSlides,
    addHeroSlide,
    updateHeroSlide,
    deleteHeroSlide,
    getHeroPosters,
    addHeroPoster,
    updateHeroPoster,
    deleteHeroPoster,
    exportProducts,
    exportOrders,
    getRoles
} = require('../controllers/admin.controller');
const { getAllReviews } = require('../controllers/review.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes here need protection
router.use(protect);

router.get('/stats', authorize('admin'), getDashboardStats);
router.get('/roles', authorize('admin'), getRoles);

router.route('/users')
    .get(authorize('admin'), getAllUsers);

router.route('/users/:id')
    .put(authorize('admin'), updateUser)
    .delete(authorize('admin'), deleteUser);

router.patch('/users/:id/status', authorize('admin'), toggleUserStatus);
router.post('/users/:id/points', authorize('admin'), adjustUserPoints);

router.route('/orders')
    .get(authorize('admin'), getAllOrders);

router.route('/cms/homepage')
    .put(authorize('admin'), updateHomepageCMS);

router.route('/cms/hero-slides')
    .get(authorize('admin'), getHeroSlides)
    .post(authorize('admin'), addHeroSlide);

router.route('/cms/hero-slides/:id')
    .put(authorize('admin'), updateHeroSlide)
    .delete(authorize('admin'), deleteHeroSlide);

router.route('/cms/hero-posters')
    .get(authorize('admin'), getHeroPosters)
    .post(authorize('admin'), addHeroPoster);

router.route('/cms/hero-posters/:id')
    .put(authorize('admin'), updateHeroPoster)
    .delete(authorize('admin'), deleteHeroPoster);

router.get('/export/products', authorize('admin'), exportProducts);
router.get('/export/orders', authorize('admin'), exportOrders);

router.route('/reviews')
    .get(authorize('admin'), getAllReviews);

module.exports = router;
