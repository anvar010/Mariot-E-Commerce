const express = require('express'); // Backend Sync - 2026-03-26 v1.0.1
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const errorHandler = require('./middlewares/error.middleware');
const helmet = require('helmet');
const hpp = require('hpp');
const sanitize = require('./middlewares/sanitize.middleware');
const rateLimit = require('express-rate-limit');
// Load env vars. Resolved next to this file rather than via process.cwd(), so a deploy that
// starts node from a different working directory still finds .env (see server.js).
dotenv.config({ path: path.join(__dirname, '.env') });

// Route files
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const brandRoutes = require('./routes/brand.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentMethodRoutes = require('./routes/paymentMethod.routes');
const userRoutes = require('./routes/user.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const adminRoutes = require('./routes/admin.routes');
const sellerRoutes = require('./routes/seller.routes');
const couponRoutes = require('./routes/coupon.routes');
const uploadRoutes = require('./routes/upload.routes');
const reviewRoutes = require('./routes/review.routes');
const quotationRoutes = require('./routes/quotation.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const contactRoutes = require('./routes/contact.routes');
const cmsRoutes = require('./routes/cms.routes');
const settingsRoutes = require('./routes/settings.routes');
const verifyRoutes = require('./routes/verify.routes');
const shippingRoutes = require('./routes/shipping.routes');
const deliveryZoneRoutes = require('./routes/deliveryZone.routes');
const staffQuotationRoutes = require('./routes/staffQuotation.routes');

const cookieParser = require('cookie-parser');

const app = express();

// Trust proxy (required for Render, Heroku, etc. behind reverse proxy)
app.set('trust proxy', 1);


// Body parser with raw body support for Stripe webhooks
app.use(express.json({
    limit: '15mb', // large enough for base64-encoded invoice PDFs
    verify: (req, res, buf) => {
        if (req.originalUrl.startsWith('/api/v1/orders/webhook/stripe')) {
            req.rawBody = buf;
        }
    }
}));

// Set security headers with Content Security Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://connect.facebook.net",
                "https://js.stripe.com"
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://www.google-analytics.com",
                "https://www.facebook.com",
                "https://*.stripe.com",
                "https://lh3.googleusercontent.com",
                process.env.FRONTEND_URL || 'http://localhost:3000'
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            connectSrc: [
                "'self'",
                "https://www.google-analytics.com",
                "https://analytics.google.com",
                "https://www.facebook.com",
                "https://api.stripe.com",
                process.env.FRONTEND_URL || 'http://localhost:3000'
            ],
            frameSrc: ["'self'", "https://js.stripe.com", "https://www.facebook.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
}));

// Prevent HTTP param pollution
app.use(hpp());

// Enable CORS. The allowlist lives in config/allowedOrigins so the media hotlink guard below
// can enforce the same set of sites; add a domain there (or via ALLOWED_ORIGINS) and both
// rules pick it up.
const { isAllowedOrigin } = require('./config/allowedOrigins');

// Vary: Origin, on every response, BEFORE cors runs.
//
// The CORS answer differs per origin: a browser request gets
// Access-Control-Allow-Origin, an origin-less one (server-side fetch, curl, an
// uptime monitor) gets none. Hostinger's CDN sits in front of this API and, with
// no Vary: Origin, keeps a single cached copy for both. When the copy it stored
// came from an origin-less request, browsers are served a response with no
// Access-Control-Allow-Origin and every fetch fails with "No
// 'Access-Control-Allow-Origin' header is present" — intermittently, depending on
// which request populated the cache.
//
// Same reasoning as the Vary: Referer on the media guard below; the API routes
// simply never got the equivalent. res.vary() appends rather than replaces, so
// Accept-Encoding and anything cors adds are preserved.
app.use((req, res, next) => {
    res.vary('Origin');
    next();
});

// And do not let a shared cache hold API responses at all.
//
// /api/v1 responses sent no Cache-Control whatsoever, which leaves a CDN free to
// cache them heuristically. That is wrong twice over: the CORS headers differ per
// origin (see above), and the bodies differ per USER — a cached /users/me or
// /cart could be handed to somebody else entirely. Vary only asks a cache to
// behave; no-store settles it.
//
// Static media under /uploads is unaffected and still cached for a year.
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin || isAllowedOrigin(origin)) {
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
    // Raised from 1000. A single admin page fires many API calls, and staff behind
    // one office IP consume this collectively; it is a blanket abuse ceiling, not a
    // per-user quota.
    max: 3000, // per IP per 15 minutes
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// ── RATE LIMITING DISABLED ────────────────────────────────────────────────────
// Turned off at the owner's request. The limiter above is left defined but is no
// longer mounted; uncomment this line to restore the blanket ceiling on /api.
//
// WARNING: with this off there is no global cap on requests per IP, so nothing
// throttles scraping or a runaway client hammering the API.
// app.use('/api', globalLimiter);

// ── RATE LIMITING DISABLED ────────────────────────────────────────────────────
// Turned off at the owner's request. A passthrough keeps every call site working
// unchanged; to restore protection, delete the passthrough and uncomment the
// original definition below it.
//
// WARNING: with this off there is no server-side ceiling on repeated requests to
// the auth routes — login, registration and password reset. On a public
// storefront that leaves credential stuffing and password guessing unthrottled.
const authLimiter = (req, res, next) => next();

/* original definition, kept for restoring:
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 login/register requests per 15 minutes
    message: { success: false, message: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
*/

// Cookie parser
app.use(cookieParser());

// XSS Sanitization (custom middleware, replaces xss-clean for Express 5 compatibility)
app.use(sanitize);


// Serve static files from uploads directory with cross-origin policy, and refuse hotlinks.
//
// CORS does not cover this: browsers never apply it to <img src>, so without a Referer check
// any site can embed our media and spend our bandwidth. A request with NO Referer is allowed
// on purpose -- next/image fetches these server-side with no Referer, as do link previews
// (WhatsApp/Facebook), Google Images, and anyone opening an image URL directly. Only a request
// that openly names a site we do not allow is refused.
//
// Vary: Referer keeps the CDN from caching one visitor's answer for everyone: without it a
// hotlinker's 403 could be served to our own shoppers, or vice versa.
const { isAllowedReferer } = require('./config/allowedOrigins');

app.use(['/uploads', '/product_images'], (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Vary', 'Referer');

    const referer = req.get('referer');
    if (referer && !isAllowedReferer(referer)) {
        console.warn(`[hotlink] Refused ${req.originalUrl} for referer: ${referer}`);
        // Explicitly never let a refusal be cached. The Vary: Referer above is meant to
        // keep one visitor's answer from being served to another, but Hostinger's CDN
        // strips Vary from these responses — and the allowed answer is cached for a
        // year. Without this a single hotlinker's 403 can occupy the cache entry for an
        // image and be handed to our own shoppers, whose <img> then fails: brand logos
        // silently degrade to the brand name in text on the product cards.
        res.setHeader('Cache-Control', 'no-store');
        return res.status(403).json({ success: false, message: 'Hotlinking is not allowed.' });
    }

    next();
});
// Uploads live OUTSIDE the project so they survive code updates/redeploys; config/uploadsDir
// works out where that is (see the comment there) and is the same value the upload middleware
// writes to.
const uploadsPath = require('./config/uploadsDir');
// Uploaded filenames are content-unique (Date.now()+random, and sharp rewrites to .webp), so a
// given URL never changes contents and is safe to cache indefinitely. express.static defaults to
// max-age=0, which made Hostinger's CDN revalidate every product image on every page view.
const uploadsStatic = { maxAge: '1y', immutable: true, etag: true };
app.use('/uploads', express.static(uploadsPath, uploadsStatic));
app.use('/product_images', express.static(uploadsPath, uploadsStatic));

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
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/quotations', quotationRoutes);
app.use('/api/v1/staff-quotations', staffQuotationRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
// app.use('/api/v1/contact', contactRoutes); // Moved up with limiter
app.use('/api/v1/cms', cmsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/v1/delivery-zones', deliveryZoneRoutes);
app.use('/api/v1/verify', verifyRoutes);

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
