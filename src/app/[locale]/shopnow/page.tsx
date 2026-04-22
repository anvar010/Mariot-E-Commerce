import React, { Suspense } from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import Loader from '@/components/shared/Loader/Loader';

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

async function getShopNowData() {
    try {
        const productUrl = `${API_BASE_URL_SERVER}/products?page=1&limit=24&is_featured=1`;
        const brandsUrl = `${API_BASE_URL_SERVER}/brands`;
        const categoriesUrl = `${API_BASE_URL_SERVER}/categories`;

        const [productsRes, brandsRes, categoriesRes] = await Promise.all([
            fetch(productUrl, { next: { revalidate: 60 } }),
            fetch(brandsUrl, { next: { revalidate: 3600 } }),
            fetch(categoriesUrl, { next: { revalidate: 3600 } })
        ]);

        const productsData = await productsRes.json();
        const brandsData = await brandsRes.json();
        const categoriesData = await categoriesRes.json();

        return {
            products: productsData.success ? productsData.data : [],
            brands: brandsData.success ? brandsData.data.filter((b: any) => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1') : [],
            total: productsData.success ? productsData.total : 0,
            allCategories: categoriesData.success ? categoriesData.data : []
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
