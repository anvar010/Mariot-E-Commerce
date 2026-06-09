import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import TodayOffersPage from '@/components/Offers/TodayOffersPage';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import Loader from '@/components/shared/Loader/Loader';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;

    const {
        locale
    } = params;

    const isArabic = locale === 'ar';
    return {
        title: isArabic ? 'تسوق معدات المطابخ الفاخرة | ماريوت' : 'Shop Premium Kitchen Equipment | Mariot Store',
        description: isArabic ? 'تصفح الكتالوج الكامل لمعدات المطابخ التجارية، وآلات القهوة، وعروض التبريد.' : 'Browse our full catalog of commercial kitchen equipment, coffee machines, bakery tools, and refrigeration units. Quality equipment for professionals.',
        openGraph: {
            title: isArabic ? 'تسوق معدات المطابخ الفاخرة | ماريوت' : 'Shop Premium Kitchen Equipment | Mariot Store',
            description: isArabic ? 'تصفح الكتالوج الكامل لمعدات المطابخ التجارية، وآلات القهوة، وعروض التبريد.' : 'Browse our full catalog of commercial kitchen equipment, coffee machines, bakery tools, and refrigeration units. Quality equipment for professionals.',
            url: `https://mariotstore.com/${locale}/shop`,
            type: 'website',
        }
    };
}

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

async function getShopData(locale: string, searchParams: { [key: string]: string | string[] | undefined }) {
    const category = searchParams.category as string | undefined;
    const brand = searchParams.brand as string | undefined;
    const seller = searchParams.seller as string | undefined;
    const search = searchParams.search as string | undefined;
    const limited = searchParams.limited as string | undefined;
    const weekly = searchParams.weekly as string | undefined;
    const page = searchParams.page as string | undefined;
    const pageNum = page ? parseInt(page) : 1;

    try {
        // Build product URL
        let productUrl = `${API_BASE_URL_SERVER}/products?page=${pageNum}&limit=24`;
        if (category) productUrl += `&category=${category}`;
        if (brand) productUrl += `&brand=${brand}`;
        if (seller) productUrl += `&seller=${seller}`;
        if (search) productUrl += `&search=${encodeURIComponent(search)}`;
        if (limited) productUrl += `&is_limited_offer=true`;
        if (weekly) productUrl += `&is_weekly_deal=true`;

        // Build brands URL
        const bParams = new URLSearchParams();
        if (category) bParams.set('category', category);
        if (search) bParams.set('search', search);
        if (limited) bParams.set('is_limited', 'true');
        if (weekly) bParams.set('is_weekly', 'true');
        if (seller) bParams.set('seller', seller);
        const brandsUrl = `${API_BASE_URL_SERVER}/brands?${bParams.toString()}`;

        // Categories URL — filter to offer types when applicable
        const cParams = new URLSearchParams();
        if (limited) cParams.set('is_limited', 'true');
        if (weekly) cParams.set('is_weekly', 'true');
        if (search) cParams.set('search', search);
        const categoriesUrl = `${API_BASE_URL_SERVER}/categories${cParams.toString() ? `?${cParams.toString()}` : ''}`;

        // Offer-filtered fetches depend on offer_end > NOW(), so they must not be cached.
        const isOffer = !!(limited || weekly);
        const productOpts: RequestInit & { next?: any } = isOffer ? { cache: 'no-store' } : { next: { revalidate: 60 } };
        const brandOpts: RequestInit & { next?: any } = isOffer ? { cache: 'no-store' } : { next: { revalidate: 3600 } };
        const categoryOpts: RequestInit & { next?: any } = isOffer ? { cache: 'no-store' } : { next: { revalidate: 3600 } };

        // 1. Fetch data in parallel
        const [productsRes, brandsRes, categoriesRes] = await Promise.all([
            fetch(productUrl, productOpts),
            fetch(brandsUrl, brandOpts),
            fetch(categoriesUrl, categoryOpts)
        ]);

        const productsData = await productsRes.json();
        const brandsData = await brandsRes.json();
        const categoriesData = await categoriesRes.json();

        const allFetchedCategories = categoriesData.success ? categoriesData.data : [];

        return {
            products: productsData.success ? productsData.data : [],
            brands: brandsData.success ? brandsData.data.filter((b: any) => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1') : [],
            total: productsData.success ? productsData.total : 0,
            allCategories: allFetchedCategories
        };
    } catch (e) {
        console.error("Shop server fetch failed", e);
        return { products: [], brands: [], total: 0, allCategories: [] };
    }
}

export default async function ShopPage(
    props: { params: Promise<{ locale: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
    const searchParams = await props.searchParams;
    const params = await props.params;

    const {
        locale
    } = params;

    const data = await getShopData(locale, searchParams);

    const search = searchParams.search as string | undefined;
    if (search && data.total === 1 && data.products.length === 1 && data.products[0].slug) {
        redirect(`/${locale}/product/${data.products[0].slug}`);
    }

    // Weekly deals view reuses the Today Offers layout (banner + ticker + offer grid).
    const isWeekly = !!searchParams.weekly;
    if (isWeekly) {
        return (
            <>
                <Header />
                <main>
                    <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>}>
                        <TodayOffersPage
                            dealType="weekly"
                            initialProducts={data.products}
                            initialBrands={data.brands}
                            initialCategories={data.allCategories}
                        />
                    </Suspense>
                </main>
                <Footer />
                <FloatingActions />
            </>
        );
    }

    return (
        <main>
            <Header />
            <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>}>
                <ShopLayout
                    initialProducts={data.products}
                    initialBrands={data.brands}
                    initialTotal={data.total}
                    initialCategories={data.allCategories}
                />
            </Suspense>
            <Footer />
        </main>
    );
}
