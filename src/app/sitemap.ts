import { MetadataRoute } from 'next';

const BASE_URL = 'https://mariotstore.com'; // Replace with your production domain

export default function sitemap(): MetadataRoute.Sitemap {
    const defaultLastMod = new Date();
    const locales = ['en', 'ar'];

    // List of your static routes
    const staticRoutes = [
        '',
        '/shop',
        '/all-categories',
        '/today-offers',
        '/shop-by-brands',
        '/category/kitchen-equipment',
        '/category/coffee-makers',
        '/category/fryers',
        '/category/laundry',
        '/profile',
        '/cart',
        '/signin',
        '/signup'
    ];

    const sitemapEntries: MetadataRoute.Sitemap = [];

    // Generate localized URLs for each static route
    for (const locale of locales) {
        for (const route of staticRoutes) {
            sitemapEntries.push({
                url: `${BASE_URL}/${locale}${route}`,
                lastModified: defaultLastMod,
                changeFrequency: 'daily',
                priority: route === '' ? 1 : 0.8, // Priority 1 for Homepage, 0.8 for others
            });
        }
    }

    return sitemapEntries;
}
