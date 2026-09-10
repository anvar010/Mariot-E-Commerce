import { API_BASE_URL } from '@/config';

/**
 * Everything a category landing page shows, gathered on the server.
 *
 * This is the same sequence CategoryLanding used to run in a useEffect after mounting. Doing
 * it here instead means the page arrives complete: no spinner, no 60vh gap that collapses
 * when the data lands, and -- the reason this moved -- the subcategory cards and product
 * links are in the HTML a crawler receives rather than being built afterwards by JavaScript.
 *
 * Every fetch is revalidated hourly. A catalogue changes a few times a day, and a category
 * page should not make a shopper wait on six API calls to see anything.
 */

const REVALIDATE = { next: { revalidate: 3600 } } as const;

/** Categories are ordered by an explicit column when present, else by name. */
const sortByOrderIndex = (arr: any[]): any[] =>
    [...arr].sort((a, b) => {
        const ao = a.order_index ?? a.display_order ?? null;
        const bo = b.order_index ?? b.display_order ?? null;
        if (ao != null && bo != null) return Number(ao) - Number(bo);
        if (ao != null) return -1;
        if (bo != null) return 1;
        return String(a.name || '').localeCompare(String(b.name || ''));
    });

const slugOf = (c: any): string =>
    c.slug || String(c.name || '').toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');

const getJson = async (url: string): Promise<any> => {
    const res = await fetch(url, REVALIDATE);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
};

export interface CategoryLandingData {
    category: any | null;
    subCategories: any[];
    topProducts: any[];
    promoProduct: any | null;
    brands: any[];
    /** True when the data could not be loaded; the component renders its error state. */
    failed: boolean;
}

const EMPTY: CategoryLandingData = {
    category: null, subCategories: [], topProducts: [], promoProduct: null, brands: [], failed: true,
};

/**
 * The "Kitchen Equipments" page has no row of its own in the database: it aggregates every
 * main category except the non-kitchen departments, each with its own subcategories.
 */
const KITCHEN_EXCLUDE = new Set(['kitchen-equipment', 'stainless-steel-fabrications', 'supermarket', 'laundry']);

export async function getCategoryLandingData(categorySlug: string): Promise<CategoryLandingData> {
    try {
        const catData = await getJson(`${API_BASE_URL}/categories`);
        if (!catData?.success) return EMPTY;
        const allCats: any[] = catData.data || [];

        if (categorySlug === 'kitchen-equipment') {
            const mains = sortByOrderIndex(
                allCats.filter(c => !c.parent_id && c.is_active && !KITCHEN_EXCLUDE.has(c.slug)),
            ).map(main => ({
                ...main,
                subCategories: sortByOrderIndex(allCats.filter(s => s.parent_id === main.id && s.is_active))
                    .map(sub => ({
                        ...sub,
                        subCategories: sortByOrderIndex(allCats.filter(ss => ss.parent_id === sub.id && ss.is_active)),
                    })),
            }));

            // Each heading section shows a few products from its own category.
            const mainsWithProducts = await Promise.all(mains.map(async (m: any) => {
                try {
                    const p = await getJson(`${API_BASE_URL}/products?category=${slugOf(m)}&limit=5&sort=price_desc`);
                    return { ...m, products: p?.success ? (p.data || []) : [] };
                } catch {
                    return { ...m, products: [] };
                }
            }));

            return {
                category: {
                    name: 'Kitchen Equipments',
                    name_ar: 'معدات المطبخ',
                    description: 'Explore our full range of commercial kitchen equipment — from coffee machines and refrigeration to cooking lines, ovens, and food preparation. Browse every category below.',
                    description_ar: 'استكشف مجموعتنا الكاملة من معدات المطابخ التجارية — من ماكينات القهوة والتبريد إلى خطوط الطهي والأفران وتحضير الطعام. تصفّح جميع الفئات أدناه.',
                },
                subCategories: mainsWithProducts,
                topProducts: [], promoProduct: null, brands: [], failed: false,
            };
        }

        const activeCat = allCats.find(c => c.slug === categorySlug);
        if (!activeCat) return { ...EMPTY, failed: false };

        const subs = sortByOrderIndex(allCats.filter(c => c.parent_id === activeCat.id && c.is_active))
            .map(sub => ({
                ...sub,
                subCategories: sortByOrderIndex(allCats.filter(ss => ss.parent_id === sub.id && ss.is_active)),
            }));

        // Counts, top products and brands are independent of each other, so they go together.
        const [subsWithCounts, prodData, brandData] = await Promise.all([
            Promise.all(subs.map(async (sub: any) => {
                try {
                    const p = await getJson(`${API_BASE_URL}/products?category=${slugOf(sub)}&limit=1`);
                    return { ...sub, products_count: p?.total || 0 };
                } catch {
                    return { ...sub, products_count: 0 };
                }
            })),
            getJson(`${API_BASE_URL}/products?category=${categorySlug}&limit=5&sort=price_desc`).catch(() => null),
            getJson(`${API_BASE_URL}/brands?all=1`).catch(() => null),
        ]);

        const products: any[] = prodData?.success ? (prodData.data || []) : [];
        const brandIds: number[] = activeCat.brand_ids || [];

        return {
            category: activeCat,
            subCategories: subsWithCounts,
            // The first product is featured; the next four fill the row beside it.
            promoProduct: products.length > 0 ? products[0] : null,
            topProducts: products.slice(1, 5),
            brands: brandData?.success ? (brandData.data || []).filter((b: any) => brandIds.includes(b.id)) : [],
            failed: false,
        };
    } catch (err) {
        console.error('[category] Could not load landing data:', err);
        return EMPTY;
    }
}
