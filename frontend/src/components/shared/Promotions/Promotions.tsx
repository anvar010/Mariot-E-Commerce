'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { X } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { resolveUrl } from '@/utils/resolveUrl';
import styles from './Promotions.module.css';

interface Promotion {
    id: number;
    display_type: 'banner_top' | 'popup_modal';
    title?: string;
    title_ar?: string;
    description?: string;
    description_ar?: string;
    image_url?: string;
    coupon_code?: string;
    cta_text?: string;
    cta_text_ar?: string;
    cta_link?: string;
    bg_color?: string;
    text_color?: string;
    popup_trigger?: 'on_load' | 'delay_seconds' | 'scroll_percent' | 'exit_intent';
    popup_trigger_value?: number;
    popup_frequency?: 'every_visit' | 'once_per_session' | 'once_per_days';
    popup_frequency_value?: number;
    updated_at?: string;
}

const ADMIN_PATH_PATTERNS = [/^\/admin(\/|$)/, /^\/[a-z]{2}\/admin(\/|$)/];

const resolvePageKey = (pathname: string): string => {
    const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
    if (stripped === '/' || stripped === '') return 'home';
    if (stripped.startsWith('/shop')) return 'shop';
    if (stripped.startsWith('/category')) return 'category';
    if (stripped.startsWith('/product')) return 'product';
    if (stripped.startsWith('/today-offers')) return 'today_offers';
    if (stripped.startsWith('/all-categories')) return 'all_categories';
    if (stripped.startsWith('/shop-by-brands')) return 'shop_by_brands';
    if (stripped.startsWith('/cart') || stripped.startsWith('/checkout')) return 'cart_checkout';
    if (stripped.startsWith('/about') || stripped.startsWith('/contact')) return 'about_contact';
    return 'other';
};

// Key includes updated_at so editing/re-saving a banner makes it reappear
// (admins kept asking why their fresh changes were dismissed for the session)
const promoVersion = (p: Promotion) => `${p.id}_${p.updated_at || 'v0'}`;
const dismissedKey = (p: Promotion) => `promo_dismissed_${promoVersion(p)}`;
const seenKey = (p: Promotion) => `promo_seen_${promoVersion(p)}`;

const isPopupSuppressed = (p: Promotion): boolean => {
    if (typeof window === 'undefined') return true;
    const seenAt = localStorage.getItem(seenKey(p));
    if (!seenAt) return false;
    if (p.popup_frequency === 'every_visit') return false;
    if (p.popup_frequency === 'once_per_session') {
        return sessionStorage.getItem(seenKey(p)) === '1';
    }
    if (p.popup_frequency === 'once_per_days') {
        const seenTs = parseInt(seenAt, 10);
        const days = p.popup_frequency_value || 7;
        const ms = days * 24 * 60 * 60 * 1000;
        return Date.now() - seenTs < ms;
    }
    return false;
};

const markPopupSeen = (p: Promotion) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(seenKey(p), Date.now().toString());
    sessionStorage.setItem(seenKey(p), '1');
};

const PromoBanner: React.FC<{ promo: Promotion; isArabic: boolean }> = ({ promo, isArabic }) => {
    const [hidden, setHidden] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return sessionStorage.getItem(dismissedKey(promo)) === '1';
    });
    const [copied, setCopied] = useState(false);

    if (hidden) return null;
    const title = (isArabic && promo.title_ar) ? promo.title_ar : promo.title;
    const cta = (isArabic && promo.cta_text_ar) ? promo.cta_text_ar : promo.cta_text;

    const copyCoupon = async () => {
        if (!promo.coupon_code) return;
        try {
            await navigator.clipboard.writeText(promo.coupon_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* ignore */ }
    };

    return (
        <div
            role="region"
            aria-label="Promotional banner"
            className={styles.banner}
            style={{
                background: promo.bg_color || '#ff3b30',
                color: promo.text_color || '#fff'
            }}
        >
            <span className={styles.bannerTitle}>{title}</span>
            {promo.coupon_code && (
                <button
                    onClick={copyCoupon}
                    className={styles.bannerCoupon}
                    style={{
                        background: copied ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)',
                        color: copied ? (promo.bg_color || '#ff3b30') : 'inherit'
                    }}
                    title={isArabic ? 'انقر للنسخ' : 'Click to copy'}
                >
                    {copied ? (isArabic ? 'تم النسخ!' : 'Copied!') : promo.coupon_code}
                </button>
            )}
            {cta && promo.cta_link && (
                <a href={promo.cta_link} className={styles.bannerCta}>
                    {cta}
                </a>
            )}
            <button
                aria-label="Dismiss banner"
                onClick={() => {
                    sessionStorage.setItem(dismissedKey(promo), '1');
                    setHidden(true);
                }}
                className={styles.bannerClose}
            >
                <X size={16} />
            </button>
        </div>
    );
};

const PromoPopup: React.FC<{ promo: Promotion; isArabic: boolean }> = ({ promo, isArabic }) => {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isPopupSuppressed(promo)) return;

        const trigger = promo.popup_trigger || 'delay_seconds';
        const value = promo.popup_trigger_value || 5;
        let cleanup = () => {};

        const show = () => {
            setOpen(true);
            markPopupSeen(promo);
        };

        if (trigger === 'on_load') {
            const id = setTimeout(show, 200);
            cleanup = () => clearTimeout(id);
        } else if (trigger === 'delay_seconds') {
            const id = setTimeout(show, value * 1000);
            cleanup = () => clearTimeout(id);
        } else if (trigger === 'scroll_percent') {
            const handler = () => {
                const doc = document.documentElement;
                const scrolled = (window.scrollY / Math.max(1, doc.scrollHeight - doc.clientHeight)) * 100;
                if (scrolled >= value) {
                    show();
                    window.removeEventListener('scroll', handler);
                }
            };
            window.addEventListener('scroll', handler, { passive: true });
            cleanup = () => window.removeEventListener('scroll', handler);
        } else if (trigger === 'exit_intent') {
            const handler = (e: MouseEvent) => {
                if (e.clientY <= 0) {
                    show();
                    document.removeEventListener('mouseout', handler);
                }
            };
            document.addEventListener('mouseout', handler);
            cleanup = () => document.removeEventListener('mouseout', handler);
        }

        return cleanup;
    }, [promo]);

    if (!open) return null;

    const title = (isArabic && promo.title_ar) ? promo.title_ar : promo.title;
    const description = (isArabic && promo.description_ar) ? promo.description_ar : promo.description;
    const cta = (isArabic && promo.cta_text_ar) ? promo.cta_text_ar : promo.cta_text;

    const copyCoupon = async () => {
        if (!promo.coupon_code) return;
        try {
            await navigator.clipboard.writeText(promo.coupon_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {}
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
            className={styles.popupOverlay}
        >
            <div onClick={(e) => e.stopPropagation()} className={styles.popupCard}>
                <button aria-label="Close" onClick={() => setOpen(false)} className={styles.popupClose}>
                    <X size={18} />
                </button>

                {promo.image_url && (
                    <img
                        src={resolveUrl(promo.image_url)}
                        alt={title || 'Promotion'}
                        className={styles.popupImage}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}

                <div className={styles.popupBody} style={{ textAlign: isArabic ? 'right' : 'left', direction: isArabic ? 'rtl' : 'ltr' }}>
                    {title && <h2 className={styles.popupTitle}>{title}</h2>}
                    {description && <p className={styles.popupDesc}>{description}</p>}
                    {promo.coupon_code && (
                        <button
                            onClick={copyCoupon}
                            type="button"
                            title={isArabic ? 'انقر للنسخ' : 'Click to copy'}
                            className={styles.popupCoupon}
                            style={{
                                background: copied ? '#dcfce7' : '#f3f4f6',
                                border: `2px dashed ${copied ? '#16a34a' : '#9ca3af'}`
                            }}
                        >
                            <div className={styles.popupCouponLabel} style={{ color: copied ? '#166534' : '#6b7280' }}>
                                {copied
                                    ? (isArabic ? 'تم النسخ!' : 'COPIED!')
                                    : (isArabic ? 'كود الخصم — انقر للنسخ' : 'COUPON CODE — CLICK TO COPY')}
                            </div>
                            <div className={styles.popupCouponCode} style={{ color: copied ? '#15803d' : '#111' }}>
                                {promo.coupon_code}
                            </div>
                        </button>
                    )}
                    {cta && (
                        promo.cta_link ? (
                            <a
                                href={promo.cta_link}
                                className={styles.popupCta}
                                style={{
                                    background: promo.bg_color || '#ff3b30',
                                    color: promo.text_color || '#fff'
                                }}
                            >
                                {cta}
                            </a>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className={styles.popupCta}
                                style={{
                                    background: promo.bg_color || '#ff3b30',
                                    color: promo.text_color || '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    width: '100%',
                                    fontFamily: 'inherit'
                                }}
                            >
                                {cta}
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const Promotions: React.FC = () => {
    const pathname = usePathname() || '/';
    const locale = useLocale();
    const isArabic = locale === 'ar';
    const [banner, setBanner] = useState<Promotion | null>(null);
    const [popup, setPopup] = useState<Promotion | null>(null);

    const isAdminRoute = useMemo(
        () => ADMIN_PATH_PATTERNS.some(re => re.test(pathname)),
        [pathname]
    );
    const pageKey = useMemo(() => resolvePageKey(pathname), [pathname]);

    useEffect(() => {
        if (isAdminRoute) { setBanner(null); setPopup(null); return; }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/cms/promotions/active?page=${encodeURIComponent(pageKey)}`);
                if (!res.ok) return;
                const json = await res.json();
                if (cancelled || !json?.success) return;
                setBanner(json.data?.banner || null);
                setPopup(json.data?.popup || null);
            } catch { /* silently ignore */ }
        })();
        return () => { cancelled = true; };
    }, [pageKey, isAdminRoute]);

    if (isAdminRoute) return null;

    return (
        <>
            {banner && <PromoBanner promo={banner} isArabic={isArabic} />}
            {popup && <PromoPopup promo={popup} isArabic={isArabic} />}
        </>
    );
};

export default Promotions;
