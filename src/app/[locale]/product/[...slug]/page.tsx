import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ProductDetail from '@/components/Product/ProductDetail/ProductDetail';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export async function generateMetadata({ params }: { params: { slug: string | string[], locale: string } }): Promise<Metadata> {
    const slugArray = Array.isArray(params.slug) ? params.slug : [params.slug];
    const id = slugArray.map(s => decodeURIComponent(s)).join('/');
    const isArabic = params.locale === 'ar';
    const SITE_URL = 'https://mariot-e-commerce.vercel.app';

    // Helper to resolve absolute image URL for OG tags
    const resolveImageUrl = (url?: string) => {
        if (!url) return '';
        // If it's already an absolute URL (but not localhost), return it
        if ((url.startsWith('http')) && !url.includes('localhost:5000')) return url;
        
        // Use production backend URL or fallback to localhost during dev
        const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL 
            ? process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '') 
            : 'http://localhost:5000';

        if (url.includes('localhost:5000')) {
            return url.replace('http://localhost:5000', BACKEND_URL);
        }
        
        if (url.startsWith('/assets/')) return `${SITE_URL}${url}`;
        
        return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Helper to strip HTML tags for metadata description
    const stripHtml = (html?: string) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    try {
        const res = await fetch(`${API_BASE_URL_SERVER}/products/${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.success && data.data) {
            const product = data.data;
            const title = isArabic && product.name_ar ? product.name_ar : product.name;
            const rawDescription = isArabic && product.short_description_ar ? product.short_description_ar : product.short_description;
            const cleanDescription = stripHtml(rawDescription) || `Buy ${title} at the best price in UAE only at Mariot Store.`;
            
            // Get the primary image
            const imagePath = product.primary_image || (product.images && product.images[0]?.image_url);
            const resolvedImg = resolveImageUrl(imagePath);

            return {
                title: `${title} | Mariot Store`,
                description: cleanDescription,
                openGraph: {
                    title: `${title} | Mariot Store`,
                    description: cleanDescription,
                    images: resolvedImg ? [
                        {
                            url: resolvedImg,
                            width: 1200,
                            height: 630,
                            alt: title,
                        }
                    ] : [],
                    type: 'website',
                    url: `${SITE_URL}/${params.locale}/product/${encodeURIComponent(id)}`,
                },
                twitter: {
                    card: 'summary_large_image',
                    title: `${title} | Mariot Store`,
                    description: cleanDescription,
                    images: resolvedImg ? [resolvedImg] : [],
                }
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
    // Decode each segment to properly handle slashes and special characters
    const slugArray = Array.isArray(params.slug) ? params.slug : [params.slug];
    const slug = slugArray.map(s => decodeURIComponent(s)).join('/');

    return (
        <main>
            <Header />
            <ProductDetail id={slug} />
            <Footer />
            <FloatingActions />
        </main>
    );
}
