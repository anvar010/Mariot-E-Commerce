'use client';

import React, { useEffect, useState } from 'react';
import { X, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import styles from './StaffQuotationProductModal.module.css';

/**
 * The full picture of one product, before it goes on a quotation.
 *
 * The picker's cards carry only what a card needs -- no variants, no size tiers -- because
 * the list endpoint does not return them. So this fetches the product in full and is the only
 * place a line's price is decided when that price depends on a choice: a custom size, or a
 * variant.
 *
 * The pricing rules here are the product page's rules, deliberately. A quotation that prices
 * a 120cm shelf differently from the storefront is worse than no quotation, so the tier
 * lookup and the offer-window test below mirror ProductDetail exactly. If one changes, both
 * must.
 */

interface SizeTier {
    dimension: string;
    min_cm: number | string;
    max_cm: number | string;
    price: number | string;
}

interface Props {
    productId: number;
    /** The card's own data, shown immediately so the modal is never blank while loading. */
    preview?: any;
    onClose: () => void;
    /** Called with the resolved line: price, and the choice that produced it. */
    onAdd: (payload: {
        product: any;
        unitPrice: number;
        variantId: number | null;
        variantLabel: string | null;
        customDimensions: Record<string, string> | null;
    }) => void;
}

const money = (n: unknown) => `AED ${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const resolveImg = (p?: string | null): string => {
    const s = String(p ?? '').trim();
    if (!s) return '/assets/mariot-logo2.webp';
    if (s.startsWith('http')) return s;
    return `${MEDIA_BASE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
};

/**
 * The product's picture, from whichever shape it arrived in.
 *
 * The list endpoint returns a flat `primary_image`; the single-product endpoint returns an
 * `images` array and no such field. The modal shows the card's data first and then replaces
 * it with the full product, so reading only `primary_image` made the image appear for a
 * second and then vanish. The preview is the last fallback for the same reason.
 */
const productImage = (p: any, preview?: any): string => {
    const fromArray = Array.isArray(p?.images) && p.images.length
        ? (p.images.find((i: any) => Number(i.is_primary) === 1) || p.images[0])?.image_url
        : null;
    return resolveImg(
        p?.primary_image || p?.image || fromArray || preview?.primary_image || preview?.image,
    );
};

export default function StaffQuotationProductModal({ productId, preview, onClose, onAdd }: Props) {
    const [product, setProduct] = useState<any>(preview || null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const [customDims, setCustomDims] = useState<Record<string, string>>({});
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
                    credentials: 'include',
                    headers: getAuthHeaders(),
                });
                const data = await res.json();
                if (cancelled) return;
                if (data?.success && data.data) {
                    const p = data.data;
                    setProduct(p);
                    // Start from the product's own base size, the way the product page does --
                    // it is a valid combination, so the price is populated immediately.
                    if (Number(p.is_customizable) === 1 && p.base_dimensions) {
                        const bd = typeof p.base_dimensions === 'string'
                            ? (() => { try { return JSON.parse(p.base_dimensions); } catch { return {}; } })()
                            : (p.base_dimensions || {});
                        const seeded: Record<string, string> = {};
                        for (const d of ['width', 'depth', 'height']) {
                            if (bd[d] != null) seeded[d] = String(bd[d]);
                        }
                        setCustomDims(seeded);
                    }
                    const variants = Array.isArray(p.variants) ? p.variants.filter((v: any) => Number(v.is_active) === 1) : [];
                    if (variants.length) {
                        const preferred = variants.find((v: any) => Number(v.is_default) === 1) || variants[0];
                        setSelectedVariantId(preferred.id);
                    }
                } else {
                    setFailed(true);
                }
            } catch {
                if (!cancelled) setFailed(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [productId]);

    // Escape closes, as elsewhere in the admin.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const isCustomizable = Number(product?.is_customizable) === 1;

    const customDimensionList: string[] = Array.isArray(product?.custom_dimensions)
        ? product.custom_dimensions.filter((d: any) => ['width', 'depth', 'height'].includes(d))
        : [];

    const sizeTiers: SizeTier[] = Array.isArray(product?.size_tiers) ? product.size_tiers : [];

    const variants: any[] = Array.isArray(product?.variants)
        ? product.variants.filter((v: any) => Number(v.is_active) === 1)
        : [];

    const selectedVariant = variants.find(v => v.id === selectedVariantId) || null;

    /**
     * An offer only counts inside its window -- the same test the product page applies, so a
     * quotation never quotes an expired promotion.
     */
    const now = Date.now();
    const offerActive =
        (!product?.offer_start || new Date(product.offer_start).getTime() <= now) &&
        (!product?.offer_end || new Date(product.offer_end).getTime() > now);

    /**
     * Sum of the matched tier for every enabled dimension. Null when any dimension is blank
     * or falls outside every tier -- which is what blocks the Add button, rather than
     * quietly quoting a price that does not exist.
     */
    const customPrice = (() => {
        if (!isCustomizable || customDimensionList.length === 0 || sizeTiers.length === 0) return null;
        let total = 0;
        for (const dim of customDimensionList) {
            const raw = customDims[dim];
            const v = Number(raw);
            if (raw === undefined || raw === '' || !Number.isFinite(v)) return null;
            const dimTiers = sizeTiers.filter(t => t.dimension === dim);
            if (dimTiers.length === 0) return null;
            const tier = dimTiers.find(t => v >= Number(t.min_cm) && v <= Number(t.max_cm));
            if (!tier) return null;
            total += Number(tier.price);
        }
        return total;
    })();

    const unitPrice = (() => {
        if (isCustomizable) return customPrice ?? 0;
        if (selectedVariant) {
            const hasOffer = offerActive && Number(selectedVariant.offer_price) > 0;
            return Number(hasOffer ? selectedVariant.offer_price : selectedVariant.price) || 0;
        }
        const hasOffer = offerActive && Number(product?.offer_price) > 0;
        return Number(hasOffer ? product?.offer_price : product?.price) || 0;
    })();

    // A customizable product with an incomplete or out-of-range size has no price to quote.
    const canAdd = !loading && !failed && (!isCustomizable || customPrice !== null);

    /** The range a dimension accepts, so the admin is told rather than left guessing. */
    const rangeFor = (dim: string): string => {
        const tiers = sizeTiers.filter(t => t.dimension === dim);
        if (!tiers.length) return '';
        const min = Math.min(...tiers.map(t => Number(t.min_cm)));
        const max = Math.max(...tiers.map(t => Number(t.max_cm)));
        return `${min}–${max} cm`;
    };

    const outOfRange = (dim: string): boolean => {
        const raw = customDims[dim];
        if (raw === undefined || raw === '') return false;
        const v = Number(raw);
        if (!Number.isFinite(v)) return true;
        const tiers = sizeTiers.filter(t => t.dimension === dim);
        if (!tiers.length) return false;
        return !tiers.some(t => v >= Number(t.min_cm) && v <= Number(t.max_cm));
    };

    const submit = () => {
        if (!canAdd || !product) return;
        onAdd({
            product,
            unitPrice,
            variantId: selectedVariant?.id ?? null,
            variantLabel: selectedVariant
                ? (selectedVariant.sku || selectedVariant.options_signature || `#${selectedVariant.id}`)
                : null,
            customDimensions: isCustomizable && customPrice !== null ? { ...customDims } : null,
        });
    };

    const p = product || {};

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.head}>
                    <h3>{p.name || 'Product'}</h3>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {loading && (
                        <p className={styles.status}><Loader2 size={16} className={styles.spin} /> Loading product…</p>
                    )}
                    {failed && (
                        <p className={styles.error}><AlertTriangle size={15} /> Could not load this product.</p>
                    )}

                    <div className={styles.top}>
                        <img src={productImage(p, preview)} alt="" className={styles.image} />
                        <div className={styles.meta}>
                            <div className={styles.metaRow}><span>Brand</span><strong>{p.brand_name || '—'}</strong></div>
                            <div className={styles.metaRow}><span>Model</span><strong>{p.model || '—'}</strong></div>
                            <div className={styles.metaRow}><span>Category</span><strong>{p.category_name || '—'}</strong></div>
                            {/* A product that does not track inventory always reads 0, which
                                looks like "out of stock" rather than "not counted". */}
                            <div className={styles.metaRow}>
                                <span>Stock</span>
                                <strong>
                                    {Number(p.track_inventory) === 1 || variants.length > 0
                                        ? (p.stock_quantity ?? 0)
                                        : 'Not tracked'}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {p.description && (
                        <div className={styles.section}>
                            <h4>Description</h4>
                            <div
                                className={styles.description}
                                dangerouslySetInnerHTML={{ __html: String(p.description) }}
                            />
                        </div>
                    )}

                    {/* Variants: colour, size, whatever the product defines. */}
                    {variants.length > 0 && (
                        <div className={styles.section}>
                            <h4>Variant</h4>
                            <div className={styles.variantGrid}>
                                {variants.map(v => {
                                    const active = v.id === selectedVariantId;
                                    const hasOffer = offerActive && Number(v.offer_price) > 0;
                                    const vPrice = Number(hasOffer ? v.offer_price : v.price) || 0;
                                    return (
                                        <button
                                            type="button"
                                            key={v.id}
                                            className={`${styles.variantBtn} ${active ? styles.variantActive : ''}`}
                                            onClick={() => setSelectedVariantId(v.id)}
                                        >
                                            <span className={styles.variantLabel}>
                                                {v.sku || v.options_signature || `Variant ${v.id}`}
                                            </span>
                                            <span className={styles.variantPrice}>{money(vPrice)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Custom sizing, priced from the same tiers the product page uses. */}
                    {isCustomizable && customDimensionList.length > 0 && (
                        <div className={styles.section}>
                            <h4>Custom size</h4>
                            <div className={styles.dimGrid}>
                                {customDimensionList.map(dim => (
                                    <label key={dim} className={styles.dimField}>
                                        <span className={styles.dimLabel}>
                                            {dim.charAt(0).toUpperCase() + dim.slice(1)} (cm)
                                            <em>{rangeFor(dim)}</em>
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={customDims[dim] ?? ''}
                                            onChange={e => setCustomDims(prev => ({ ...prev, [dim]: e.target.value }))}
                                            className={outOfRange(dim) ? styles.dimInvalid : ''}
                                        />
                                    </label>
                                ))}
                            </div>
                            {isCustomizable && customPrice === null && (
                                <p className={styles.hint}>
                                    Enter a value inside the range for every dimension to get a price.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.foot}>
                    <div className={styles.priceBox}>
                        <span>Unit price</span>
                        <strong>{canAdd ? money(unitPrice) : '—'}</strong>
                    </div>
                    <button
                        type="button"
                        className={styles.addBtn}
                        onClick={submit}
                        disabled={!canAdd}
                    >
                        <Plus size={16} /> Add to quotation
                    </button>
                </div>
            </div>
        </div>
    );
}
