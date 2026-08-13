import React, { Suspense } from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import TodayOffersPage from '@/components/Offers/TodayOffersPage';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;

    const {
        locale
    } = params;

    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/today-offers',
        title: isArabic
            ? 'عروض اليوم على معدات المطابخ التجارية | ماريوت'
            : "Today's Offers on Commercial Kitchen Equipment | Mariot",
        description: isArabic
            ? 'خصومات محدودة المدة على آلات الإسبريسو الاحترافية وأفران المطاعم والمقالي ومعدات التبريد. تسوق عروض اليوم من ماريوت قبل انتهائها.'
            : 'Limited-time discounts on professional espresso machines, commercial ovens, fryers and refrigeration. Shop today\'s Mariot deals before they expire.',
        ogTitle: isArabic ? 'العروض اليومية | ماريوت' : 'Daily Deals | Mariot Store',
    });
}

export const dynamic = 'force-dynamic';

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

async function getInitialData() {
    try {
        const [brandsRes, catsRes, productsRes] = await Promise.all([
            fetch(`${API_BASE_URL_SERVER}/brands?is_daily_offer=1`, { next: { revalidate: 3600 } }),
            fetch(`${API_BASE_URL_SERVER}/categories`, { next: { revalidate: 3600 } }),
            fetch(`${API_BASE_URL_SERVER}/products?limit=40&is_daily_offer=1`, { next: { revalidate: 60 } })
        ]);

        const brandsData = await brandsRes.json();
        const catsData = await catsRes.json();
        const productsData = await productsRes.json();

        return {
            brands: brandsData.success ? brandsData.data.filter((b: any) => b.is_active) : [],
            categories: catsData.success ? catsData.data : [],
            products: productsData.success ? productsData.data : []
        };
    } catch (error) {
        console.error("Failed to fetch initial data on server:", error);
        return { brands: [], categories: [], products: [] };
    }
}

export default async function Page() {
    const initialData = await getInitialData();

    return (
        <>
            <Header />
            <main>
                <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading offers...</div>}>
                    <TodayOffersPage
                        initialBrands={initialData.brands}
                        initialCategories={initialData.categories}
                        initialProducts={initialData.products}
                    />
                </Suspense>
            </main>
            <Footer />
            <FloatingActions />
        </>
    );
}
