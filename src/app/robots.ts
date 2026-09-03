import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin',
                '/*/admin',
                '/*/admin/*',
                '/api',
                '/*/api/*',
                '/*/profile',
                '/*/profile/*',
                '/*/cart',
                '/*/checkout',
                '/*/checkout/*',
                '/*/checkoutsuccess',
                '/*/signin',
                '/*/signup',
                '/*/forgot-password',
                '/*/reset-password',
                '/*/sellerDashboard',
                '/*/sellerDashboard/*',
            ],
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
