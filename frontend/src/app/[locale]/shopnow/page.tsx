import React, { Suspense } from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import Loader from '@/components/shared/Loader/Loader';

import { API_BASE_URL } from '@/config';

const API_BASE_URL_SERVER = API_BASE_URL;

async function getShopNowData() {
    try {
        const productUrl = `${API_BASE_URL_SERVER}/products?page=1&limit=24&is_featured=1`;
        const brandsUrl = `${API_BASE_URL_SERVER}/brands`;

        const [productsRes, brandsRes] = await Promise.all([
            fetch(productUrl, { next: { revalidate: 60 } }),
            fetch(brandsUrl, { next: { revalidate: 3600 } })
        ]);

        const productsData = await productsRes.json();
        const brandsData = await brandsRes.json();

        // Categorires logic
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
        console.error("ShopNow server fetch failed", e);
        return { products: [], brands: [], total: 0, allCategories: [] };
    }
}

export default async function ShopNowPage() {
    const data = await getShopNowData();

    return (
        <main>
            <Header />
            <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>}>
                <ShopLayout
                    isFeatured={true}
                    categoryNameOverride="Featured Products"
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
