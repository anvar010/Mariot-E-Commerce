'use client';

/**
 * One line of a saved quotation: thumbnail, name, and the model/brand beneath it.
 *
 * The image and the name both open the product's public page in a new tab. A new tab
 * rather than the same one because this is opened from a modal over a half-built
 * quotation -- navigating away in place would discard whatever was on screen behind it.
 *
 * Everything here comes from the quotation's stored line item, not from a fresh product
 * lookup. A quotation is a record of what was offered, so the name and price shown must be
 * the ones the customer was quoted, even if the product has since been renamed or
 * repriced. The link is the one exception: it points at the product as it is today, which
 * is what someone clicking it wants to see.
 */

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { ExternalLink, Package } from 'lucide-react';
import { resolveUrl } from '@/utils/resolveUrl';
import styles from './QuotationLineProduct.module.css';

interface Props {
    item: {
        name?: string;
        model?: string;
        brand?: string;
        image?: string;
        slug?: string;
        variant_label?: string | null;
        custom_dimensions?: Record<string, string> | null;
    };
}

const QuotationLineProduct: React.FC<Props> = ({ item }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const locale = useLocale();

    const src = resolveUrl(item.image);
    // Older lines were saved before slugs were stored, so they have nothing to link to.
    // Those stay as plain text rather than rendering a link that goes nowhere.
    // Built by hand rather than through the i18n Link: this opens in a new tab, so it
    // needs a real href a browser can follow, locale segment included.
    const href = item.slug ? `/${locale}/product/${item.slug}` : null;

    const meta = [item.brand, item.model, item.variant_label].filter(Boolean).join(' · ');
    const dims = item.custom_dimensions && Object.keys(item.custom_dimensions).length > 0
        ? Object.entries(item.custom_dimensions).map(([k, v]) => `${k}: ${v}`).join(', ')
        : null;

    const thumb = (
        <span className={styles.thumb}>
            {src && !imgFailed
                ? <img src={src} alt="" className={styles.img} loading="lazy" decoding="async" onError={() => setImgFailed(true)} />
                : <Package size={16} className={styles.placeholder} aria-hidden="true" />}
        </span>
    );

    return (
        <div className={styles.row}>
            {href
                ? (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.thumbLink}
                        aria-label={`Open ${item.name || 'product'} page`}
                        tabIndex={-1}
                    >
                        {thumb}
                    </a>
                )
                : thumb}

            <div className={styles.text}>
                {href
                    ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className={styles.nameLink}>
                            {item.name}
                            <ExternalLink size={11} className={styles.linkIcon} aria-hidden="true" />
                        </a>
                    )
                    : <span className={styles.name}>{item.name}</span>}
                {meta && <div className={styles.meta}>{meta}</div>}
                {dims && <div className={styles.meta}>{dims}</div>}
            </div>
        </div>
    );
};

export default QuotationLineProduct;
