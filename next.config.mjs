import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Lets a verification build write somewhere a running dev server is not
    // already using; .next is shared between next dev and next build and they
    // corrupt each other.
    distDir: process.env.NEXT_DIST_DIR || '.next',
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
                            "img-src 'self' data: blob: https://ui-avatars.com https://flagcdn.com https://images.unsplash.com https://plus.unsplash.com https://via.placeholder.com https://www.rational-online.com https://mariotstore.com https://api.mariotstore.com https://mariotgroup.com https://mariot-backend.onrender.com http://localhost:5000 https://www.gstatic.com https://*.googleusercontent.com https://*.tabby.ai https://*.pinterest.com https://*.pinimg.com https://i.ytimg.com https://img.youtube.com",
                            "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com https://*.tabby.ai",
                            "connect-src 'self' https://mariot-backend.onrender.com https://api.mariotstore.com http://localhost:5000 https://api.stripe.com https://*.tabby.ai https://generativelanguage.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
                            "frame-src 'self' https://js.stripe.com https://*.tabby.ai https://accounts.google.com https://www.youtube.com https://youtube.com https://www.google.com https://maps.google.com",
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
