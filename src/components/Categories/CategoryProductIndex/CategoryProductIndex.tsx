import React from 'react';
import { Link } from '@/i18n/navigation';
import { API_BASE_URL } from '@/config';
import styles from './CategoryProductIndex.module.css';

/**
 * The products in a category, rendered on the server.
 *
 * CategoryLanding fetches everything after it mounts, which is fine for a shopper and useless
 * to everything else: a crawler, or an assistant fetching the URL, received a category page
 * with 7,983 words of chrome and not one link to a product. Category pages are where
 * commercial intent lands, so that was the catalogue's biggest blind spot.
 *
 * This renders the same products as plain anchors in the server HTML. It is deliberately
 * simple -- no state, no effects, no images to lay out -- because its job is to be readable
 * by something that does not run JavaScript. The interactive landing page renders above it
 * and is unaffected.
 *
 * Not hidden with display:none or a zero height. Content served only to crawlers is cloaking;
 * this is a real, visible index of what the category contains, which is useful to a shopper
 * who wants the whole list rather than the curated view.
 */

interface Props {
    categorySlug: string;
    locale: string;
    /** Heading text, already localised by the caller. */
    heading: string;
}

interface IndexProduct {
    id: number;
    name: string;
    name_ar?: string | null;
    slug: string;
}

/**
 * ISR rather than per-request: the catalogue changes a few times a day at most, and a
 * category page that has to wait on the API before it can return is a slow page for
 * everyone. An hour old is fine for a product index.
 */
async function fetchProducts(categorySlug: string): Promise<IndexProduct[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/products?category=${encodeURIComponent(categorySlug)}&limit=200`,
            { next: { revalidate: 3600 } },
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data?.success ? (data.data || []) : [];
    } catch {
        // A failed fetch must not take the category page down with it. The interactive
        // listing above still renders and still works.
        return [];
    }
}

export default async function CategoryProductIndex({ categorySlug, locale, heading }: Props) {
    const products = await fetchProducts(categorySlug);
    if (products.length === 0) return null;

    const isArabic = locale === 'ar';

    return (
        <section className={styles.index} aria-label={heading}>
            <h2 className={styles.heading}>{heading}</h2>
            <ul className={styles.list}>
                {products.map(p => (
                    <li key={p.id}>
                        <Link href={`/product/${p.slug}`} className={styles.link}>
                            {isArabic && p.name_ar ? p.name_ar : p.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
