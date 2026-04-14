import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['next-intl'],
    trailingSlash: false,
    poweredByHeader: false,
    images: {
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
                protocol: 'http',
                hostname: 'localhost',
                port: '5000',
                pathname: '/**',
            }
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'https://mariot-backend.onrender.com/api/v1/:path*',
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
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.tabby.ai https://cdn.jsdelivr.net https://accounts.google.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://checkout.tabby.ai",
                            "img-src 'self' data: blob: https://ui-avatars.com https://images.unsplash.com https://plus.unsplash.com https://via.placeholder.com https://www.rational-online.com https://mariotstore.com https://mariotgroup.com https://mariot-backend.onrender.com http://localhost:5000 https://www.gstatic.com https://*.googleusercontent.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "connect-src 'self' https://mariot-backend.onrender.com http://localhost:5000 https://api.stripe.com https://checkout.tabby.ai https://generativelanguage.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
                            "frame-src 'self' https://js.stripe.com https://checkout.tabby.ai https://accounts.google.com",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self'"
                        ].join('; ')
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
                    }
                ]
            }
        ];
    }
};

export default withNextIntl(nextConfig);
