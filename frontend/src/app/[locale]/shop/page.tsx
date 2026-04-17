import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import Loader from '@/components/shared/Loader/Loader';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
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

        // Build brands URL
        const brandsUrl = category
            ? `${API_BASE_URL_SERVER}/brands?category=${category}`
            : `${API_BASE_URL_SERVER}/brands`;

        // 1. Fetch data in parallel
        const [productsRes, brandsRes, categoriesRes] = await Promise.all([
            fetch(productUrl, { next: { revalidate: 60 } }),
            fetch(brandsUrl, { next: { revalidate: 3600 } }),
            fetch(`${API_BASE_URL_SERVER}/categories`, { next: { revalidate: 3600 } })
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

export default async function ShopPage({ params: { locale }, searchParams }: { params: { locale: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
    const data = await getShopData(locale, searchParams);

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
