import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['next-intl'],
    trailingSlash: false,
    poweredByHeader: false,
    // Tree-shake large icon/util barrels so only the icons actually used are
    // bundled (Header alone imports ~35 lucide icons). No behavioural change.
    experimental: {
        optimizePackageImports: ['lucide-react'],
    },
    images: {
        // Serve AVIF/WebP when the browser supports it (smaller than JPEG/PNG),
        // and keep optimized images cached at the edge for a day.
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 86400,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'plus.unsplash.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'via.placeholder.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'www.rational-online.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'mariotstore.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.mariotstore.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'mariotgroup.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'mariot-backend.onrender.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'mariot-api.onrender.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'mariot-ae.onrender.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.pinterest.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.pinimg.com',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '5000',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i.ytimg.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'flagcdn.com',
                pathname: '/**',
            }
        ],
    },
    // Silence the benign webpack persistent-cache warning emitted while parsing
    // next-intl's ESM dynamic import (`import(t)`). It's an infrastructure-level
    // log, not a build error — real errors/warnings are unaffected.
    webpack: (config) => {
        config.infrastructureLogging = { ...config.infrastructureLogging, level: 'error' };
        return config;
    },
    async redirects() {
        return [
            // 1. Static Pages & Content Migrations
            { source: '/about-us', destination: '/en/about', permanent: true },
            { source: '/:locale(en|ar)/about-us', destination: '/:locale/about', permanent: true },
            { source: '/contact-us', destination: '/en/contact', permanent: true },
            { source: '/:locale(en|ar)/contact-us', destination: '/:locale/contact', permanent: true },
            { source: '/my-account', destination: '/en/profile', permanent: true },
            { source: '/my-account-2', destination: '/en/profile', permanent: true },
            { source: '/my-account/:path*', destination: '/en/profile', permanent: true },
            { source: '/:locale(en|ar)/my-account/:path*', destination: '/:locale/profile', permanent: true },
            { source: '/registration', destination: '/en/signup', permanent: true },
            { source: '/:locale(en|ar)/registration', destination: '/:locale/signup', permanent: true },
            { source: '/wishlist', destination: '/en/profile', permanent: true },
            { source: '/:locale(en|ar)/wishlist', destination: '/:locale/profile', permanent: true },
            { source: '/request-quote', destination: '/en/contact', permanent: true },
            // Both of these were broad WordPress landing pages, and there is no single
            // category that answers them: "kitchen-equipment" is not a category at all
            // (0 products), so pointing here rendered an empty page under a 200 -- a soft
            // 404, which Google indexes as real and then finds nothing on. /shop lists
            // actual products, which is also what somebody arriving from that search wants.
            { source: '/kitchen-equipment-in-dubai', destination: '/en/shop', permanent: true },
            { source: '/kitchen-ware', destination: '/en/shop', permanent: true },
            { source: '/:locale(en|ar)/kitchen-ware', destination: '/:locale/shop', permanent: true },
            // laundry is a real category with products, so this one resolves properly.
            { source: '/laundry-equipment', destination: '/en/category/laundry', permanent: true },
            { source: '/super-market', destination: '/en/shop', permanent: true },
            { source: '/faq', destination: '/en/about', permanent: true },
            { source: '/news-best-kitchen-equipments-in-dubai', destination: '/en/about', permanent: true },

            // 2. Policy Pages
            { source: '/terms-of-service', destination: '/en/terms-and-conditions', permanent: true },
            { source: '/terms', destination: '/en/terms-and-conditions', permanent: true },
            { source: '/refund-policy', destination: '/en/return-policy', permanent: true },
            { source: '/refund_returns', destination: '/en/return-policy', permanent: true },
            { source: '/shipping-policy', destination: '/en/shipping-details', permanent: true },
            { source: '/shipping', destination: '/en/shipping-details', permanent: true },

            // 3. WooCommerce Brands -> Next.js Brand Filter
            { source: '/brand/:slug', destination: '/en/shop?brand=:slug', permanent: true },
            { source: '/:locale(en|ar)/brand/:slug', destination: '/:locale/shop?brand=:slug', permanent: true },

            // 4. WooCommerce Tags -> Next.js Shop
            { source: '/product-tag/:slug*', destination: '/en/shop', permanent: true },
            { source: '/:locale(en|ar)/product-tag/:slug*', destination: '/:locale/shop', permanent: true },

            // 4b. Pagination. MUST stay above sections 5 and 6.
            //
            // Those rules end in :slug, so "/shop/page/2" matched with cat1="page" and
            // slug="2" and redirected to /en/product/2 -- a page that answers 200 with the
            // title "2 | Mariot Store". A soft 404 is worse than a plain one: Google
            // indexes it as a real page. WordPress paginated the shop to at least page 20
            // and every category on top of that, so this was hundreds of URLs.
            //
            // The literal "page" segment is what discriminates, so :n needs no pattern of
            // its own -- and a regex here is a trap: written as :n(\d+) in this file it
            // reaches path-to-regexp as (d+), which matches the letter d and nothing else.
            { source: '/shop/page/:n', destination: '/en/shop', permanent: true },
            { source: '/shop/:cat1/page/:n', destination: '/en/shop', permanent: true },
            { source: '/shop/:cat1/:cat2/page/:n', destination: '/en/shop', permanent: true },
            { source: '/shop/:cat1/:cat2/:cat3/page/:n', destination: '/en/shop', permanent: true },
            { source: '/:locale(en|ar)/shop/page/:n', destination: '/:locale/shop', permanent: true },
            { source: '/:locale(en|ar)/shop/:cat1/page/:n', destination: '/:locale/shop', permanent: true },
            { source: '/:locale(en|ar)/shop/:cat1/:cat2/page/:n', destination: '/:locale/shop', permanent: true },
            { source: '/:locale(en|ar)/shop/:cat1/:cat2/:cat3/page/:n', destination: '/:locale/shop', permanent: true },
            // The deepest category segment is the one that survived into the new site, so
            // paginated category pages land on that category rather than the whole shop.
            { source: '/product-category/:cat1/page/:n', destination: '/en/category/:cat1', permanent: true },
            { source: '/product-category/:cat1/:cat2/page/:n', destination: '/en/category/:cat2', permanent: true },
            { source: '/product-category/:cat1/:cat2/:cat3/page/:n', destination: '/en/category/:cat3', permanent: true },
            { source: '/:locale(en|ar)/product-category/:cat1/page/:n', destination: '/:locale/category/:cat1', permanent: true },
            { source: '/:locale(en|ar)/product-category/:cat1/:cat2/page/:n', destination: '/:locale/category/:cat2', permanent: true },
            { source: '/:locale(en|ar)/product-category/:cat1/:cat2/:cat3/page/:n', destination: '/:locale/category/:cat3', permanent: true },

            // 5. WooCommerce Categories (1, 2, or 3 levels) -> Next.js Category
            { source: '/product-category/:cat1/:cat2/:slug', destination: '/en/category/:slug', permanent: true },
            { source: '/product-category/:cat1/:slug', destination: '/en/category/:slug', permanent: true },
            { source: '/product-category/:slug', destination: '/en/category/:slug', permanent: true },
            { source: '/:locale(en|ar)/product-category/:cat1/:cat2/:slug', destination: '/:locale/category/:slug', permanent: true },
            { source: '/:locale(en|ar)/product-category/:cat1/:slug', destination: '/:locale/category/:slug', permanent: true },
            { source: '/:locale(en|ar)/product-category/:slug', destination: '/:locale/category/:slug', permanent: true },

            // 6. WooCommerce Products under /shop/ (nested categories) -> Next.js Product Detail
            // Example: /shop/coffee-bar-line/slush-machine/slush-machine-oasis-2-10-std/ -> /en/product/slush-machine-oasis-2-10-std
            { source: '/shop/:cat1/:cat2/:cat3/:slug', destination: '/en/product/:slug', permanent: true },
            { source: '/shop/:cat1/:cat2/:slug', destination: '/en/product/:slug', permanent: true },
            { source: '/shop/:cat1/:slug', destination: '/en/product/:slug', permanent: true },
            { source: '/:locale(en|ar)/shop/:cat1/:cat2/:cat3/:slug', destination: '/:locale/product/:slug', permanent: true },
            { source: '/:locale(en|ar)/shop/:cat1/:cat2/:slug', destination: '/:locale/product/:slug', permanent: true },
            { source: '/:locale(en|ar)/shop/:cat1/:slug', destination: '/:locale/product/:slug', permanent: true },

            // 7. Direct /product/:slug when requested without locale
            { source: '/product/:slug', destination: '/en/product/:slug', permanent: true },

            // 8. Old WordPress & Rank Math Sitemaps -> Next.js Sitemap
            { source: '/sitemap_index.xml', destination: '/sitemap.xml', permanent: true },
            { source: '/wp-sitemap.xml', destination: '/sitemap.xml', permanent: true },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'https://api.mariotstore.com/api/v1/:path*',
            },
            {
                source: '/uploads/:path*',
                destination: 'https://api.mariotstore.com/uploads/:path*',
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.tabby.ai https://cdn.jsdelivr.net https://accounts.google.com https://www.youtube.com https://s.ytimg.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tabby.ai",
                            "img-src 'self' data: blob: https://ui-avatars.com https://upload.wikimedia.org https://flagcdn.com https://images.unsplash.com https://plus.unsplash.com https://via.placeholder.com https://www.rational-online.com https://mariotstore.com https://api.mariotstore.com https://mariotgroup.com https://mariot-backend.onrender.com http://localhost:5000 https://www.gstatic.com https://*.googleusercontent.com https://*.tabby.ai https://*.pinterest.com https://*.pinimg.com https://i.ytimg.com https://img.youtube.com",
                            "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com https://*.tabby.ai",
                            "connect-src 'self' https://mariot-backend.onrender.com https://api.mariotstore.com http://localhost:5000 https://api.stripe.com https://*.tabby.ai https://generativelanguage.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
                            "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.tabby.ai https://accounts.google.com https://www.youtube.com https://youtube.com https://www.google.com https://maps.google.com",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self'"
                        ].join('; ')
                    },
                    {
                        key: 'Permissions-Policy',
                        // autoplay, encrypted-media, picture-in-picture and fullscreen
                        // all default to an allowlist of "self", which excludes a
                        // cross-origin frame. The product video's iframe asks for them
                        // through its allow attribute, but a frame cannot grant itself
                        // what the containing document has not delegated — hence
                        // "Permissions policy violation: picture-in-picture is not
                        // allowed in this document" in the console, and an autoplay=1
                        // embed that opens paused. Delegated to YouTube only.
                        value: [
                            'camera=()',
                            'microphone=()',
                            'geolocation=(self)',
                            'interest-cohort=()',
                            // Apple Pay and Google Pay run through the Payment Request API,
                            // which this directive gates. Stripe draws the wallet button in a
                            // js.stripe.com iframe, so without delegating `payment` to that
                            // origin the frame is denied the API and renders nothing at all --
                            // no button, no error. Exactly the YouTube problem described above,
                            // and the reason the wallets disappeared.
                            'payment=(self "https://js.stripe.com")',
                            // Both spellings: the Related Videos accordion builds its own
                            // embed URLs and still emits the bare youtube.com origin.
                            'autoplay=(self "https://www.youtube.com" "https://youtube.com")',
                            'encrypted-media=(self "https://www.youtube.com" "https://youtube.com")',
                            'picture-in-picture=(self "https://www.youtube.com" "https://youtube.com")',
                            'fullscreen=(self "https://www.youtube.com" "https://youtube.com")',
                        ].join(', ')
                    }
                ]
            }
        ];
    }
};

export default withNextIntl(nextConfig);
