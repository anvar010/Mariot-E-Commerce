import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ProductDetail from '@/components/Product/ProductDetail/ProductDetail';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';

const API_BASE_URL_SERVER = 'http://localhost:5000/api/v1';

export async function generateMetadata({ params: { slug, locale } }: { params: { slug: string | string[], locale: string } }): Promise<Metadata> {
    const id = Array.isArray(slug) ? slug.join('/') : slug;
    const isArabic = locale === 'ar';

    try {
        const res = await fetch(`${API_BASE_URL_SERVER}/products/${encodeURIComponent(id)}`);
        const data = await res.json();

        if (data.success && data.data) {
            const product = data.data;
            const title = isArabic && product.name_ar ? product.name_ar : product.name;
            const description = isArabic && product.short_description_ar ? product.short_description_ar : product.short_description;

            return {
                title: `${title} | Mariot Store`,
                description: description || `Buy ${title} at the best price in UAE only at Mariot Store.`,
                openGraph: {
                    title: `${title} | Mariot Store`,
                    description: description || `Buy ${title} at the best price in UAE only at Mariot Store.`,
                    images: product.primary_image ? [{ url: product.primary_image }] : [],
                },
            };
        }
    } catch (e) {
        console.error("Metadata fetch failed", e);
    }

    return {
        title: 'Product Details | Mariot Store',
        description: 'Explore our wide range of premium kitchen equipment.'
    };
}

export default function ProductPage({ params }: { params: { slug: string | string[], locale: string } }) {
    // Handle both single slug and catch-all slug (array)
    // Next.js catch-all slugs pass segments as an array ['segment1', 'segment2', ...]
    const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;

    return (
        <main>
            <Header />
            <ProductDetail id={slug} />
            <Footer />
            <FloatingActions />
        </main>
    );
}
