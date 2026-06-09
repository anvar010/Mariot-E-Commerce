'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import { resolveUrl } from '@/utils/resolveUrl';
import { stripHtml } from '@/utils/formatters';
import { useCartActions } from '@/context/CartContext';
import { useNotification } from '@/context/NotificationContext';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import styles from './SearchDropdown.module.css';

interface ProductSuggestion {
    id: number;
    name: string;
    name_ar?: string | null;
    slug: string;
    model?: string | null;
    price?: number | string | null;
    offer_price?: number | string | null;
    primary_image?: string | null;
    category_name?: string | null;
    stock_quantity?: number | null;
    track_inventory?: number | boolean;
}

interface CategorySuggestion {
    id: number;
    name: string;
    name_ar?: string | null;
    slug: string;
}

interface BrandSuggestion {
    id: number;
    name: string;
    name_ar?: string | null;
    slug: string;
    image_url?: string | null;
}

export interface SearchDropdownData {
    products: ProductSuggestion[];
    categories: CategorySuggestion[];
    brands: BrandSuggestion[];
    trending: ProductSuggestion[];
}

interface Props {
    query: string;
    data: SearchDropdownData;
    loading: boolean;
    onNavigate: (path: string) => void;
    onClose: () => void;
}

const SearchDropdown: React.FC<Props> = ({ query, data, loading, onNavigate, onClose }) => {
    const t = useTranslations('header');
    const tp = useTranslations('product');
    const locale = useLocale();
    const isArabic = locale === 'ar';
    const { addToCart } = useCartActions();
    const { showNotification } = useNotification();
    const [qtyMap, setQtyMap] = React.useState<Record<number, number>>({});

    // Show the Arabic name when the site is in Arabic and one exists; fall back to English.
    const localized = (item: { name: string; name_ar?: string | null }) =>
        isArabic && item.name_ar && item.name_ar.trim() ? item.name_ar : item.name;

    const hasQuery = query.trim().length >= 2;
    const hasLeftResults =
        data.products.length > 0 || data.categories.length > 0 || data.brands.length > 0;
    // When there's no query but admin has trending picks, we still derive the
    // left side from those picks (server-side), so render the sections.
    const showLeftSections = hasQuery ? hasLeftResults : hasLeftResults;

    const getQty = (id: number) => qtyMap[id] ?? 1;

    const isStockTracked = (p: ProductSuggestion) =>
        p.track_inventory === 1 || p.track_inventory === true || String(p.track_inventory) === '1';

    const stockCap = (p: ProductSuggestion): number | null => {
        if (!isStockTracked(p)) return null;
        const n = Number(p.stock_quantity);
        return Number.isFinite(n) ? Math.max(0, n) : null;
    };

    const setQty = (p: ProductSuggestion, n: number) => {
        const cap = stockCap(p);
        let next = Math.max(1, n);
        if (cap !== null && cap > 0 && next > cap) {
            next = cap;
            showNotification(tp('maxStockReached', { count: cap }), 'info');
        }
        setQtyMap(m => ({ ...m, [p.id]: next }));
    };

    const handleAdd = async (p: ProductSuggestion) => {
        await addToCart({
            id: p.id,
            name: stripHtml(p.name),
            name_ar: (p as any).name_ar ? stripHtml((p as any).name_ar) : undefined,
            slug: p.slug,
            price: p.price,
            offer_price: p.offer_price,
            image: p.primary_image,
            primary_image: p.primary_image,
            stock_quantity: p.stock_quantity,
            track_inventory: p.track_inventory,
            quantity: getQty(p.id)
        });
    };

    // When user is typing, right column mirrors the search results with full
    // product cards (image + price + Add to Cart). When idle, it shows the
    // admin-curated trending list.
    const rightTitle = hasQuery ? t('searchTopMatches') : t('searchTrending');
    const rightProducts = hasQuery ? data.products : data.trending;

    return (
        <div className={styles.dropdown} dir={isArabic ? 'rtl' : 'ltr'}>
            <div className={styles.grid}>
                {/* LEFT column — dynamic match results */}
                <div className={styles.leftCol}>
                    {hasQuery && loading ? (
                        <>
                            <div className={styles.section}>
                                <h4 className={styles.sectionTitle}>{t('searchProductsSuggestions')}</h4>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={`sp-${i}`} className={styles.skeletonRow}>
                                        <div className={styles.shimmer} />
                                    </div>
                                ))}
                            </div>
                            <div className={styles.section}>
                                <h4 className={styles.sectionTitle}>{t('searchCategories')}</h4>
                                {[1, 2].map(i => (
                                    <div key={`sc-${i}`} className={styles.skeletonRow}>
                                        <div className={styles.shimmer} />
                                    </div>
                                ))}
                            </div>
                            <div className={styles.section}>
                                <h4 className={styles.sectionTitle}>{t('searchBrands')}</h4>
                                {[1, 2, 3].map(i => (
                                    <div key={`sb-${i}`} className={styles.skeletonRow}>
                                        <div className={styles.shimmer} />
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : !hasQuery && !showLeftSections ? (
                        <div className={styles.emptyHint}>
                            <span>{t('searchPlaceholder')}</span>
                            <small>{t('searchStartTyping')}</small>
                        </div>
                    ) : hasQuery && !hasLeftResults ? (
                        <div className={styles.emptyHint}>
                            <span>{t('searchNoMatches')}</span>
                            <small>{t('searchTryDifferent')}</small>
                        </div>
                    ) : (
                        <>
                            {data.products.length > 0 && (
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}>{t('searchProductsSuggestions')}</h4>
                                    <ul className={styles.linkList}>
                                        {data.products.map(p => (
                                            <li key={`p-${p.id}`}>
                                                <button
                                                    type="button"
                                                    className={styles.linkItem}
                                                    onClick={() => {
                                                        onNavigate(`/product/${p.slug}`);
                                                        onClose();
                                                    }}
                                                >
                                                    {stripHtml(localized(p))}
                                                    {p.model && <span className={styles.linkMeta}> ({stripHtml(p.model)})</span>}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {data.categories.length > 0 && (
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}>{t('searchCategories')}</h4>
                                    <ul className={styles.linkList}>
                                        {data.categories.map(c => (
                                            <li key={`c-${c.id}`}>
                                                <button
                                                    type="button"
                                                    className={`${styles.linkItem} ${styles.plain}`}
                                                    onClick={() => {
                                                        onNavigate(`/category/${c.slug}`);
                                                        onClose();
                                                    }}
                                                >
                                                    {localized(c)}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {data.brands.length > 0 && (
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}>{t('searchBrands')}</h4>
                                    <div className={styles.brandsGrid}>
                                        {data.brands.map(b => (
                                            <button
                                                key={`b-${b.id}`}
                                                type="button"
                                                className={styles.brandCard}
                                                onClick={() => {
                                                    onNavigate(`/shop?brand=${b.slug}`);
                                                    onClose();
                                                }}
                                                title={localized(b)}
                                            >
                                                <div className={styles.brandLogoWrap}>
                                                    {b.image_url ? (
                                                        <Image
                                                            src={resolveUrl(b.image_url)}
                                                            alt={localized(b)}
                                                            width={200}
                                                            height={90}
                                                            className={styles.brandLogo}
                                                        />
                                                    ) : (
                                                        <span className={styles.brandLogoFallback}>{localized(b).charAt(0)}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RIGHT column — search matches when typing, trending when idle */}
                <div className={styles.rightCol}>
                    <h4 className={`${styles.sectionTitle} ${styles.trendingTitle}`}>{rightTitle}</h4>
                    {hasQuery && loading ? (
                        <ul className={styles.trendingList}>
                            {[1, 2, 3].map(i => (
                                <li key={`sk-${i}`} className={styles.trendingItem}>
                                    <div className={styles.trendingThumb}>
                                        <div className={styles.shimmer} />
                                    </div>
                                    <div className={styles.trendingInfo} style={{ gap: 6 }}>
                                        <div className={styles.skeletonRow} style={{ height: 14, width: '85%' }}>
                                            <div className={styles.shimmer} />
                                        </div>
                                        <div className={styles.skeletonRow} style={{ height: 12, width: '50%' }}>
                                            <div className={styles.shimmer} />
                                        </div>
                                        <div className={styles.skeletonRow} style={{ height: 26, width: '100%' }}>
                                            <div className={styles.shimmer} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : rightProducts.length === 0 ? (
                        <div className={styles.emptyTrending}>
                            {hasQuery ? t('searchNoMatchingProducts') : t('searchNoTrending')}
                        </div>
                    ) : (
                        <ul className={styles.trendingList}>
                            {rightProducts.map(p => {
                                const qty = getQty(p.id);
                                const hasOffer = Number(p.offer_price) > 0 && Number(p.offer_price) < Number(p.price);
                                return (
                                    <li key={`t-${p.id}`} className={styles.trendingItem}>
                                        <button
                                            type="button"
                                            className={styles.trendingThumbBtn}
                                            onClick={() => {
                                                onNavigate(`/product/${p.slug}`);
                                                onClose();
                                            }}
                                        >
                                            <div className={styles.trendingThumb}>
                                                <Image
                                                    src={resolveUrl(p.primary_image || undefined) || '/assets/mariot-logo2.webp'}
                                                    alt={stripHtml(localized(p))}
                                                    width={72}
                                                    height={72}
                                                    className={styles.trendingImage}
                                                />
                                            </div>
                                        </button>

                                        <div className={styles.trendingInfo}>
                                            <button
                                                type="button"
                                                className={styles.trendingName}
                                                onClick={() => {
                                                    onNavigate(`/product/${p.slug}`);
                                                    onClose();
                                                }}
                                            >
                                                {stripHtml(localized(p))}
                                            </button>

                                            {(p.price || p.offer_price) && (
                                                <div className={styles.trendingPrice}>
                                                    <CurrencyPrice amount={Number(hasOffer ? p.offer_price : p.price)} />
                                                    {hasOffer && (
                                                        <span className={styles.trendingOriginal}>
                                                            <CurrencyPrice amount={Number(p.price)} />
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className={styles.trendingActions}>
                                                <div className={styles.qtyControl}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(p, qty - 1)}
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={qty}
                                                        onChange={(e) => {
                                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                                            if (raw === '') {
                                                                setQty(p, 1);
                                                                return;
                                                            }
                                                            setQty(p, parseInt(raw, 10));
                                                        }}
                                                        onBlur={(e) => {
                                                            const n = parseInt(e.target.value, 10);
                                                            setQty(p, Number.isFinite(n) && n > 0 ? n : 1);
                                                        }}
                                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                                        className={styles.qtyInput}
                                                        aria-label="Quantity"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(p, qty + 1)}
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.addBtn}
                                                    onClick={() => handleAdd(p)}
                                                >
                                                    <ShoppingCart size={14} />
                                                    <span>{t('searchAddToCart')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchDropdown;
