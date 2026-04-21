import { MetadataRoute } from 'next';

const BASE_URL = 'https://mariotstore.com'; // Replace with your production domain
const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

    // Fetch dynamic products
    try {
        const res = await fetch(`${API_BASE_URL_SERVER}/products?limit=5000`, { cache: 'force-cache' });
        const data = await res.json();

        if (data.success && data.data && Array.isArray(data.data)) {
            const products = data.data;
            for (const locale of locales) {
                for (const product of products) {
                    const slug = product.slug || product.id;
                    sitemapEntries.push({
                        url: `${BASE_URL}/${locale}/product/${slug}`,
                        lastModified: new Date(product.updated_at || defaultLastMod),
                        changeFrequency: 'weekly',
                        priority: 0.6,
                    });
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch products for sitemap:', error);
        // Fail gracefully, static routes will still be returned
    }

    return sitemapEntries;
}
