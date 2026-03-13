import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ['lucide-react', 'framer-motion'],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'plus.unsplash.com'
            },
            {
                protocol: 'https',
                hostname: 'www.rational-online.com'
            },
            {
                protocol: 'http',
                hostname: 'example.com',
            },
            {
                protocol: 'https',
                hostname: 'via.placeholder.com',
            },
            {
                protocol: 'https',
                hostname: 'mariotstore.com',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '5000',
                pathname: '/uploads/**',
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                port: '5000',
                pathname: '/uploads/**',
            },
            {
                protocol: 'http',
                hostname: '192.168.0.117',
                port: '5000',
                pathname: '/uploads/**',
            },
            {
                protocol: 'http',
                hostname: '192.168.0.100',
                port: '5000',
                pathname: '/uploads/**',
            }
        ],
    },
};

export default withNextIntl(nextConfig);
