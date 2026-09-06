import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ProductDetail from '@/components/Product/ProductDetail/ProductDetail';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import { localeAlternates, ogLocale } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { fetchJsonWithRetry } from '@/utils/readJson';

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://mariot-backend.onrender.com/api/v1';

export async function generateMetadata(props: { params: Promise<{ slug: string | string[], locale: string }> }): Promise<Metadata> {
    const params = await props.params;
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
    // Keep meta descriptions to a sane SEO length (~160 chars), cutting on a word boundary.
    const clampDesc = (s: string, max = 160) => {
        if (s.length <= max) return s;
        const cut = s.slice(0, max);
        const lastSpace = cut.lastIndexOf(' ');
        return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim() + '…';
    };

    try {
        // Retries once when the response isn't even JSON — the CDN in front of the API
        // intermittently answers a render with an HTML 403. Falls through to the
        // slug-derived metadata below rather than throwing if it fails twice.
        const data = await fetchJsonWithRetry(
            `${API_BASE_URL_SERVER}/products/${encodeURIComponent(id)}`,
            { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) },
            `product metadata "${id}"`,
        );

        if (data.success && data.data) {
            const product = data.data;
            const title = isArabic && product.name_ar ? product.name_ar : product.name;
            // Use the full description as the primary meta description, fall back to the
            // short description, then a generic line.
            const longDesc = isArabic && product.description_ar ? product.description_ar : product.description;
            const shortDesc = isArabic && product.short_description_ar ? product.short_description_ar : product.short_description;
            const cleanDescription = clampDesc(stripHtml(longDesc) || stripHtml(shortDesc) || `Buy ${title} at the best price from Mariot Store. Delivery across the UAE, GCC and worldwide.`);

            // Get the primary image
            const imagePath = product.primary_image || (product.images && product.images[0]?.image_url);
            const resolvedImg = resolveImageUrl(imagePath);

            return {
                title: `${title} | Mariot Kitchen Equipment UAE`,
                description: cleanDescription,
                alternates: localeAlternates(params.locale, `/product/${encodeURIComponent(id)}`),
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
                    ...ogLocale(params.locale),
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
        console.error(`[generateMetadata] Product fetch error for slug "${id}" from ${API_BASE_URL_SERVER}:`, e);
    }

    // Fallback: avoid generic site-wide OG bleed-through by emitting product-scoped tags.
    const fallbackTitle = slugArray
        .map(s => decodeURIComponent(s).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
        .join(' ');
    const fallbackDescription = `Shop ${fallbackTitle} at Mariot Store — commercial kitchen equipment delivered across the UAE, GCC and worldwide.`;
    const fallbackUrl = `${SITE_URL}/${params.locale}/product/${encodeURIComponent(id)}`;
    const fallbackImage = `${SITE_URL}/assets/mariot-logo.webp`;
    return {
        title: `${fallbackTitle} | Mariot Store`,
        description: fallbackDescription,
        openGraph: {
            title: `${fallbackTitle} | Mariot Store`,
            description: fallbackDescription,
            url: fallbackUrl,
            siteName: 'Mariot Kitchen Equipment',
            images: [{ url: fallbackImage, width: 1200, height: 630, alt: fallbackTitle }],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${fallbackTitle} | Mariot Store`,
            description: fallbackDescription,
            images: [fallbackImage],
        },
    };
}

export default async function ProductPage(props: { params: Promise<{ slug: string | string[], locale: string }> }) {
    const params = await props.params;
    // Handle both single slug and catch-all slug (array)
    // Decode each segment to properly handle slashes and special characters
    const slugArray = Array.isArray(params.slug) ? params.slug : [params.slug];
    const slug = slugArray.map(s => decodeURIComponent(s)).join('/');
    const isArabic = params.locale === 'ar';
    const SITE_URL = 'https://mariotstore.com';

    let jsonLd = null;
    // Distinguished from "the API did not answer" on purpose -- see below.
    let productMissing = false;

    try {
        const data = await fetchJsonWithRetry(
            `${API_BASE_URL_SERVER}/products/${encodeURIComponent(slug)}`,
            { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) },
            `product JSON-LD "${slug}"`,
        );

        // The API answered and said there is no such product. Anything else here -- a
        // timeout, a 500, the API being down -- must NOT reach this branch: a temporary
        // outage would otherwise 404 the entire live catalogue, and Google would drop it.
        if (data && data.success === false) {
            productMissing = true;
        }

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
                    // Keep the offer "valid" for a year out so Google doesn't flag a stale price.
                    "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    // Same rule the shop itself uses (see ProductDetail): a product with
                    // track_inventory off is always available, and stock_quantity on it is
                    // meaningless. Reading the quantity alone declared 1,272 of 1,417
                    // products unavailable when only 4 genuinely were -- and Google drops
                    // an out-of-stock item from Shopping, so nine tenths of the catalogue
                    // was being withheld from it. Variant products are always tracked,
                    // because the backend forces track_inventory on for variant lines.
                    "availability": (() => {
                        const hasVariants = Number(product.has_variants) === 1
                            || (Array.isArray(product.variants) && product.variants.length > 0);
                        const tracks = hasVariants || Number(product.track_inventory) === 1;
                        const available = !tracks || Number(product.stock_quantity) > 0;
                        return available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
                    })(),
                    "itemCondition": "https://schema.org/NewCondition"
                }
            };

            // Star ratings (rich snippet) — only when at least one real review exists.
            const ratingCount = Number(product.total_reviews) || 0;
            const ratingValue = Number(product.average_rating) || 0;
            if (ratingCount > 0 && ratingValue > 0) {
                (jsonLd as any).aggregateRating = {
                    "@type": "AggregateRating",
                    "ratingValue": ratingValue.toFixed(1),
                    "reviewCount": ratingCount,
                    "bestRating": "5",
                    "worstRating": "1"
                };
            }
        }
    } catch (e) {
        console.error("Failed to generate JSON-LD", e);
    }

    // A slug with no product behind it used to render the page shell anyway and answer 200:
    // a title made from the slug, no price, no Product markup. Google indexes those as real
    // pages, and Merchant Center disapproves any feed item that lands on one. An honest 404
    // says the page is gone, which is what both of them need to hear.
    if (productMissing) {
        notFound();
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
