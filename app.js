const express = require('express'); // Backend Sync - 2026-03-26 v1.0.1
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const errorHandler = require('./middlewares/error.middleware');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
// Load env vars
dotenv.config();

// Route files
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const brandRoutes = require('./routes/brand.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const adminRoutes = require('./routes/admin.routes');
const sellerRoutes = require('./routes/seller.routes');
const couponRoutes = require('./routes/coupon.routes');
const uploadRoutes = require('./routes/upload.routes');
const reviewRoutes = require('./routes/review.routes');
const quotationRoutes = require('./routes/quotation.routes');
const contactRoutes = require('./routes/contact.routes');
const cmsRoutes = require('./routes/cms.routes');
const settingsRoutes = require('./routes/settings.routes');
const path = require('path');

const cookieParser = require('cookie-parser');

const app = express();

// Trust proxy (required for Render, Heroku, etc. behind reverse proxy)
app.set('trust proxy', 1);


// Body parser with raw body support for Stripe webhooks
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl.startsWith('/api/v1/orders/webhook/stripe')) {
            req.rawBody = buf;
        }
    }
}));

// Set security headers
app.use(helmet());

// Prevent HTTP param pollution
app.use(hpp());

// Enable CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.0.100:3000',
    process.env.FRONTEND_URL
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Global Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Specific Rate Limiter for sensitive routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login/register requests per hour
    message: { success: false, message: 'Too many authentication attempts, please try again after an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Cookie parser
app.use(cookieParser());

// Temporarily disable XSS for Express 5 compatibility investigation
// app.use(xss()); 


// Serve static files from uploads directory with cross-origin policy
app.use(['/uploads', '/product_images'], (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/product_images', express.static(path.join(__dirname, 'uploads')));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Mount routers
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/contact', authLimiter, contactRoutes); // Also limit contact form
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/quotations', quotationRoutes);
// app.use('/api/v1/contact', contactRoutes); // Moved up with limiter
app.use('/api/v1/cms', cmsRoutes);
app.use('/api/v1/settings', settingsRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to MARIOT B2B API' });
});

app.use((req, res, next) => {
    console.log(`404: METHOD ${req.method} URL ${req.originalUrl}`);
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
