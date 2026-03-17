import { MetadataRoute } from 'next';

const BASE_URL = 'https://mariotstore.com'; // Replace with your production domain

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api', '/profile'],
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
