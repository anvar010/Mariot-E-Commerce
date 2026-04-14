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
    const SITE_URL = 'https://mariotstore.com';

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
                title: `${title} | Mariot Kitchen Equipment UAE`,
                description: cleanDescription,
                alternates: {
                    canonical: `${SITE_URL}/${params.locale}/product/${encodeURIComponent(id)}`,
                },
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
                    siteName: 'Mariot Kitchen Equipment',
                },
                twitter: {
                    card: 'summary_large_image',
                    title: `${title} | Mariot Kitchen Equipment`,
                    description: cleanDescription,
                    images: resolvedImg ? [resolvedImg] : [],
                },
                other: {
                    'product:price:amount': product.price || '0',
                    'product:price:currency': 'AED',
                    'product:availability': product.stock_quantity > 0 ? 'instock' : 'oos',
                    'product:condition': 'new',
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

export default async function ProductPage({ params }: { params: { slug: string | string[], locale: string } }) {
    // Handle both single slug and catch-all slug (array)
    // Decode each segment to properly handle slashes and special characters
    const slugArray = Array.isArray(params.slug) ? params.slug : [params.slug];
    const slug = slugArray.map(s => decodeURIComponent(s)).join('/');
    const isArabic = params.locale === 'ar';
    const SITE_URL = 'https://mariotstore.com';

    let jsonLd = null;

    try {
        const res = await fetch(`${API_BASE_URL_SERVER}/products/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.success && data.data) {
            const product = data.data;
            const title = isArabic && product.name_ar ? product.name_ar : product.name;
            const description = isArabic && product.short_description_ar ? product.short_description_ar : product.short_description;

            // Clean HTML
            const cleanDesc = description ? description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : `Buy ${title} at Mariot Store.`;

            const imagePath = product.primary_image || (product.images && product.images[0]?.image_url);
            let resolvedImg = imagePath;
            if (resolvedImg && !resolvedImg.startsWith('http') && !resolvedImg.includes('localhost')) {
                const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL
                    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '')
                    : 'http://localhost:5000';
                resolvedImg = resolvedImg.startsWith('/assets/')
                    ? `${SITE_URL}${resolvedImg}`
                    : `${BACKEND_URL}${resolvedImg.startsWith('/') ? '' : '/'}${resolvedImg}`;
            }

            jsonLd = {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": title,
                "description": cleanDesc,
                "image": resolvedImg ? [resolvedImg] : [],
                "sku": product.model || product.slug || product.id,
                "mpn": product.id,
                "brand": {
                    "@type": "Brand",
                    "name": product.brand_name || 'Mariot'
                },
                "offers": {
                    "@type": "Offer",
                    "url": `${SITE_URL}/${params.locale}/product/${encodeURIComponent(slug)}`,
                    "priceCurrency": "AED",
                    "price": product.offer_price ? Number(product.offer_price) : Number(product.price || 0),
                    "availability": product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                    "itemCondition": "https://schema.org/NewCondition"
                }
            };
        }
    } catch (e) {
        console.error("Failed to generate JSON-LD", e);
    }

    return (
        <main>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <Header />
            <ProductDetail id={slug} />
            <Footer />
            <FloatingActions />
        </main>
    );
}
