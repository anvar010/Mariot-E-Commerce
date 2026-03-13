import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import Loader from '@/components/shared/Loader/Loader';

export const metadata: Metadata = {
    title: 'Shop Premium Kitchen Equipment | Mariot Store',
    description: 'Browse our full catalog of commercial kitchen equipment, coffee machines, bakery tools, and refrigeration units. Quality equipment for professionals.',
};

const API_BASE_URL_SERVER = 'http://localhost:5000/api/v1';

async function getShopData(locale: string, searchParams: { [key: string]: string | string[] | undefined }) {
    const category = searchParams.category as string | undefined;
    const brand = searchParams.brand as string | undefined;
    const search = searchParams.search as string | undefined;
    const limited = searchParams.limited === 'true';

    try {
        // Build product URL
        let productUrl = `${API_BASE_URL_SERVER}/products?page=1&limit=20`;
        if (category) productUrl += `&category=${category}`;
        if (brand) productUrl += `&brand=${brand}`;
        if (search) productUrl += `&search=${encodeURIComponent(search)}`;
        if (limited) productUrl += `&is_limited_offer=true`;

        // Build brands URL
        const brandsUrl = category
            ? `${API_BASE_URL_SERVER}/brands?category=${category}`
            : `${API_BASE_URL_SERVER}/brands`;

        const [productsRes, brandsRes] = await Promise.all([
            fetch(productUrl, { next: { revalidate: 60 } }),
            fetch(brandsUrl, { next: { revalidate: 3600 } })
        ]);

        const productsData = await productsRes.json();
        const brandsData = await brandsRes.json();

        // Categorires logic (can be static or partially fetched)
        // For simplicity and to match ShopLayout logic:
        const requestedCategories = [
            "Coffee Makers", "Ice Equipment", "Cooking Equipment", "Refrigeration", "Beverage Equipment", "Commercial Ovens", "Food Preparation", "Food Holding and Warming Line", "Delivery and Storage", "Parts", "Used Equipment", "Dishwashing", "Stainless Steel Equipment", "Janitorial & Safety Supplies", "Water Treatment", "Home Use", "Dining Room", "Smallwares", "Disposables", "Food & Beverage Ingredients"
        ].map(name => {
            const slug = name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/,/g, '');
            return { name, slug }; // Translations will be handled by client
        });

        return {
            products: productsData.success ? productsData.data : [],
            brands: brandsData.success ? brandsData.data.filter((b: any) => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1') : [],
            total: productsData.success ? productsData.total : 0,
            allCategories: requestedCategories
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
