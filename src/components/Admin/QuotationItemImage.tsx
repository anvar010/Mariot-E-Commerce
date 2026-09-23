'use client';

/**
 * The thumbnail for one line of a saved quotation.
 *
 * A quotation freezes what was offered, image URL included, so an old one points at
 * wherever that product's photo lived at the time. Every quotation raised before the move
 * off WordPress carries a mariotstore.com/wp-content/... URL, and those files are gone --
 * so the line rendered the placeholder even though the product has a perfectly good photo
 * today.
 *
 * Three steps, in order:
 *   1. the stored URL, since it is what the customer was actually shown;
 *   2. the product's current image, looked up by slug once the stored one fails;
 *   3. the placeholder.
 *
 * The lookup only happens after a failure, so a quotation whose images still resolve
 * makes no extra requests at all. Results are cached per slug for the page's lifetime,
 * because the same product appears on many quotations and each would otherwise refetch
 * it.
 */

import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/config';
import { resolveUrl, PRODUCT_IMAGE_FALLBACK } from '@/utils/resolveUrl';

/** slug -> resolved image URL, or null once we know there is nothing to find. */
const liveImageCache = new Map<string, string | null>();

const fetchLiveImage = async (slug: string): Promise<string | null> => {
    if (liveImageCache.has(slug)) return liveImageCache.get(slug) ?? null;
    try {
        const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(slug)}`);
        const data = await res.json();
        const p = data?.data;
        // primary_image is not computed on this endpoint, so the images array is the
        // reliable source; the row flagged primary wins, otherwise the first one.
        const imgs: any[] = Array.isArray(p?.images) ? p.images : [];
        const primary = imgs.find(i => Number(i?.is_primary) === 1) || imgs[0];
        const url = p?.primary_image || primary?.image_url || null;
        const resolved = url ? resolveUrl(url) : null;
        liveImageCache.set(slug, resolved || null);
        return resolved || null;
    } catch {
        liveImageCache.set(slug, null);
        return null;
    }
};

interface Props {
    /** The saved line. Accepts either field name: lines store `image`. */
    item: { image?: string; image_url?: string; slug?: string; name?: string };
    className?: string;
}

const QuotationItemImage: React.FC<Props> = ({ item, className }) => {
    const stored = resolveUrl(item.image || item.image_url);
    const [src, setSrc] = useState<string>(stored || PRODUCT_IMAGE_FALLBACK);
    // Guards the recovery so a product whose live image also fails cannot loop.
    const triedLive = useRef(!stored);

    // A different line may reuse this component slot as the modal switches quotations.
    useEffect(() => {
        setSrc(stored || PRODUCT_IMAGE_FALLBACK);
        triedLive.current = !stored;
    }, [stored]);

    const handleError = async () => {
        if (triedLive.current || !item.slug) {
            setSrc(PRODUCT_IMAGE_FALLBACK);
            return;
        }
        triedLive.current = true;
        const live = await fetchLiveImage(item.slug);
        setSrc(live || PRODUCT_IMAGE_FALLBACK);
    };

    return (
        <img
            src={src}
            alt={item.name || ''}
            className={className}
            loading="lazy"
            decoding="async"
            onError={handleError}
        />
    );
};

export default QuotationItemImage;
