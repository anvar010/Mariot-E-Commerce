import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import Loader from '@/components/shared/Loader/Loader';

export const metadata: Metadata = {
    title: 'Commercial Coffee Makers & Equipment | Mariot Store',
    description: 'Explore our range of professional coffee makers, espresso machines, and brewing equipment. Best quality for cafes and restaurants in UAE.',
};

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

async function getCategoryData(slug: string) {
    try {
        const productUrl = `${API_BASE_URL_SERVER}/products?page=1&limit=20&search=coffee%20makers`;
        const brandsUrl = `${API_BASE_URL_SERVER}/brands?category=${slug}`;

        const [productsRes, brandsRes] = await Promise.all([
            fetch(productUrl, { next: { revalidate: 60 } }),
            fetch(brandsUrl, { next: { revalidate: 3600 } })
        ]);

        const productsData = await productsRes.json();
        const brandsData = await brandsRes.json();

        // Categories logic
        const requestedCategories = [
            "Coffee Makers", "Ice Equipment", "Cooking Equipment", "Refrigeration", "Beverage Equipment", "Commercial Ovens", "Food Preparation", "Food Holding and Warming Line", "Delivery and Storage", "Parts", "Used Equipment", "Dishwashing", "Stainless Steel Equipment", "Janitorial & Safety Supplies", "Water Treatment", "Home Use", "Dining Room", "Smallwares", "Disposables", "Food & Beverage Ingredients"
        ].map(name => {
            const slug = name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/,/g, '');
            return { name, slug };
        });

        return {
            products: productsData.success ? productsData.data : [],
            brands: brandsData.success ? brandsData.data.filter((b: any) => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1') : [],
            total: productsData.success ? productsData.total : 0,
            allCategories: requestedCategories
        };
    } catch (e) {
        console.error("Category server fetch failed", e);
        return { products: [], brands: [], total: 0, allCategories: [] };
    }
}

export default async function CoffeeMakersPage() {
    const data = await getCategoryData('coffee-makers');

    return (
        <main>
            <Header />
            <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>}>
                <ShopLayout
                    defaultSearchQuery="coffee makers"
                    categoryNameOverride="Coffee Makers"
                    hideCategoryGrid={true}
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
