'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Heart,
    ShoppingCart,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Truck,
    Award,
    ShieldCheck,
    RotateCcw,
    Headset,
    X,
    Send,
    Trash2,
    Star,
    FileDown,
    FileText,
    Search,
    Mail,
    HelpCircle,
    Tag,
    Upload,
    Maximize2,
    PlayCircle,
    Info,
    ListChecks
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import styles from './ProductDetail.module.css';
import { API_BASE_URL, BASE_URL } from '@/config';
import { resolveUrl } from '@/utils/resolveUrl';
import { getAuthHeaders } from '@/utils/authHeaders';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Loader from '@/components/shared/Loader/Loader';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Link from 'next/link';
import { MessageSquare, Phone } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface ProductDetailProps {
    id: string;
}

const TrustItem = ({ icon, title, text }: any) => (
    <div className={styles.trustItem}>
        <div>
            {icon}
        </div>
        <div className={styles.trustContent}>
            <h4>{title}</h4>
            <p>{text}</p>
        </div>
    </div>
);

const AccordionItem = ({ title, icon, isOpen, onToggle, children }: any) => (
    <div className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}>
        <button className={styles.accordionHeader} onClick={onToggle}>
            <div className={styles.accordionHeaderLeft}>
                {icon && <span className={styles.accordionHeaderIcon}>{icon}</span>}
                <span className={styles.accordionHeaderText}>{title}</span>
            </div>
            <div className={styles.accordionHeaderRight}>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                    <ChevronDown size={20} />
                </motion.div>
            </div>
        </button>
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                    <div className={styles.accordionContent}>{children}</div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

// ── Frequently Bought Together Widget ─────────────────────────────────────────
const FbtSection = ({ currentProduct, fbtProducts, locale, isArabic, resolveUrl, addToCart, showNotification, t }: any) => {
    const allItems = fbtProducts;
    const [checked, setChecked] = useState<Record<number, boolean>>(() =>
        Object.fromEntries(allItems.map((p: any) => [p.id, true]))
    );
    const [adding, setAdding] = useState(false);

    const [fbtEmblaRef, fbtEmblaApi] = useEmblaCarousel({
        loop: false,
        direction: locale === 'ar' ? 'rtl' : 'ltr',
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true
    });

    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const onSelect = useCallback((api: any) => {
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, []);

    useEffect(() => {
        if (!fbtEmblaApi) return;
        onSelect(fbtEmblaApi);
        fbtEmblaApi.on('select', onSelect);
        fbtEmblaApi.on('reInit', onSelect);
    }, [fbtEmblaApi, onSelect]);

    const toggle = (id: number) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

    const selectedItems = allItems.filter((p: any) => checked[p.id]);
    const total = selectedItems.reduce((sum: number, p: any) => {
        const price = Number(p.offer_price && Number(p.offer_price) > 0 ? p.offer_price : p.price) || 0;
        return sum + price;
    }, 0);

    const getName = (p: any) => (isArabic && p.name_ar) ? p.name_ar : p.name;
    const getPrice = (p: any) => Number(p.offer_price && Number(p.offer_price) > 0 ? p.offer_price : p.price) || 0;
    const getImg = (p: any) => resolveUrl(p.primary_image || (p.images && p.images[0]?.image_url)) || '/assets/placeholder-image.webp';

    const handleAddAll = async () => {
        if (selectedItems.length === 0) return;
        setAdding(true);
        let anyFailed = false;
        for (const p of selectedItems) {
            const ok = await addToCart({
                id: p.id,
                name: p.name,
                price: getPrice(p),
                image: getImg(p),
                brand: p.brand_name || '',
                slug: p.slug,
                stock_quantity: p.stock_quantity ?? 999,
                quantity: 1,
                oldPrice: Number(p.price) || 0
            }, { silent: true });
            if (!ok) anyFailed = true;
        }
        setAdding(false);
        if (!anyFailed) {
            showNotification(t('fbt.addSuccess'), 'success');
        }
    };

    return (
        <div className={`${styles.extraSection} ${styles.fbtSectionRoot}`}>
            <div className={styles.sectionTitle}>
                <h2>{t('fbt.title')}</h2>
            </div>

            <div className={styles.sliderWrapper}>
                <button
                    className={`${styles.sliderArrow} ${styles.prevArrow} ${(!canScrollPrev || allItems.length <= 8) ? styles.arrowHidden : ''}`}
                    onClick={() => fbtEmblaApi?.scrollPrev()}
                >
                    <ChevronLeft size={24} />
                </button>

                <div className={styles.fbtViewport} ref={fbtEmblaRef}>
                    <div className={styles.fbtGrid}>
                        {allItems.map((p: any, idx: number) => {
                            const isChecked = !!checked[p.id];
                            const price = getPrice(p);
                            return (
                                <div key={p.id} className={styles.fbtSlide}>
                                    {idx > 0 && (
                                        <div className={styles.fbtSeparator}>
                                            +
                                        </div>
                                    )}

                                    <div
                                        className={`${styles.fbtCard} ${isChecked ? styles.fbtCardActive : ''}`}
                                    >
                                        <div
                                            className={`${styles.fbtBadge} ${isChecked ? styles.fbtBadgeActive : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggle(p.id);
                                            }}
                                        >
                                            {isChecked && (
                                                <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                                                    <path d="M2.5 6.5L5.5 9.5L10.5 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>

                                        <Link href={`/${locale}/product/${p.slug}`} className={styles.fbtCardLink}>
                                            <img
                                                src={getImg(p)}
                                                alt={getName(p)}
                                                className={styles.fbtImage}
                                            />

                                            <div className={styles.fbtInfo}>
                                                <div className={styles.fbtName}>{getName(p)}</div>
                                                <div className={styles.fbtPrice}>
                                                    AED {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    className={`${styles.sliderArrow} ${styles.nextArrow} ${(!canScrollNext || allItems.length <= 8) ? styles.arrowHidden : ''}`}
                    onClick={() => fbtEmblaApi?.scrollNext()}
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            <div className={styles.fbtSummary}>
                <div className={styles.fbtSelectedInfo}>
                    <div className={styles.fbtTotalLabel}>
                        {selectedItems.length === 1
                            ? t('fbt.itemSelected')
                            : t('fbt.itemsSelected', { count: selectedItems.length })}
                    </div>
                    <div className={styles.fbtTotalPrice}>
                        <span className={styles.fbtTotalCurrency}>AED</span>
                        {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <button
                    className={styles.fbtAddBtn}
                    onClick={handleAddAll}
                    disabled={selectedItems.length === 0 || adding}
                >
                    <ShoppingCart size={20} />
                    {adding ? t('fbt.adding') : t('fbt.addAll')}
                </button>
            </div>
        </div>
    );
};

const ProductDetail: React.FC<ProductDetailProps> = ({ id }) => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [qty, setQty] = useState(1);
    const [selectedValues, setSelectedValues] = useState<Record<number, string>>({});
    const [showTabbyModal, setShowTabbyModal] = useState(false);
    const [showPriceMatchModal, setShowPriceMatchModal] = useState(false);
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
        specs: true,
        description: true
    });
    const [isShortDescExpanded, setIsShortDescExpanded] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isQtyOpen, setIsQtyOpen] = useState(false);
    const qtyRef = useRef<HTMLDivElement>(null);

    const mainSwiperRef = useRef<any>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (qtyRef.current && !qtyRef.current.contains(event.target as Node)) {
                setIsQtyOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (mainSwiperRef.current && mainSwiperRef.current.activeIndex !== currentImageIndex) {
            mainSwiperRef.current.slideTo(currentImageIndex);
        }
    }, [currentImageIndex]);

    // Price Match Form State
    const [pmForm, setPmForm] = useState({
        shopName: '',
        email: '',
        phone: '',
        file: null as File | null,
        agreed: false
    });
    const [isPmSubmitting, setIsPmSubmitting] = useState(false);
    const pmFileRef = useRef<HTMLInputElement>(null);

    const handlePriceMatchSubmit = async () => {
        if (!pmForm.agreed) {
            showNotification(t('agreeToTerms'), 'error');
            return;
        }

        if (!pmForm.shopName || !pmForm.email || !pmForm.phone) {
            showNotification(t('fillRequiredFields'), 'error');
            return;
        }

        setIsPmSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('shopName', pmForm.shopName);
            formData.append('email', pmForm.email);
            formData.append('phone', pmForm.phone);
            formData.append('productName', getLocalizedField('name', 'name_ar'));
            formData.append('productUrl', window.location.href);
            if (pmForm.file) {
                formData.append('file', pmForm.file);
            }

            const res = await fetch('/api/price-match', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                showNotification(t('requestSuccess'), 'success');
                setShowPriceMatchModal(false);
                setPmForm({ shopName: '', email: '', phone: '', file: null, agreed: false });
            } else {
                throw new Error(data.message || 'Failed to submit');
            }
        } catch (err) {
            console.error('Price Match Error:', err);
            showNotification(t('requestError'), 'error');
        } finally {
            setIsPmSubmitting(false);
        }
    };

    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const { user, token } = useAuth();
    const { showNotification } = useNotification();
    const locale = useLocale();
    const t = useTranslations('product');
    const isArabic = locale === 'ar';

    const [relatedEmblaRef, relatedEmblaApi] = useEmblaCarousel({
        loop: false,
        direction: locale === 'ar' ? 'rtl' : 'ltr',
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true
    });


    // Helper to get localized product field
    const getLocalizedField = (enField: string, arField: string) => {
        if (isArabic && product?.[arField]) return product[arField];
        return product?.[enField] || '';
    };

    // Helper to clean WooCommerce/Visual Composer shortcodes
    const cleanShortcodes = (content: string) => {
        if (!content) return '';

        // Remove all [vc_...] and [/vc_...] tags
        let cleaned = content.replace(/\[\/?vc_[^\]]*\]/g, '');

        // Handle escaped newlines if they exist
        cleaned = cleaned.replace(/\\n/g, '<br/>');

        // Clean up multiple line breaks
        cleaned = cleaned.replace(/(<br\/>\s*){3,}/g, '<br/><br/>');

        return cleaned.trim();
    };

    // Related & Reviews states
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewStats, setReviewStats] = useState<any>({ averageRating: 0, totalReviews: 0 });
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [cartAdded, setCartAdded] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setProduct(data.data);
                    // Auto-select default variant; fall back to first value of each option
                    if (data.data.has_variants === 1 && Array.isArray(data.data.options) && Array.isArray(data.data.variants)) {
                        const activeVariants = data.data.variants.filter((v: any) => v.is_active !== 0 && v.is_active !== false && v.is_active !== '0');
                        
                        // Prefer a default variant that has valid options populated
                        let defaultVariant = activeVariants.find((v: any) => (v.is_default === 1 || v.is_default === true || v.is_default === '1') && Array.isArray(v.options) && v.options.length > 0);
                        
                        if (!defaultVariant) {
                            defaultVariant = activeVariants.find((v: any) => (v.is_default === 1 || v.is_default === true || v.is_default === '1'));
                        }
                        if (!defaultVariant) {
                            defaultVariant = activeVariants[0];
                        }

                        const defaults: Record<number, string> = {};
                        if (defaultVariant && Array.isArray(defaultVariant.options) && defaultVariant.options.length > 0) {
                            defaultVariant.options.forEach((vo: any) => {
                                const key = (vo.value || '').trim() || (vo.value_ar || '').trim();
                                if (key) defaults[vo.option_id] = key;
                            });
                        } else if (defaultVariant && defaultVariant.options_signature) {
                            // Fallback to parsing the signature if options array is missing
                            defaultVariant.options_signature.split('|').forEach((part: string) => {
                                const [optId, ...valParts] = part.split(':');
                                if (optId && valParts.length > 0) {
                                    defaults[Number(optId)] = valParts.join(':');
                                }
                            });
                        }
                        
                        // If defaults is still empty, grab the first value of each option
                        if (Object.keys(defaults).length === 0) {
                            data.data.options.forEach((o: any) => {
                                const firstVal = o.values?.[0];
                                if (firstVal) {
                                    const key = (firstVal.value || '').trim() || (firstVal.value_ar || '').trim();
                                    if (key) defaults[o.id] = key;
                                }
                            });
                        }
                        setSelectedValues(defaults);
                    }
                    // Try categories from most specific to least specific
                    const categoriesToTry = [
                        data.data.sub_sub_category_id,
                        data.data.sub_category_id,
                        data.data.category_id,
                        data.data.category_slug
                    ].filter(Boolean);

                    fetchRelated(categoriesToTry, data.data.id);
                    fetchReviews(data.data.id);
                }
            } catch (err) {
                console.error("Error fetching product:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchRelated = async (categories: (string | number)[], currentProductId: number) => {
            if (!categories || categories.length === 0) return;

            for (const cat of categories) {
                try {
                    const res = await fetch(`${API_BASE_URL}/products?category=${cat}&limit=16`, { credentials: "include" });
                    const data = await res.json();
                    if (data.success) {
                        const filtered = data.data.filter((p: any) => p.id !== currentProductId);
                        if (filtered.length > 0) {
                            setRelatedProducts(filtered);
                            return; // Found related products, stop searching
                        }
                    }
                } catch (err) {
                    console.error("Error fetching related products for", cat, err);
                }
            }
        };

        const fetchReviews = async (productId: number) => {
            try {
                const res = await fetch(`${API_BASE_URL}/reviews/${productId}`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setReviews(data.data || []);
                    setReviewStats({
                        averageRating: data.stats?.averageRating ? parseFloat(data.stats.averageRating) : 0,
                        totalReviews: data.stats?.totalReviews || 0
                    });
                }
            } catch (err) {
                console.error("Error fetching reviews:", err);
            }
        };

        fetchProduct();
    }, [id]);

    useEffect(() => {
        if (loading) return;
        const hash = window.location.hash;
        if (!hash) return;
        const timer = setTimeout(() => {
            const el = document.querySelector(hash) as HTMLElement | null;
            if (!el) return;
            const stickyHeader = document.querySelector('header') as HTMLElement | null;
            const offset = stickyHeader ? stickyHeader.offsetHeight : 80;
            const top = el.getBoundingClientRect().top + window.scrollY - offset - 16;
            window.scrollTo({ top, behavior: 'smooth' });
        }, 800);
        return () => clearTimeout(timer);
    }, [loading]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !token) return;

        setIsSubmittingReview(true);
        setReviewError('');

        try {
            const res = await fetch(`${API_BASE_URL}/reviews`, {
                credentials: "include",
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_id: product.id,
                    rating,
                    comment
                })
            });

            const data = await res.json();
            if (data.success) {
                setShowReviewForm(false);
                setComment('');
                setRating(5);
                // Refresh reviews
                const reviewRes = await fetch(`${API_BASE_URL}/reviews/${product.id}`, { credentials: "include" });
                const reviewData = await reviewRes.json();
                if (reviewData.success) {
                    setReviews(reviewData.data || []);
                    setReviewStats({
                        averageRating: reviewData.stats?.averageRating ? parseFloat(reviewData.stats.averageRating) : 0,
                        totalReviews: reviewData.stats?.totalReviews || 0
                    });
                }
            } else {
                setReviewError(data.message || t('failedDeleteReview')); // Use failed delete or generic
            }
        } catch (err) {
            setReviewError(t('genericError'));
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleDeleteReview = async (reviewId: number) => {
        if (!token) return;
        if (!window.confirm(t('confirmDeleteReview'))) return;

        try {
            const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
                method: 'DELETE',
                credentials: "include",
                headers: getAuthHeaders()
            });

            const data = await res.json();
            if (data.success) {
                // Refresh reviews
                const reviewRes = await fetch(`${API_BASE_URL}/reviews/${product.id}`, { credentials: "include" });
                const reviewData = await reviewRes.json();
                if (reviewData.success) {
                    setReviews(reviewData.data || []);
                    setReviewStats({
                        averageRating: reviewData.stats?.averageRating ? parseFloat(reviewData.stats.averageRating) : 0,
                        totalReviews: reviewData.stats?.totalReviews || 0
                    });
                }
            } else {
                showNotification(data.message || t('failedDeleteReview'), 'error');
            }
        } catch (err) {
            console.error('Error deleting review:', err);
            showNotification(t('genericError'), 'error');
        }
    };

    const thumbScrollRef = useRef<HTMLDivElement>(null);
    const [isDraggingThumbs, setIsDraggingThumbs] = useState(false);
    const [startXThumbs, setStartXThumbs] = useState(0);
    const [scrollLeftThumbs, setScrollLeftThumbs] = useState(0);

    const handleThumbMouseDown = (e: React.MouseEvent) => {
        if (!thumbScrollRef.current) return;
        setIsDraggingThumbs(true);
        setStartXThumbs(e.pageX - thumbScrollRef.current.offsetLeft);
        setScrollLeftThumbs(thumbScrollRef.current.scrollLeft);
        e.preventDefault();
    };

    const handleThumbMouseLeave = () => setIsDraggingThumbs(false);
    const handleThumbMouseUp = () => setIsDraggingThumbs(false);

    const handleThumbMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingThumbs || !thumbScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - thumbScrollRef.current.offsetLeft;
        const walk = (x - startXThumbs) * 1.1;
        thumbScrollRef.current.scrollLeft = scrollLeftThumbs - walk;
    };

    if (loading) return <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>;
    if (!product) {
        return (
            <div className={styles.productDetail} style={{ padding: 0 }}>
                <div className={styles.notFoundSection}>
                    <div className={styles.notFoundIcon}>
                        <Search size={100} strokeWidth={1} />
                    </div>
                    <h1>{t('productNotFound')}</h1>
                    <p>
                        We're sorry, but the product you're looking for doesn't exist or has been moved.
                        Try searching for something else or browse our categories.
                    </p>
                    <Link href={`/${locale}/shop`} className={styles.backHomeBtn}>
                        Back to Shop
                    </Link>
                </div>

                <div className={styles.supportBanner}>
                    <div className={styles.supportContainer}>
                        <div className={styles.supportTextSide}>
                            <h2>We're always ready to help</h2>
                            <p>Reach out to us through any of these support channels</p>
                        </div>
                        <div className={styles.supportActionsSide}>
                            <div className={styles.supportItem}>
                                <div className={styles.supportIconCircle}>
                                    <Phone size={24} fill="currentColor" color="white" />
                                </div>
                                <div className={styles.supportInfo}>
                                    <h4>Phone Support</h4>
                                    <p>+971 4 288 2777</p>
                                </div>
                            </div>
                            <div className={styles.supportItem}>
                                <div className={styles.supportIconCircle}>
                                    <Mail size={24} fill="currentColor" color="white" />
                                </div>
                                <div className={styles.supportInfo}>
                                    <h4>Info Email</h4>
                                    <p>info@mariot-group.com</p>
                                </div>
                            </div>
                            <div className={styles.supportItem}>
                                <div className={styles.supportIconCircle}>
                                    <Headset size={24} color="white" />
                                </div>
                                <div className={styles.supportInfo}>
                                    <h4>Help Center</h4>
                                    <p>help@mariot-group.com</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isFav = isInWishlist(product.id);

    const resolveUrlLocal = resolveUrl;

    // ── Variant resolution ────────────────────────────────────────────────
    const hasVariants = product.has_variants === 1
        && Array.isArray(product.options) && product.options.length > 0
        && Array.isArray(product.variants) && product.variants.length > 0;

    // Only active variants are shown on the storefront
    const productVariants: any[] = hasVariants
        ? product.variants.filter((v: any) => v.is_active !== 0 && v.is_active !== false && v.is_active !== '0')
        : [];

    // Build options with cascading filtering:
    // For each option at position i, only show values that have at least one active variant
    // which also matches every already-selected option at positions 0..i-1.
    const allRawOptions: any[] = hasVariants ? product.options : [];

    const productOptions: any[] = allRawOptions.map((opt: any, optIdx: number) => {
        // Collect the selections for all options BEFORE this one
        const priorSelections = allRawOptions
            .slice(0, optIdx)
            .map((prevOpt: any) => ({ optionId: prevOpt.id, value: selectedValues[prevOpt.id] }))
            .filter((s: any) => !!s.value);

        const activeValues = new Map<string, string | null>();
        productVariants.forEach((v: any) => {
            // Check that this variant satisfies all prior selections
            const matchesPrior = priorSelections.every((sel: any) => {
                const vo = v.options?.find((o: any) => o.option_id === sel.optionId);
                return vo && ((vo.value || '').trim() || (vo.value_ar || '').trim()) === sel.value;
            });
            if (!matchesPrior) return;

            const vo = v.options?.find((o: any) => o.option_id === opt.id);
            if (vo) {
                const key = (vo.value || '').trim() || (vo.value_ar || '').trim();
                if (key && !activeValues.has(key)) activeValues.set(key, vo.value_ar || null);
            }
        });

        return {
            ...opt,
            values: Array.from(activeValues.entries()).map(([value, value_ar]) => ({ value, value_ar }))
        };
    }).filter((opt: any) => opt.values.length > 0);

    const variantSignature = (values: Record<number, string>) => {
        const ids = productOptions.map(o => o.id).sort((a, b) => a - b);
        return ids.map(oid => `${oid}:${values[oid] ?? ''}`).join('|');
    };

    const allOptionsSelected = hasVariants && productOptions.every(o => !!selectedValues[o.id]);
    const selectedVariant = allOptionsSelected
        ? productVariants.find((v: any) => v.options_signature === variantSignature(selectedValues)) || null
        : null;

    const variantHasOffer = !!(selectedVariant && selectedVariant.offer_price !== null && Number(selectedVariant.offer_price) > 0);
    const productHasOffer = !!(product.offer_price && Number(product.offer_price) > 0);
    const hasOffer = selectedVariant ? variantHasOffer : productHasOffer;

    const displayPrice = selectedVariant
        ? (variantHasOffer ? Number(selectedVariant.offer_price) : Number(selectedVariant.price))
        : (productHasOffer ? Number(product.offer_price) : Number(product.price || 0));
    const oldPrice = selectedVariant
        ? (variantHasOffer ? Number(selectedVariant.price) : null)
        : (productHasOffer ? Number(product.price) : null);

    const variantsTotalStock = hasVariants
        ? productVariants.reduce((s: number, v: any) => s + Number(v.stock_quantity || 0), 0)
        : 0;
    const effectiveStock = hasVariants
        ? (selectedVariant ? Number(selectedVariant.stock_quantity) : variantsTotalStock)
        : Number(product.stock_quantity || 0);

    const baseImages: string[] = product.images?.length > 0
        ? product.images.map((img: any) => resolveUrl(img.image_url))
        : ['/assets/placeholder-image.webp'];
    const images: string[] = (selectedVariant && !selectedVariant.use_primary_image && selectedVariant.image_url)
        ? [resolveUrl(selectedVariant.image_url), ...baseImages]
        : baseImages;

    const variantLabel = selectedVariant
        ? productOptions
            .map(o => {
                const val = selectedValues[o.id];
                const valMeta = o.values?.find((v: any) => v.value === val);
                const optName = (isArabic && o.name_ar) ? o.name_ar : o.name;
                const valLabel = (isArabic && valMeta?.value_ar) ? valMeta.value_ar : val;
                return `${optName}: ${valLabel}`;
            })
            .join(' / ')
        : '';

    const toggleWishlist = () => {
        if (isFav) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist({
                id: product.id,
                name: product.name,
                price: displayPrice,
                image: images[0],
                brand: product.brand_name
            });
        }
    };


    const handleAddToCart = async () => {
        if (hasVariants && !selectedVariant) {
            showNotification(t('selectOptionsFirst', { defaultValue: 'Please select all options first' }), 'error');
            return;
        }
        const success = await addToCart({
            id: product.id,
            variant_id: selectedVariant?.id || null,
            variant_label: variantLabel || undefined,
            name: product.name,
            price: displayPrice,
            image: images[0],
            brand: product.brand_name,
            slug: product.slug,
            stock_quantity: effectiveStock,
            track_inventory: hasVariants ? 1 : product.track_inventory,
            quantity: qty,
            oldPrice: oldPrice
        });

        if (success) {
            setCartAdded(true);
            setTimeout(() => setCartAdded(false), 2000);
        }
    };

    const toggleAccordion = (key: string) => {
        setExpandedAccordions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const monthlyPayment = (displayPrice / 4).toFixed(2);

    // Calculate if video exists
    const videoDataRaw = product.youtube_video_link;
    let videoLinks: string[] = [];
    if (videoDataRaw) {
        try {
            const parsed = JSON.parse(videoDataRaw);
            if (Array.isArray(parsed)) {
                videoLinks = parsed.filter(v => v && v.trim() !== '');
            } else if (parsed && typeof parsed === 'object' && parsed.links) {
                videoLinks = parsed.links.filter((v: string) => v && v.trim() !== '');
            } else {
                videoLinks = [videoDataRaw].filter(v => v && v.trim() !== '');
            }
        } catch {
            videoLinks = [String(videoDataRaw)].filter(v => v && v.trim() !== '');
        }
    }
    const hasVideo = videoLinks.length > 0;

    // Calculate Rating Stats once per render
    const reviewsCount = reviews.length;
    const avgRatingRaw = reviewsCount > 0 ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviewsCount : 0;

    // Title Stars logic
    const fullStarsTitle = Math.floor(avgRatingRaw);
    const hasHalfTitle = avgRatingRaw - fullStarsTitle >= 0.25 && avgRatingRaw - fullStarsTitle < 0.75;
    const roundUpTitle = avgRatingRaw - fullStarsTitle >= 0.75;

    // Review Summary Stars logic
    const totalReviewsSummary = reviews.length;
    const avgRatingSummary = totalReviewsSummary > 0 ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / totalReviewsSummary : 0;
    const fullStarsSummary = Math.floor(avgRatingSummary);
    const hasHalfSummary = avgRatingSummary - fullStarsSummary >= 0.25 && avgRatingSummary - fullStarsSummary < 0.75;
    const roundUpSummary = avgRatingSummary - fullStarsSummary >= 0.75;

    return (
        <div className={styles.productDetail}>
            <div className={styles.container}>
                {/* Breadcrumbs */}
                <div className={styles.breadcrumbs}>
                    <Link href={`/${locale}`} className={styles.breadcrumbLink}>{isArabic ? 'الرئيسية' : 'Home'}</Link>
                    <span className={styles.breadcrumbSeparator}>/</span>
                    <Link href={`/${locale}/shop`} className={styles.breadcrumbLink}>{isArabic ? 'المتجر' : 'Shop'}</Link>

                    {product.category_name && (
                        <>
                            <span className={styles.breadcrumbSeparator}>/</span>
                            <Link
                                href={`/${locale}/shop?category=${product.category_slug}`}
                                className={styles.breadcrumbLink}
                            >
                                {isArabic && product.category_name_ar ? product.category_name_ar : product.category_name}
                            </Link>
                        </>
                    )}

                    {product.sub_category_name && (
                        <>
                            <span className={styles.breadcrumbSeparator}>/</span>
                            <Link
                                href={`/${locale}/shop?category=${product.sub_category_slug}`}
                                className={styles.breadcrumbLink}
                            >
                                {isArabic && product.sub_category_name_ar ? product.sub_category_name_ar : product.sub_category_name}
                            </Link>
                        </>
                    )}

                    {product.sub_sub_category_name && (
                        <>
                            <span className={styles.breadcrumbSeparator}>/</span>
                            <Link
                                href={`/${locale}/shop?category=${product.sub_sub_category_name}`}
                                className={styles.breadcrumbLink}
                            >
                                {isArabic && product.sub_sub_category_name_ar ? product.sub_sub_category_name_ar : product.sub_sub_category_name}
                            </Link>
                        </>
                    )}

                    <span className={styles.breadcrumbSeparator}>/</span>
                    <span className={styles.breadcrumbCurrent}>{getLocalizedField('name', 'name_ar')}</span>
                </div>

                <div className={styles.layout}>

                    {/* Main Content (Left) */}
                    <div className={styles.mainContent}>
                        <div className={styles.topSection}>
                            {/* Gallery */}
                            <div className={styles.gallerySection}>
                                <div
                                    className={styles.stockBadge}
                                    style={{ backgroundColor: effectiveStock > 0 ? '#62d972' : '#ff4d4f' }}
                                >
                                    {effectiveStock > 0 ? t('inStock') : t('outOfStock')}
                                </div>
                                <button className={styles.wishlistBtn} onClick={toggleWishlist}>
                                    <Heart size={20} fill={isFav ? "#e31e24" : "none"} color={isFav ? "#e31e24" : "#999"} />
                                </button>

                                <div className={styles.mainImageWrapper}>
                                    <Swiper
                                        onSwiper={(swiper: any) => (mainSwiperRef.current = swiper)}
                                        spaceBetween={10}
                                        pagination={{
                                            clickable: true,
                                            el: `.${styles.swiperPagination}`,
                                            bulletClass: styles.swiperBullet,
                                            bulletActiveClass: styles.swiperBulletActive,
                                        }}
                                        modules={[Pagination]}
                                        className={styles.mainSwiper}
                                        onSlideChange={(swiper: any) => setCurrentImageIndex(swiper.activeIndex)}
                                        initialSlide={currentImageIndex}
                                    >
                                        {images.map((img: string, idx: number) => (
                                            <SwiperSlide key={idx} className={styles.mainSlide}>
                                                <img
                                                    src={img}
                                                    alt={`${getLocalizedField('name', 'name_ar')} - ${idx + 1}`}
                                                    className={styles.mainImage}
                                                />
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                    <button
                                        className={styles.expandBtn}
                                        onClick={() => setIsFullScreen(true)}
                                        title={isArabic ? 'تكبير الصورة' : 'Expand Image'}
                                    >
                                        <Maximize2 size={20} />
                                    </button>
                                    {/* Custom dots container, positioned beneath the image track */}
                                    <div className={styles.swiperPagination}></div>
                                </div>

                                <div className={styles.thumbnailsWrapper}>
                                    <button
                                        className={styles.navBtn}
                                        onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                                    >
                                        <ChevronLeft size={32} />
                                    </button>
                                    <div
                                        className={styles.thumbnails}
                                        ref={thumbScrollRef}
                                        onMouseDown={handleThumbMouseDown}
                                        onMouseLeave={handleThumbMouseLeave}
                                        onMouseUp={handleThumbMouseUp}
                                        onMouseMove={handleThumbMouseMove}
                                        style={{ cursor: isDraggingThumbs ? 'grabbing' : 'grab' }}
                                    >
                                        {images.map((img: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className={`${styles.thumbWrapper} ${currentImageIndex === idx ? styles.active : ''}`}
                                                onClick={() => setCurrentImageIndex(idx)}
                                            >
                                                <img src={img} alt={`Thumb ${idx}`} className={styles.thumbImage} />
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className={styles.navBtn}
                                        onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                                    >
                                        <ChevronRight size={32} />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className={styles.infoSection}>
                                {product.brand_image && (
                                    <div className={styles.brandLogoBox}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span className={styles.brandLabel}>{t('brand', { defaultValue: 'Brand' })}:</span>
                                            <Link
                                                href={`/shop?brand=${encodeURIComponent(product.brand_slug || product.brand_name?.toLowerCase().replace(/ /g, '-'))}`}
                                                className={styles.brandLogoWrapper}
                                            >
                                                <img src={resolveUrl(product.brand_image)} alt={getLocalizedField('brand_name', 'brand_name_ar')} className={styles.brandLogo} />
                                            </Link>
                                        </div>
                                        <div
                                            className={styles.brandRatingMobile}
                                            onClick={() => {
                                                const el = document.getElementById('reviews-section');
                                                if (el) {
                                                    const y = el.getBoundingClientRect().top + window.scrollY - 160;
                                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className={styles.titleStars}>
                                                {[1, 2, 3, 4, 5].map((star) => {
                                                    const isFull = star <= fullStarsTitle || (roundUpTitle && star <= fullStarsTitle + 1);
                                                    const isHalf = !isFull && hasHalfTitle && star === fullStarsTitle + 1;
                                                    return (
                                                        <div key={`mobile-star-${star}`} style={{ position: 'relative', width: 16, height: 16 }}>
                                                            <Star size={16} fill="none" color="#d1d5db" style={{ position: 'absolute', top: 0, insetInlineStart: 0 }} />
                                                            {(isFull || isHalf) && (
                                                                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: isHalf ? '50%' : '100%', height: '100%', overflow: 'hidden' }}>
                                                                    <Star size={16} fill="#f59e0b" color="#f59e0b" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <span className={styles.titleReviewCount}>
                                                <span>{avgRatingRaw.toFixed(1)}</span>
                                                <span>({reviewsCount} {reviewsCount === 1 ? t('review') : t('reviews')})</span>
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.titleRow}>
                                    <h1 className={styles.title}>{getLocalizedField('name', 'name_ar')}</h1>
                                    <div
                                        className={styles.titleRating}
                                        onClick={() => {
                                            const el = document.getElementById('reviews-section');
                                            if (el) {
                                                const y = el.getBoundingClientRect().top + window.scrollY - 160;
                                                window.scrollTo({ top: y, behavior: 'smooth' });
                                            }
                                        }}
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <div className={styles.titleStars}>
                                            {[1, 2, 3, 4, 5].map((star) => {
                                                const isFull = star <= fullStarsTitle || (roundUpTitle && star <= fullStarsTitle + 1);
                                                const isHalf = !isFull && hasHalfTitle && star === fullStarsTitle + 1;
                                                return (
                                                    <div key={`title-star-${star}`} style={{ position: 'relative', width: 16, height: 16 }}>
                                                        <Star size={16} fill="none" color="#d1d5db" style={{ position: 'absolute', top: 0, insetInlineStart: 0 }} />
                                                        {(isFull || isHalf) && (
                                                            <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: isHalf ? '50%' : '100%', height: '100%', overflow: 'hidden' }}>
                                                                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <span className={styles.titleReviewCount}>
                                            <span>{avgRatingRaw.toFixed(1)}</span>
                                            <span>({reviewsCount} {reviewsCount === 1 ? t('review') : t('reviews')})</span>
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.modelNumber}>{t('modelLabel')} : {product.model || product.slug?.toUpperCase() || product.id}</div>

                                {hasVariants && (
                                    <div className={styles.variantOptionsWrapper}>
                                        {productOptions.map((opt: any, optIdx: number) => {
                                            const optName = (isArabic && opt.name_ar) ? opt.name_ar : opt.name;
                                            const selectedVal = selectedValues[opt.id];
                                            const selectedMeta = opt.values?.find((v: any) =>
                                                (v.value.trim() || v.value_ar.trim()) === selectedVal
                                            );
                                            const selectedLabel = (isArabic && selectedMeta?.value_ar) ? selectedMeta.value_ar : (selectedMeta?.value || selectedVal);

                                            // Only the first option (e.g. Color) uses image cards.
                                            // All subsequent options (Size, Memory, etc.) always use text chips.
                                            const showAsImageCards = optIdx === 0;

                                            const primaryFallback = product.images?.[0]
                                                ? resolveUrl(product.images[0].image_url)
                                                : '/assets/placeholder-image.webp';

                                            return (
                                                <div key={opt.id} className={styles.variantOption}>
                                                    <div className={styles.variantOptionHeader}>
                                                        <span className={styles.variantOptionName}>{optName.toUpperCase()}</span>
                                                        {selectedVal && <span className={styles.variantOptionValue}>{selectedLabel}</span>}
                                                    </div>
                                                    <div className={showAsImageCards ? styles.variantImageCards : styles.variantChips}>
                                                        {opt.values?.map((val: any) => {
                                                            const key = val.value.trim() || val.value_ar.trim();
                                                            const isSelected = selectedVal === key;
                                                            const label = (isArabic && val.value_ar) ? val.value_ar : (val.value || val.value_ar);

                                                            const handleSelect = () => {
                                                                setSelectedValues(prev => {
                                                                    const next = { ...prev, [opt.id]: key };
                                                                    // Clear selections for options AFTER this one if they're no longer valid
                                                                    allRawOptions.slice(optIdx + 1).forEach((laterOpt: any) => {
                                                                        const currentVal = next[laterOpt.id];
                                                                        if (!currentVal) return;
                                                                        const priorSels = allRawOptions.slice(0, allRawOptions.indexOf(laterOpt))
                                                                            .map((o: any) => ({ optionId: o.id, value: next[o.id] }))
                                                                            .filter((s: any) => !!s.value);
                                                                        const stillValid = productVariants.some((v: any) => {
                                                                            const matchesPrior = priorSels.every((sel: any) => {
                                                                                const vo = v.options?.find((o: any) => o.option_id === sel.optionId);
                                                                                return vo && ((vo.value || '').trim() || (vo.value_ar || '').trim()) === sel.value;
                                                                            });
                                                                            if (!matchesPrior) return false;
                                                                            const vo = v.options?.find((o: any) => o.option_id === laterOpt.id);
                                                                            return vo && ((vo.value || '').trim() || (vo.value_ar || '').trim()) === currentVal;
                                                                        });
                                                                        if (!stillValid) delete next[laterOpt.id];
                                                                    });
                                                                    return next;
                                                                });
                                                                setCurrentImageIndex(0);
                                                                setQty(1);
                                                            };

                                                            if (showAsImageCards) {
                                                                // First try to find a variant with a custom image for this option value
                                                                let matchingVariant = productVariants.find((v: any) =>
                                                                    v.options_signature?.includes(`${opt.id}:${key}`) &&
                                                                    !v.use_primary_image && v.image_url
                                                                );
                                                                // If no custom image, find any variant that matches this option value and has an image_url
                                                                if (!matchingVariant) {
                                                                    matchingVariant = productVariants.find((v: any) =>
                                                                        v.options_signature?.includes(`${opt.id}:${key}`) && v.image_url
                                                                    );
                                                                }
                                                                const thumbSrc = matchingVariant?.image_url
                                                                    ? resolveUrl(matchingVariant.image_url)
                                                                    : primaryFallback;

                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        type="button"
                                                                        className={`${styles.variantImageCard} ${isSelected ? styles.variantImageCardActive : ''}`}
                                                                        onClick={handleSelect}
                                                                    >
                                                                        <div className={styles.variantImageCardThumb}>
                                                                            <img src={thumbSrc} alt={label} />
                                                                        </div>
                                                                        <span className={styles.variantImageCardLabel}>{label}</span>
                                                                    </button>
                                                                );
                                                            }

                                                            return (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    className={`${styles.variantChip} ${isSelected ? styles.variantChipActive : ''}`}
                                                                    onClick={handleSelect}
                                                                >
                                                                    {label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className={styles.priceSection}>
                                    <div className={styles.currentPrice}>
                                        AED {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        <span className={styles.vatLabel}>{t('vatIncluded')}</span>
                                    </div>
                                    {oldPrice && (
                                        <div className={styles.priceRow}>
                                            <div className={styles.oldPrice}>AED {oldPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            {oldPrice > displayPrice && (
                                                <span className={styles.saveBadge}>
                                                    {t('save')} AED {(oldPrice - displayPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    {' '}({Math.round((oldPrice - displayPrice) / oldPrice * 100)}% {t('off')})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {getLocalizedField('short_description', 'short_description_ar') && (
                                    <div className={styles.shortDescriptionWrapper}>
                                        <div
                                            className={`${styles.shortDescription} ${isShortDescExpanded ? styles.expanded : ''}`}
                                            dangerouslySetInnerHTML={{ __html: cleanShortcodes(getLocalizedField('short_description', 'short_description_ar')) }}
                                        />
                                        {getLocalizedField('short_description', 'short_description_ar').length > 150 && (
                                            <button
                                                className={styles.readMoreBtn}
                                                onClick={() => setIsShortDescExpanded(!isShortDescExpanded)}
                                            >
                                                {isShortDescExpanded ? t('readLess') : t('readMore')}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Tabby Area */}
                                <div className={styles.tabbyBox} style={{ border: 'none', padding: 0 }}>
                                    <Script
                                        src="https://checkout.tabby.ai/tabby-promo.js"
                                        strategy="lazyOnload"
                                        onLoad={() => {
                                            if (typeof window !== 'undefined' && (window as any).TabbyPromo) {
                                                try {
                                                    new (window as any).TabbyPromo({
                                                        selector: '#TabbyPromo',
                                                        currency: 'AED',
                                                        price: displayPrice,
                                                        installmentsCount: 4,
                                                        lang: locale === 'ar' ? 'ar' : 'en',
                                                        source: 'product',
                                                        publicKey: process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || 'pk_test_b6ac7af8-c300-4eb6-9ba6-a19ae3bf84de',
                                                        merchantCode: 'MARIOT'
                                                    });
                                                } catch (e) {
                                                    console.error('Tabby Promo Error', e);
                                                }
                                            }
                                        }}
                                    />
                                    <div id="TabbyPromo"></div>
                                </div>

                                {/* Extra Services */}
                                <div className={styles.extraServicesSection}>
                                    <div className={styles.priceMatchCard} onClick={() => setShowPriceMatchModal(true)}>
                                        <Tag className={styles.priceMatchIcon} size={24} fill="currentColor" />
                                        <div className={styles.priceMatchInfo}>
                                            <span className={styles.priceMatchMain}>{t('getPriceMatch') || 'Get A Price Match'}</span>
                                            <span className={styles.priceMatchSub}>{t('priceMatchSub') || '+ 5% Store Credit'}</span>
                                        </div>
                                        <ChevronRight size={20} className={styles.chevronIcon} />
                                    </div>
                                </div>

                                <div className={styles.purchaseActions}>
                                    <div className={styles.qtyWrapper} ref={qtyRef}>
                                        <div
                                            className={`${styles.qtyCustomSelect} ${isQtyOpen ? styles.open : ''}`}
                                            onClick={() => setIsQtyOpen(!isQtyOpen)}
                                            style={{ opacity: effectiveStock === 0 ? 0.6 : 1, pointerEvents: effectiveStock === 0 ? 'none' : 'auto' }}
                                        >
                                            <span className={styles.qtyCustomSelectText}>
                                                {effectiveStock > 0 ? `${t('qty')} ${qty}` : '0'}
                                            </span>
                                            {isQtyOpen ? (
                                                <ChevronUp size={18} className={styles.qtyArrow} />
                                            ) : (
                                                <ChevronDown size={18} className={styles.qtyArrow} />
                                            )}
                                        </div>

                                        {isQtyOpen && effectiveStock > 0 && (
                                            <div className={styles.qtyCustomOptions}>
                                                {Array.from({ length: Math.min(effectiveStock, 10) }, (_, i) => i + 1).map(n => (
                                                    <div
                                                        key={n}
                                                        className={`${styles.qtyCustomOption} ${n === qty ? styles.selected : ''}`}
                                                        onClick={() => {
                                                            setQty(n);
                                                            setIsQtyOpen(false);
                                                        }}
                                                    >
                                                        {t('qty')} {n}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className={styles.addToCartBtn}
                                        onClick={handleAddToCart}
                                        disabled={effectiveStock === 0 || cartAdded || (hasVariants && !selectedVariant)}
                                        style={{
                                            opacity: effectiveStock === 0 ? 0.6 : 1,
                                            cursor: effectiveStock === 0 ? 'not-allowed' : 'pointer',
                                            backgroundColor: cartAdded ? '#28a745' : ''
                                        }}
                                    >
                                        {cartAdded ? null : <ShoppingCart size={24} />}
                                        {cartAdded
                                            ? t('added')
                                            : (hasVariants && !selectedVariant
                                                ? t('selectOptions', { defaultValue: 'Select options' })
                                                : (effectiveStock > 0 ? t('addToCart') : t('outOfStock')))}
                                    </button>
                                </div>

                                <button
                                    className={styles.whatsappBtn}
                                    onClick={() => {
                                        const productUrl = typeof window !== 'undefined' ? window.location.href : '';
                                        const msg = encodeURIComponent(t('whatsappMessage', {
                                            url: productUrl,
                                            name: getLocalizedField('name', 'name_ar'),
                                            price: displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                            model: product.model || product.slug?.toUpperCase() || product.id
                                        }));
                                        window.open(`https://wa.me/97142882777?text=${msg}`, '_blank');
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginInlineEnd: '8px' }}>
                                        <path d="M12.03 2c-5.52 0-10 4.48-10 10a9.96 9.96 0 0 0 1.53 5.39L2.03 22l4.75-1.25c1.54.85 3.32 1.33 5.25 1.33 5.52 0 10-4.48 10-10S17.55 2 12.03 2zm6.3 14.54c-.27.76-1.55 1.48-2.14 1.57-.59.09-1.34.22-3.83-.82-2.92-1.21-4.74-4.22-4.88-4.42-.15-.2-1.18-1.56-1.18-2.98 0-1.42.74-2.12 1.01-2.4.27-.28.59-.35.79-.35.19 0 .38.01.54.02.17.01.4-.04.62.5.24.59.81 1.99.88 2.14.07.15.11.32.01.52-.09.20-.14.33-.28.5-.14.17-.3.38-.43.51-.15.15-.3.32-.13.62.17.3.74 1.23 1.59 1.99.85.76 1.56 1 1.86 1.15.3.15.47.13.65-.08.18-.21.76-.89.96-1.2.2-.31.4-.26.68-.15.28.11 1.77.84 2.08.99.31.15.51.22.59.35.08.13.08.73-.19 1.48z" />
                                    </svg>
                                    {t('whatsapp')}
                                </button>
                            </div>
                        </div>

                    </div>

                    <div className={styles.fbtWrapper}>
                        {product.frequently_bought_together_products && product.frequently_bought_together_products.length > 0 && (
                            <FbtSection
                                currentProduct={product}
                                fbtProducts={product.frequently_bought_together_products}
                                locale={locale}
                                isArabic={isArabic}
                                resolveUrl={resolveUrl}
                                addToCart={addToCart}
                                showNotification={showNotification}
                                t={t}
                            />
                        )}
                    </div>

                    {/* Sidebar (Right) */}
                    <div className={styles.sidebar}>
                        <div className={styles.trustList}>
                            <TrustItem icon={<Truck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('freeShipping')} text={t('freeShippingText')} />
                            <TrustItem icon={<Award size={32} color="#4caf50" strokeWidth={1.5} />} title={t('gulfShipping')} text={t('freeShippingText')} />
                            <TrustItem icon={<ShieldCheck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('securePayment')} text={t('securePaymentText')} />
                            <TrustItem icon={<RotateCcw size={32} color="#4caf50" strokeWidth={1.5} />} title={t('satisfaction')} text={t('satisfactionText')} />
                            <TrustItem icon={<Headset size={32} color="#4caf50" strokeWidth={1.5} />} title={t('onlineSupport')} text={t('onlineSupportText')} />
                            <TrustItem icon={<ShieldCheck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('warranty')} text={t('warrantyText')} />
                        </div>

                        <div className={styles.paymentMethods}>
                            <div className={styles.paymentTitle}>{t('weAcceptPayment')}</div>
                            <div className={styles.paymentLogos}>
                                <img src="/assets/visa-logo.svg" alt="Visa" className={styles.visaDetailLogo} />
                                <img src="/assets/mastercard-logo.svg" alt="Mastercard" />
                                <img src="/assets/Tabby.webp" alt="Tabby" />
                                <img src="/assets/apple-pay-logo.svg" alt="ApplePay" />
                                <img src="/assets/google-pay-logo.svg" alt="GPay" />
                            </div>
                        </div>
                    </div>

                </div>


                <div className={`${styles.detailsLayoutGrid} ${!hasVideo ? styles.noVideo : ''}`}>
                    {/* Main Content Area (Accordions Column) */}
                    <div className={styles.accordionsColumn}>
                        <div className={styles.accordions}>
                            {/* Description Accordion */}
                            <AccordionItem
                                title={t('description')}
                                icon={<FileText size={20} />}
                                isOpen={!!expandedAccordions['description']}
                                onToggle={() => toggleAccordion('description')}
                            >
                                <div
                                    className={styles.descriptionText}
                                    dangerouslySetInnerHTML={{
                                        __html: cleanShortcodes(getLocalizedField('description', 'description_ar')) || `<p>${t('noDescription')}</p>`
                                    }}
                                />
                            </AccordionItem>

                            {/* Product Specs */}
                            <AccordionItem
                                title={t('productSpecs')}
                                icon={<ListChecks size={20} />}
                                isOpen={!!expandedAccordions['specs']}
                                onToggle={() => toggleAccordion('specs')}
                            >
                                {product.specifications ? (
                                    <div className={styles.specsGrid}>
                                        {(() => {
                                            const cleaned = cleanShortcodes(product.specifications)
                                                .replace(/<[^>]*>/g, '\n') // Replace HTML tags with newlines
                                                .replace(/^[•\s✳️✅-]\s*/gm, ''); // Remove bullet points at start of lines
                                            const lines = cleaned.split(/\n/).filter(l => l.trim() !== '');

                                            if (lines.length > 1) {
                                                return (
                                                    <ul className={styles.specsList}>
                                                        {lines.map((line, idx) => {
                                                            const parts = line.split(':');
                                                            if (parts.length >= 2) {
                                                                const label = parts[0].trim();
                                                                const value = parts.slice(1).join(':').trim();
                                                                return (
                                                                    <li key={idx} className={styles.specItem}>
                                                                        <span className={styles.specLabel}>{label}</span>
                                                                        <span className={styles.specValue}>{value}</span>
                                                                    </li>
                                                                );
                                                            }
                                                            return <li key={idx} className={styles.specItemSingle}>{line.trim()}</li>;
                                                        })}
                                                    </ul>
                                                );
                                            }
                                            return <div className={styles.descriptionText} dangerouslySetInnerHTML={{ __html: cleaned }} />;
                                        })()}
                                    </div>
                                ) : (
                                    <p>{t('noSpecs')}</p>
                                )}
                            </AccordionItem>
                            <AccordionItem
                                title={t('aboutBrand')}
                                icon={<Award size={20} />}
                                isOpen={!!expandedAccordions['brand']}
                                onToggle={() => toggleAccordion('brand')}
                            >
                                <div className={styles.aboutBrandContainer}>
                                    {product.brand_image && (
                                        <div className={styles.aboutBrandLogoBox}>
                                            <img src={resolveUrl(product.brand_image)} alt={getLocalizedField('brand_name', 'brand_name_ar')} className={styles.aboutBrandLogoImg} />
                                        </div>
                                    )}
                                    <p>{getLocalizedField('brand_description', 'brand_description_ar') || `${t('aboutBrand')} : ${getLocalizedField('brand_name', 'brand_name_ar') || 'Mariot'}`}</p>
                                </div>
                            </AccordionItem>
                            <AccordionItem
                                title={t('resourcesDownloads')}
                                icon={<FileDown size={20} />}
                                isOpen={!!expandedAccordions['resources']}
                                onToggle={() => toggleAccordion('resources')}
                            >
                                {(() => {
                                    let resources: { name: string, url: string }[] = [];
                                    if (product.resources) {
                                        try {
                                            const parsed = JSON.parse(product.resources);
                                            if (Array.isArray(parsed)) {
                                                resources = parsed.filter(r => r.url);
                                            }
                                        } catch (e) {
                                            console.error('Failed to parse resources', e);
                                        }
                                    }

                                    if (resources.length === 0) return <p>{t('noResources')}</p>;

                                    return (
                                        <div className={styles.resourceList} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                            {resources.map((res, i) => (
                                                <a
                                                    key={i}
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.resourceCard}
                                                >
                                                    <div className={styles.resourceIconInfo}>
                                                        <div className={styles.fileIconBox}>
                                                            <FileText size={22} />
                                                        </div>
                                                        <div className={styles.resourceTextInfo}>
                                                            <span className={styles.resourceName}>{res.name || 'Download'}</span>
                                                            <span className={styles.resourceFormat}>PDF Document</span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.downloadAction}>
                                                        <span className={styles.downloadLabel}>{t('download') || 'Download'}</span>
                                                        <FileDown size={18} />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </AccordionItem>
                            <AccordionItem
                                title={t('relatedVideos')}
                                icon={<PlayCircle size={20} />}
                                isOpen={!!expandedAccordions['videos']}
                                onToggle={() => toggleAccordion('videos')}
                            >
                                {(() => {
                                    const videoDataRaw = product.youtube_video_link;
                                    let links: string[] = [];
                                    if (videoDataRaw) {
                                        try {
                                            const parsed = JSON.parse(videoDataRaw);
                                            if (Array.isArray(parsed)) {
                                                links = parsed.filter(v => v && v.trim() !== '');
                                            } else if (parsed && typeof parsed === 'object' && parsed.links) {
                                                links = parsed.links.filter((v: string) => v && v.trim() !== '');
                                            } else {
                                                links = [videoDataRaw].filter(v => v && v.trim() !== '');
                                            }
                                        } catch {
                                            links = [String(videoDataRaw)].filter(v => v && v.trim() !== '');
                                        }
                                    }

                                    if (links.length === 0) return <p>{t('noRelatedVideos') || 'No related videos available.'}</p>;

                                    const getEmbedUrl = (url: string) => {
                                        if (!url) return '';
                                        if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/').split('&')[0];
                                        if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
                                        return url;
                                    };

                                    return (
                                        <div className={styles.relatedVideosGrid} style={{ background: 'transparent', padding: 0, border: 'none' }}>
                                            {links.map((v: string, i: number) => (
                                                <div key={i} className={styles.relatedVideoItem}>
                                                    <div className={styles.videoContainerSmall}>
                                                        <iframe
                                                            src={getEmbedUrl(v)}
                                                            title={`Video ${i + 1}`}
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        ></iframe>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </AccordionItem>
                        </div>
                    </div>

                    {/* Right column: Featured Video (area: video) */}
                    {hasVideo && (
                        <div className={styles.videoColumn}>
                            {(() => {
                                let fIndex = 0;
                                if (videoDataRaw) {
                                    try {
                                        const parsed = JSON.parse(videoDataRaw);
                                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                                            fIndex = parsed.featuredIndex ?? 0;
                                        }
                                    } catch { }
                                }

                                const featuredUrl = videoLinks[fIndex] || videoLinks[0];

                                const getEmbedUrl = (url: string) => {
                                    if (!url) return '';
                                    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/').split('&')[0];
                                    if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
                                    return url;
                                };

                                if (!featuredUrl) return null;

                                return (
                                    <div className={styles.stickyVideoWrapper}>
                                        <div className={styles.videoHeader}>
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="#e31e24">
                                                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z" />
                                            </svg>
                                            <h3>{t('featuredVideo') || 'Featured Video'}</h3>
                                        </div>
                                        <div className={styles.videoContainer}>
                                            <iframe
                                                src={getEmbedUrl(featuredUrl)}
                                                title="Product Featured Video"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>


                {/* --- New Sections (Bottom) --- */}

                {/* You may also need */}
                {
                    relatedProducts.length > 0 && (
                        <div className={`${styles.extraSection} ${styles.relatedSection}`}>
                            <div className={styles.sectionTitle}>
                                <h2>{t('youMayAlsoNeed')}</h2>
                            </div>
                            <div className={styles.sliderWrapper}>
                                <button
                                    className={`${styles.sliderArrow} ${styles.prevArrow}`}
                                    onClick={() => relatedEmblaApi?.scrollPrev()}
                                >
                                    <ChevronLeft size={26} />
                                </button>

                                <div className={styles.relatedViewport} ref={relatedEmblaRef}>
                                    <div className={styles.relatedGrid}>
                                        {relatedProducts.map((p) => (
                                            <div key={p.id} className={styles.relatedSlide}>
                                                <ProductCardPromotion product={{ ...p, price: Number(p.offer_price) > 0 ? Number(p.offer_price) : Number(p.price), old_price: Number(p.offer_price) > 0 ? Number(p.price) : (Number(p.old_price) || Number(p.originalPrice) || 0) }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    className={`${styles.sliderArrow} ${styles.nextArrow}`}
                                    onClick={() => relatedEmblaApi?.scrollNext()}
                                >
                                    <ChevronRight size={26} />
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Reviews Section */}
                <div className={styles.extraSection} id="reviews-section">
                    <div className={styles.sectionTitle}>
                        <h2>{t('customerReviews')}</h2>
                    </div>

                    <div className={styles.reviewsContent}>
                        {/* Summary Side */}
                        <div className={styles.reviewsSummarySide}>
                            <div className={styles.ratingHero}>
                                <h3>{avgRatingSummary.toFixed(1)}</h3>
                                <span>/ 5.0</span>
                            </div>
                            <div className={styles.stars}>
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isFull = star <= fullStarsSummary || (roundUpSummary && star <= fullStarsSummary + 1);
                                    const isHalf = !isFull && hasHalfSummary && star === fullStarsSummary + 1;
                                    return (
                                        <div key={`summary-star-${star}`} style={{ position: 'relative', width: 22, height: 22 }}>
                                            <Star size={22} fill="none" color="#e2e8f0" style={{ position: 'absolute', top: 0, insetInlineStart: 0 }} />
                                            {(isFull || isHalf) && (
                                                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: isHalf ? '50%' : '100%', height: '100%', overflow: 'hidden' }}>
                                                    <Star size={22} fill="#f59e0b" color="#f59e0b" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>
                                {t('basedOn', { count: totalReviewsSummary, reviewsLabel: totalReviewsSummary === 1 ? t('review') : t('reviews') })}
                            </div>

                            <div className={styles.distributionList}>
                                {[5, 4, 3, 2, 1].map(stars => {
                                    const count = reviews.filter((r: any) => r.rating === stars).length;
                                    const percent = totalReviewsSummary > 0 ? (count / totalReviewsSummary) * 100 : 0;
                                    return (
                                        <div key={`dist-${stars}`} className={styles.distributionRow}>
                                            <span><span>{stars}</span> <span>★</span></span>
                                            <div className={styles.distBarBg}>
                                                <div className={styles.distBarFill} style={{ width: `${percent}%` }} />
                                            </div>
                                            <span style={{ minWidth: '30px' }}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {!showReviewForm && (
                                <button
                                    className={styles.secondaryBtn}
                                    style={{ marginTop: '30px', width: '100%' }}
                                    onClick={() => {
                                        if (user) setShowReviewForm(true);
                                        else {
                                            const pathWithoutLocale = window.location.pathname.replace(new RegExp(`^/${locale}`), '') || '/';
                                            const returnTo = encodeURIComponent(pathWithoutLocale + '#reviews-section');
                                            window.location.href = `/${locale}/signin?redirectTo=${returnTo}`;
                                        }
                                    }}
                                >
                                    {user ? t('writeReview') : t('signInToReview')}
                                </button>
                            )}
                        </div>

                        {/* List Side */}
                        <div className={styles.reviewsListSide}>
                            {reviews.length === 0 ? (
                                <div className={styles.noReviews}>
                                    <ShieldCheck size={24} color="#5bb377" />
                                    <p>{t('noReviewsYet')}</p>
                                </div>
                            ) : (
                                <div className={styles.reviewsList}>
                                    {reviews.map((rev, idx) => (
                                        <div key={idx} className={styles.reviewItem}>
                                            <div className={styles.reviewHeader}>
                                                <div className={styles.userBadge}>
                                                    <div className={styles.userAvatar}>
                                                        {(rev.user_name || 'C').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className={styles.userInfo}>
                                                        <h4>{rev.user_name || t('verifiedCustomer')}</h4>
                                                        <span className={styles.reviewDate}>
                                                            {new Date(rev.created_at || Date.now()).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className={styles.reviewStars}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                size={14}
                                                                fill={star <= rev.rating ? "#f59e0b" : "none"}
                                                                color={star <= rev.rating ? "#f59e0b" : "#e2e8f0"}
                                                            />
                                                        ))}
                                                    </div>
                                                    {(user?.id === rev.user_id || user?.role === 'admin') && (
                                                        <button
                                                            className={styles.deleteReviewBtn}
                                                            onClick={() => handleDeleteReview(rev.id)}
                                                            title="Delete review"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={styles.reviewComment}>{rev.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showReviewForm && (
                                <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
                                    <h3>{t('shareFeedback')}</h3>
                                    <div className={styles.starInput}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                            >
                                                <Star
                                                    size={32}
                                                    fill={star <= (hoverRating || rating) ? "#f59e0b" : "none"}
                                                    color={star <= (hoverRating || rating) ? "#f59e0b" : "#cbd5e1"}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        placeholder={t('feedbackPlaceholder')}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        required
                                    />
                                    {reviewError && <p className={styles.errorText}>{reviewError}</p>}
                                    <div className={styles.formActions}>
                                        <button type="button" className={styles.cancelBtn} onClick={() => setShowReviewForm(false)}>{t('cancel')}</button>
                                        <button type="submit" className={styles.submitBtn} disabled={isSubmittingReview}>
                                            {isSubmittingReview ? t('submitting') : t('postReview')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modern Ask Experts Section */}
                <div className={`${styles.extraSection} ${styles.expertSection}`}>
                    <div className={styles.askExpertCard}>
                        <div className={styles.askContent}>
                            <div className={styles.expertHeader}>
                                <div className={styles.expertIconBox}>
                                    <MessageSquare size={24} color="#059669" />
                                </div>
                                <span className={styles.expertLabel}>{t('expertAssistance')}</span>
                            </div>
                            <h3>{t('expertQuestions')}</h3>
                            <p>{t('expertDescription')}</p>
                        </div>
                        <div className={styles.askActions}>
                            <button className={styles.premiumBtn}>
                                <Phone size={18} />
                                {t('speakWithExpert')}
                            </button>
                            <span style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>{t('availableMonSat')}</span>
                        </div>
                    </div>
                </div>
                {/* Tabby Modal */}
                {
                    showTabbyModal && (
                        <div className={styles.modalOverlay} onClick={() => setShowTabbyModal(false)}>
                            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <img src="/assets/Tabby.webp" alt="Tabby" className={styles.tabbyLogoLarge} />
                                    <button className={styles.closeModal} onClick={() => setShowTabbyModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className={styles.modalContent}>

                                    {/* Promo Banner */}
                                    <div className={styles.tabbyPromoBanner}>
                                        <div className={styles.promoContent}>
                                            <div className={styles.promoTitle}>{t('tabbyPromoTitle')}</div>
                                            <div className={styles.promoSubtitle}>{t('tabbyPromoSubtitle')}</div>
                                        </div>
                                    </div>

                                    {/* Installments */}
                                    <div className={styles.installmentRow}>
                                        <div className={styles.installmentInfo}>
                                            <h4>{t('payments4')}</h4>
                                            <div className={`${styles.installmentSub} ${styles.green}`}>{t('noInterest')}</div>
                                        </div>
                                        <div className={styles.installmentPrice}>AED {monthlyPayment}/mo</div>
                                    </div>

                                    <div className={styles.installmentRow}>
                                        <div className={styles.installmentInfo}>
                                            <h4>{t('payments6')}</h4>
                                            <div className={styles.installmentSub}>{t('includesFee')}</div>
                                        </div>
                                        <div className={styles.installmentPrice}>AED {(Number(displayPrice) / 6 * 1.025).toFixed(2)}/mo</div>
                                    </div>

                                    <div className={styles.installmentRow}>
                                        <div className={styles.installmentInfo}>
                                            <h4>{t('payments12')}</h4>
                                            <div className={styles.installmentSub}>{t('includesFee')}</div>
                                        </div>
                                        <div className={styles.installmentPrice}>AED {(Number(displayPrice) / 12 * 1.025).toFixed(2)}/mo</div>
                                    </div>

                                    <div className={styles.continueShoppingWrapper} style={{ marginTop: '20px', paddingBottom: '0' }}>
                                        <div
                                            className={styles.continueBtn}
                                            onClick={() => setShowTabbyModal(false)}
                                            style={{ cursor: 'pointer', borderColor: '#e0e0e0', color: '#555' }}
                                        >
                                            <ChevronLeft size={18} style={{ transform: locale === 'ar' ? 'rotate(180deg)' : 'none' }} />
                                            {t('continueShopping')}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Price Match Modal */}
                {
                    showPriceMatchModal && (
                        <div className={styles.pmModalOverlay} onClick={() => setShowPriceMatchModal(false)}>
                            <div className={styles.pmModal} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.pmHeader}>
                                    <div className={styles.pmHeaderTitle}>
                                        <Tag size={20} fill="currentColor" />
                                        <span>{t('requestAPriceMatch') || 'Request a'} <em>{t('priceMatch') || 'Price Match'}</em></span>
                                    </div>
                                    <button className={styles.pmCloseBtn} onClick={() => setShowPriceMatchModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className={styles.pmContent}>
                                    <div className={styles.pmFormGroup}>
                                        <label className={styles.pmLabel}>{t('whereDidYouFindProduct') || 'Where did you find the product?'}</label>
                                        <input
                                            type="text"
                                            className={styles.pmInputUnderline}
                                            placeholder={t('shopNamePlaceholder') || 'Shop name or website URL'}
                                            value={pmForm.shopName}
                                            onChange={(e) => setPmForm({ ...pmForm, shopName: e.target.value })}
                                        />
                                    </div>

                                    <div className={styles.pmFormGroup}>
                                        <label className={styles.pmLabel}>{t('uploadImageToShowPrice') || 'Please upload an image to show the price'}</label>
                                        <p className={styles.pmSubLabel}>{t('documentUploadDesc') || 'Or any document that clearly displays the product and its price (photo, screenshot, quotation, etc.)'}</p>

                                        <input
                                            type="file"
                                            ref={pmFileRef}
                                            style={{ display: 'none' }}
                                            onChange={(e) => setPmForm({ ...pmForm, file: e.target.files?.[0] || null })}
                                            accept="image/*,application/pdf"
                                        />
                                        <div className={styles.pmUploadZone} onClick={() => pmFileRef.current?.click()}>
                                            <Upload size={32} className={styles.pmUploadIcon} />
                                            <span className={styles.pmUploadText}>
                                                {pmForm.file ? pmForm.file.name : (t('uploadImageOrPdf') || 'Upload image or PDF')}
                                            </span>
                                        </div>
                                        <p className={styles.pmSkipText}>{t('skipStepDesc') || 'You can skip this step if the URL above shows the price.'}</p>
                                    </div>

                                    <div className={styles.pmFormGroup}>
                                        <label className={styles.pmLabel}>{t('contactInfoDesc') || 'Your contact information so we can get back to you with our offer'}</label>
                                        <div className={styles.pmContactGrid}>
                                            <input
                                                type="email"
                                                className={styles.pmInputUnderline}
                                                placeholder={t('emailPlaceholder') || 'Email'}
                                                value={pmForm.email}
                                                onChange={(e) => setPmForm({ ...pmForm, email: e.target.value })}
                                            />
                                            <div style={{ position: 'relative' }}>
                                                <span className={styles.pmPhonePrefix}>+971</span>
                                                <input
                                                    type="tel"
                                                    className={`${styles.pmInputUnderline} ${styles.pmPhoneInput}`}
                                                    placeholder="5XXXXXXXX"
                                                    value={pmForm.phone}
                                                    onChange={(e) => setPmForm({ ...pmForm, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.pmCheckboxGroup} onClick={() => setPmForm({ ...pmForm, agreed: !pmForm.agreed })}>
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            className={styles.pmCheckbox}
                                            checked={pmForm.agreed}
                                            onChange={() => { }} // Handled by group click
                                        />
                                        <label htmlFor="terms" className={styles.pmCheckboxLabel}>
                                            {t('agreeTermsPrev') || 'I have read the'} <Link href="/price-match-policy" onClick={(e) => e.stopPropagation()}>{t('priceMatchPolicy') || 'Price Match Policy'}</Link> {t('agreeTermsMid') || 'and I agree to the'} <Link href="/terms" onClick={(e) => e.stopPropagation()}>{t('termsAndConditions') || 'Terms and Conditions'}</Link>
                                        </label>
                                    </div>

                                    <div className={styles.pmActions}>
                                        <button
                                            className={styles.pmSubmitBtn}
                                            onClick={handlePriceMatchSubmit}
                                            disabled={isPmSubmitting}
                                        >
                                            {isPmSubmitting ? (isArabic ? 'جاري الإرسال...' : 'Submitting...') : (t('submit') || 'Submit')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
            {/* Fullscreen Image Overlay */}
            {
                isFullScreen && (
                    <div className={styles.fullscreenOverlay} onClick={() => setIsFullScreen(false)}>
                        <div className={styles.fullscreenContent} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeOverlayBtn} onClick={() => setIsFullScreen(false)}>
                                <X size={32} />
                            </button>
                            <img
                                src={images[currentImageIndex]}
                                alt={getLocalizedField('name', 'name_ar')}
                                className={styles.fullscreenImage}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ProductDetail;
