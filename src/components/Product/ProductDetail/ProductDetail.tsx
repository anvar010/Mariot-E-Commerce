'use client';

import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
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
    ListChecks,
    Ruler,
    MoveHorizontal,
    MoveVertical,
    BellRing,
    Scale,
    Share2,
    ArrowRight,
    Globe,
    Box,
    Server,
    Store,
    Gauge,
    IceCream,
    Package,
    Fan,
    Weight,
    Settings,
    X as CloseIcon
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import styles from './ProductDetail.module.css';
import DeliveryInformation from './DeliveryInformation';
import ProductTags from './ProductTags';
import { API_BASE_URL, BASE_URL, TABBY_ENABLED } from '@/config';
import { resolveUrl } from '@/utils/resolveUrl';
import { getAuthHeaders } from '@/utils/authHeaders';
import { useCartActions } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Loader from '@/components/shared/Loader/Loader';
import dynamic from 'next/dynamic';
// Interaction-gated: only loaded when the user opens the "notify me" modal,
// so its JS stays out of the product page's initial bundle.
const NotifyMeModal = dynamic(() => import('@/components/shared/NotifyMeModal/NotifyMeModal'), { ssr: false });
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Phone } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface ProductDetailProps {
    id: string;
}

// Shown whenever a product has no usable image (empty slot, missing/broken
// primary image). Matches the fallback used by ProductCard so the site logo
// appears consistently instead of a blank/placeholder tile.
const LOGO_FALLBACK = '/assets/mariot-logo2.webp';

// Swap a broken <img> to the site logo, once — the endsWith guard stops an
// error loop in case the logo asset itself ever fails to load.
const swapToLogoOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.src.endsWith(LOGO_FALLBACK)) img.src = LOGO_FALLBACK;
};

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

const getIconForLabel = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('brand')) return <Tag size={20} />;
    if (l.includes('origin')) return <Globe size={20} />;
    if (l.includes('model')) return <Box size={20} />;
    if (l.includes('machine type') || l.includes('type')) return <Server size={20} />;
    if (l.includes('suitable')) return <Store size={20} />;
    if (l.includes('capacity')) return <Gauge size={20} />;
    if (l.includes('flavour') || l.includes('flavor')) return <IceCream size={20} />;
    if (l.includes('hopper quantity')) return <Package size={20} />;
    if (l.includes('mixer')) return <Fan size={20} />;
    if (l.includes('weight')) return <Weight size={20} />;
    if (l.includes('dimension')) return <Ruler size={20} />;
    return <ListChecks size={20} />;
};

const AccordionItem = ({ title, isOpen, onToggle, children }: any) => (
    <div className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}>
        <button className={styles.accordionHeader} onClick={onToggle}>
            <div className={styles.accordionHeaderLeft}>
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
    // Include current product first, then the FBT products
    const allItems = [currentProduct, ...fbtProducts];
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
    const getImg = (p: any) => resolveUrl(p.primary_image || (p.images && p.images[0]?.image_url)) || LOGO_FALLBACK;

    const handleAddAll = async () => {
        if (selectedItems.length === 0) return;
        setAdding(true);
        let anyFailed = false;
        for (const p of selectedItems) {
            const ok = await addToCart({
                id: p.id,
                variant_id: p.variantDetails?.id || null,
                variant_label: p.variantDetails?.label || undefined,
                name: p.name,
                name_ar: p.name_ar,
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
        <>
            <div className={styles.fbtSectionRoot}>
                <div className={`${styles.sectionTitle} ${styles.fbtSectionTitle}`}>
                    <h2>{t('fbt.title') || "Frequently bought together"}</h2>
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
                                                    onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; }}
                                                />

                                                <div className={styles.fbtInfo}>
                                                    <div className={styles.fbtName}>{getName(p)}</div>
                                                    <div className={styles.fbtPrice}>
                                                        <CurrencyPrice amount={price} />
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
                            <CurrencyPrice amount={total} />
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
        </>
    );
};

/**
 * A YouTube still that survives a size YouTube never generated.
 *
 * Asking for a thumbnail size that does not exist does NOT produce a failed request.
 * YouTube answers with HTTP 404 and a body that is a perfectly valid 120x90 grey
 * placeholder JPEG. Browsers decode it and fire load, not error -- so an onError
 * fallback never runs, and the grey square is what the shopper sees. Inside a 16:9
 * frame it is 4:3, which is where the black bars either side of it come from.
 *
 * maxresdefault is missing for 8 of the 18 product videos on the site, so this is the
 * normal case, not an edge case. The placeholder is detected by its size instead: no
 * real still is 120px wide.
 *
 * The current source is state rather than a mutated img.src, so the choice survives the
 * re-renders Swiper triggers as slides change.
 */
const YouTubeStill: React.FC<{
    sources: string[];
    className?: string;
    alt?: string;
    loading?: 'lazy' | 'eager';
    onExhausted?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}> = ({ sources, className, alt = '', loading = 'lazy', onExhausted }) => {
    const [index, setIndex] = useState(0);
    // A different video resets the ladder; without this the last video's fallback level
    // would be carried over to the next one.
    useEffect(() => { setIndex(0); }, [sources[0]]);

    const demote = (e: React.SyntheticEvent<HTMLImageElement>) => {
        if (index < sources.length - 1) setIndex(index + 1);
        else onExhausted?.(e);
    };

    const src = sources[index];
    if (!src) return null;

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading={loading}
            // 120px wide is YouTube's "this size does not exist" placeholder. Real stills
            // start at 320px, so the test needs no allowance either way.
            onLoad={(e) => { if (e.currentTarget.naturalWidth <= 120) demote(e); }}
            onError={demote}
        />
    );
};

const ProductDetail: React.FC<ProductDetailProps> = ({ id }) => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    // notFound = genuine 404 from the API; loadError = transient failure
    // (network/5xx/timeout) after retries. Kept separate so a temporary backend
    // hiccup doesn't masquerade as a permanent "Product not found".
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [qty, setQty] = useState<number | string>(1);
    const [selectedValues, setSelectedValues] = useState<Record<number, string>>({});
    const [customDims, setCustomDims] = useState<Record<'width' | 'depth' | 'height', string>>({ width: '', depth: '', height: '' });
    const [showTabbyModal, setShowTabbyModal] = useState(false);
    const [showPriceMatchModal, setShowPriceMatchModal] = useState(false);
    const [notifyOpen, setNotifyOpen] = useState(false);
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
        specs: true,
        description: true
    });
    const [isShortDescExpanded, setIsShortDescExpanded] = useState(false);
    const [canShowReadMore, setCanShowReadMore] = useState(false);
    const shortDescRef = useRef<HTMLDivElement>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    // Where a press on the video poster began, so a swipe that happens to end on
    // it is not mistaken for a tap. See the poster's handlers for why this cannot
    // simply be an onClick.
    const posterTapRef = useRef<{ x: number; y: number } | null>(null);
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

    useEffect(() => {
        if (!showPriceMatchModal) {
            setPmError(null);
        }
    }, [showPriceMatchModal]);

    // Price Match Form State
    const [pmForm, setPmForm] = useState({
        shopName: '',
        email: '',
        phone: '',
        file: null as File | null,
        agreed: false
    });
    const [isPmSubmitting, setIsPmSubmitting] = useState(false);
    const [pmError, setPmError] = useState<string | null>(null);
    const pmFileRef = useRef<HTMLInputElement>(null);

    const handlePriceMatchSubmit = async () => {
        setPmError(null);
        if (!pmForm.agreed) {
            setPmError(t('agreeToTerms'));
            return;
        }

        if (!pmForm.shopName || !pmForm.email || !pmForm.phone) {
            setPmError(t('fillRequiredFields'));
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

    const { addToCart } = useCartActions();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const { user, token } = useAuth();
    const { showNotification } = useNotification();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('product');
    const isArabic = locale === 'ar';

    // Prefill price-match contact info from the logged-in user (don't overwrite typing).
    useEffect(() => {
        if (!showPriceMatchModal || !user) return;
        const localPhone = String(user.phone || '')
            .replace(/\D/g, '')      // digits only
            .replace(/^971/, '')     // drop UAE country code
            .replace(/^0+/, '');     // drop leading zero
        setPmForm(prev => ({
            ...prev,
            email: prev.email || user.email || '',
            phone: prev.phone || localPhone
        }));
    }, [showPriceMatchModal, user]);

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

    // Detect the natural direction of a text block from its first strong letter.
    // Product descriptions are often English even on the Arabic site (fallback),
    // so we must not let them inherit the page's RTL — that pushes LTR text off
    // the left edge (esp. inside -webkit-box line-clamp on Samsung Internet).
    const detectDir = (raw: string): 'rtl' | 'ltr' => {
        const text = (raw || '').replace(/<[^>]*>/g, '');
        const match = text.match(/[A-Za-z؀-ۿ]/);
        return match && /[؀-ۿ]/.test(match[0]) ? 'rtl' : 'ltr';
    };

    // Helper to clean WooCommerce/Visual Composer shortcodes
    const cleanShortcodes = (content: string) => {
        if (!content) return '';

        // Remove all [vc_...] and [/vc_...] tags
        let cleaned = content.replace(/\[\/?vc_[^\]]*\]/g, '');

        // Handle escaped newlines if they exist
        cleaned = cleaned.replace(/\\n/g, '<br />');

        // Clean up multiple line breaks
        cleaned = cleaned.replace(/(<br\/>\s*){3,}/g, '<br /><br />');

        return cleaned.trim();
    };

    // Helper to intelligently format raw text into paragraphs and lists
    const renderFormattedContent = (rawContent: string) => {
        if (!rawContent) return null;

        const cleaned = cleanShortcodes(rawContent);

        // If the content already contains structural HTML tags, render directly
        if (cleaned.includes('<p>') || cleaned.includes('<ul>') || cleaned.includes('<li>') || cleaned.includes('<h3>')) {
            return <div dangerouslySetInnerHTML={{ __html: cleaned }} />;
        }

        // Otherwise, split by <br /> or newlines and treat every sentence/line as a bullet point
        const segments = cleaned.split(/(?:<br\s*\/?>|\n)+/).map(s => s.replace(/^[•\-\*✳️✅]\s*/, '').trim()).filter(Boolean);

        if (segments.length === 0) return null;

        return (
            <ul>
                {segments.map((seg, index) => (
                    <li key={index}>{seg}</li>
                ))}
            </ul>
        );
    };

    // Compare-with-similar-products states
    const [compareSlots, setCompareSlots] = useState<Array<any | null>>([null, null]);
    const [compareCandidates, setCompareCandidates] = useState<any[]>([]);
    const [compareDrawerSlot, setCompareDrawerSlot] = useState<number | null>(null);
    const [compareSearch, setCompareSearch] = useState('');
    const [compareSearchResults, setCompareSearchResults] = useState<any[]>([]);
    // When the admin curated a pool of products, these are the pool indexes shown
    // in slots 1 & 2 on the page (so the rest are available to swap via the drawer).
    const [compareVisiblePoolIdx, setCompareVisiblePoolIdx] = useState<[number, number]>([0, 1]);
    // The compare table hides its 3rd product column ≤768px (see ProductDetail.module.css).
    // We mirror that breakpoint in JS so the picker drawer can skip the "already taken by
    // the other visible slot" lock — that lock is meaningless when slot 2 isn't on screen.
    const [isCompareMobile, setIsCompareMobile] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsCompareMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

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
    const [showBundleModal, setShowBundleModal] = useState(false);
    const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        const applyProductData = (data: any) => {
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

                    // Pre-fill custom-size inputs with the product's base combination
                    if (Number(data.data.is_customizable) === 1) {
                        let bd: any = data.data.base_dimensions;
                        if (typeof bd === 'string' && bd) {
                            try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
                        }
                        if (bd && typeof bd === 'object') {
                            setCustomDims({
                                width: bd.width !== undefined ? String(bd.width) : '',
                                depth: bd.depth !== undefined ? String(bd.depth) : '',
                                height: bd.height !== undefined ? String(bd.height) : ''
                            });
                        }
                    }

                    // Use manually curated "You May Also Need" products if set, otherwise fall back to category
                    if (Array.isArray(data.data.you_may_also_need_products) && data.data.you_may_also_need_products.length > 0) {
                        setRelatedProducts(data.data.you_may_also_need_products);
                    } else {
                        const categoriesToTry = [
                            data.data.sub_sub_category_id,
                            data.data.sub_category_id,
                            data.data.category_id,
                            data.data.category_slug
                        ].filter(Boolean);
                        fetchRelated(categoriesToTry, data.data.id);
                    }
                    // Compare pool: prefer the most specific category the product belongs to.
                    fetchCompareCandidates(
                        data.data.sub_sub_category_id || data.data.sub_category_id || data.data.category_id || data.data.category_slug,
                        data.data.id
                    );
                    fetchReviews(data.data.id);
        };

        const fetchCompareCandidates = async (category: string | number | null, currentProductId: number) => {
            if (!category) return;
            try {
                const res = await fetch(`${API_BASE_URL}/products?category=${category}&limit=40`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    const filtered = (data.data || []).filter((p: any) => p.id !== currentProductId);
                    setCompareCandidates(filtered);
                    // Seed the two adjacent slots with the first two same-category products.
                    setCompareSlots([filtered[0] || null, filtered[1] || null]);
                }
            } catch (err) {
                console.error('Error fetching compare candidates:', err);
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

        const fetchProduct = async () => {
            setLoading(true);
            setNotFound(false);
            setLoadError(false);
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, { credentials: "include" });
                    // Genuine 404 — the product really doesn't exist. Don't retry.
                    if (res.status === 404) {
                        if (!cancelled) { setNotFound(true); setLoading(false); }
                        return;
                    }
                    // Server error — fall through to retry.
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (cancelled) return;
                    if (data.success && data.data) {
                        applyProductData(data);
                        setLoading(false);
                        return;
                    }
                    // OK response but no product payload — treat as not found.
                    setNotFound(true);
                    setLoading(false);
                    return;
                } catch (err) {
                    if (cancelled) return;
                    console.error(`Error fetching product (attempt ${attempt}/${maxAttempts}):`, err);
                    if (attempt < maxAttempts) {
                        // Brief backoff, then retry — a transient backend hiccup
                        // (e.g. load spike during an image upload) shouldn't show
                        // a permanent "Product not found".
                        await new Promise(r => setTimeout(r, attempt * 600));
                        continue;
                    }
                    setLoadError(true);
                    setLoading(false);
                }
            }
        };

        fetchProduct();
        return () => { cancelled = true; };
    }, [id, locale, reloadKey]);

    useEffect(() => {
        const checkHeight = () => {
            if (shortDescRef.current) {
                const element = shortDescRef.current;
                // Check if scrollHeight is greater than offsetHeight (clamped height)
                const hasOverflow = element.scrollHeight > element.offsetHeight;
                setCanShowReadMore(hasOverflow);
            }
        };

        // Run after a small delay to ensure rendering and styles are applied
        const timer = setTimeout(checkHeight, 150);

        window.addEventListener('resize', checkHeight);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkHeight);
        };
    }, [product, locale]);

    // Whenever the user picks a different option combo (e.g. another color),
    // restart the gallery at the first image — declared up here so it always runs,
    // ahead of any `if (!product) return` early-out below.
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [selectedValues]);

    // Reset the visible compare slots (admin-curated mode) whenever the product changes.
    useEffect(() => {
        setCompareVisiblePoolIdx([0, 1]);
    }, [product?.id]);

    // Compare drawer search — filter the already-loaded same-category pool client-side
    // (avoids a server roundtrip per keystroke; the pool is small, scoped to one category).
    useEffect(() => {
        const q = compareSearch.trim().toLowerCase();
        if (!q) { setCompareSearchResults(compareCandidates); return; }
        setCompareSearchResults(
            compareCandidates.filter((p: any) => {
                const name = String(p.name || '').toLowerCase();
                const nameAr = String(p.name_ar || '').toLowerCase();
                const model = String(p.model || '').toLowerCase();
                return name.includes(q) || nameAr.includes(q) || model.includes(q);
            })
        );
    }, [compareSearch, compareCandidates]);

    // Publish current product to the chatbot's page-context channel
    useEffect(() => {
        if (!product) return;
        const name = locale === 'ar' ? (product.name_ar || product.name) : (product.name || product.name_ar);
        const category = locale === 'ar'
            ? (product.category_name_ar || product.category_name)
            : (product.category_name || product.category_name_ar);
        (window as any).__mariotChatContext = {
            type: 'product',
            name,
            category,
            brand: product.brand_name || product.brand,
            price: product.sale_price || product.price,
            slug: product.slug,
        };
        return () => {
            if ((window as any).__mariotChatContext?.slug === product.slug) {
                (window as any).__mariotChatContext = null;
            }
        };
    }, [product, locale]);

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
                router.refresh();
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
    // Transient load failure (network/5xx/timeout) — offer a retry instead of
    // the permanent "Product not found" screen.
    if (loadError) {
        return (
            <div className={styles.productDetail} style={{ padding: 0 }}>
                <div className={styles.notFoundSection}>
                    <div className={styles.notFoundIcon}>
                        <Search size={100} strokeWidth={1} />
                    </div>
                    <h1>{isArabic ? 'تعذّر تحميل المنتج' : "Couldn't load product"}</h1>
                    <p>
                        {isArabic
                            ? 'حدثت مشكلة مؤقتة في تحميل هذا المنتج. يرجى التحقق من اتصالك والمحاولة مرة أخرى.'
                            : "We hit a temporary problem loading this product. Please check your connection and try again."}
                    </p>
                    <button onClick={() => setReloadKey(k => k + 1)} className={styles.backHomeBtn} style={{ cursor: 'pointer', border: 'none' }}>
                        {isArabic ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                </div>
            </div>
        );
    }
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
                            <h2>{t('supportReady')}</h2>
                            <p>{t('supportSubtitle')}</p>
                        </div>
                        <div className={styles.supportActionsSide}>
                            <div className={styles.supportItem}>
                                <div className={styles.supportIconCircle}>
                                    <Phone size={24} fill="currentColor" color="white" />
                                </div>
                                <div className={styles.supportInfo}>
                                    <h4>{t('phoneSupport')}</h4>
                                    <p>+971 4 288 2777</p>
                                </div>
                            </div>
                            <div className={styles.supportItem}>
                                <div className={styles.supportIconCircle}>
                                    <Mail size={24} fill="currentColor" color="white" />
                                </div>
                                <div className={styles.supportInfo}>
                                    <h4>{t('infoEmail')}</h4>
                                    <p>support@mariot-group.com</p>
                                </div>
                            </div>
                            <div className={styles.supportItem}>
                                <div className={styles.supportIconCircle}>
                                    <Headset size={24} color="white" />
                                </div>
                                <div className={styles.supportInfo}>
                                    <h4>{t('helpCenter')}</h4>
                                    <p>admin@mariotkitchen.com</p>
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

        // First, collect the set of keys that have at least one matching active variant
        // (subject to prior selections). Then walk opt.values in admin-defined order to
        // emit only the active ones — this preserves the canonical order.
        const activeKeys = new Set<string>();
        const arByKey: Record<string, string | null> = {};
        const swatchFromVariant: Record<string, string | null> = {};
        productVariants.forEach((v: any) => {
            const matchesPrior = priorSelections.every((sel: any) => {
                const vo = v.options?.find((o: any) => o.option_id === sel.optionId);
                return vo && ((vo.value || '').trim() || (vo.value_ar || '').trim()) === sel.value;
            });
            if (!matchesPrior) return;
            const vo = v.options?.find((o: any) => o.option_id === opt.id);
            if (vo) {
                const key = (vo.value || '').trim() || (vo.value_ar || '').trim();
                if (key) {
                    activeKeys.add(key);
                    if (!(key in arByKey)) arByKey[key] = vo.value_ar || null;
                    if (!(key in swatchFromVariant)) swatchFromVariant[key] = vo.swatch_color || null;
                }
            }
        });

        const canonical = (opt.values || []).map((ov: any) => {
            const key = (ov.value || '').trim() || (ov.value_ar || '').trim();
            return { key, value_ar: ov.value_ar || null, swatch_color: ov.swatch_color || null };
        }).filter((x: any) => x.key && activeKeys.has(x.key));

        // Append any active keys that weren't in opt.values (defensive fallback)
        const seen = new Set(canonical.map((c: any) => c.key));
        activeKeys.forEach(k => {
            if (!seen.has(k)) canonical.push({ key: k, value_ar: arByKey[k] || null, swatch_color: swatchFromVariant[k] || null });
        });

        return {
            ...opt,
            values: canonical.map((c: any) => ({ value: c.key, value_ar: c.value_ar, swatch_color: c.swatch_color }))
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

    // --- Custom-size pricing ---
    const isCustomizable = Number(product.is_customizable) === 1;
    const customDimensionList: Array<'width' | 'depth' | 'height'> = Array.isArray(product.custom_dimensions)
        ? product.custom_dimensions.filter((d: any) => ['width', 'depth', 'height'].includes(d))
        : [];
    const sizeTiers: Array<{ dimension: string; min_cm: number; max_cm: number; price: number }> =
        Array.isArray(product.size_tiers) ? product.size_tiers : [];

    // Final price = sum of the matched tier price for every enabled dimension.
    // Out of range when ANY enabled dim has no tier covering the value.
    const customPrice = (() => {
        if (!isCustomizable || customDimensionList.length === 0 || sizeTiers.length === 0) return null;
        let total = 0;
        for (const dim of customDimensionList) {
            const v = Number(customDims[dim]);
            if (!Number.isFinite(v) || customDims[dim] === '') return null;
            const dimTiers = sizeTiers.filter(t => t.dimension === dim);
            if (dimTiers.length === 0) return null;
            const tier = dimTiers.find(t => v >= Number(t.min_cm) && v <= Number(t.max_cm));
            if (!tier) return null;
            total += Number(tier.price);
        }
        return total;
    })();

    const customAllValid = isCustomizable && customPrice !== null;

    // An offer only counts while it is within its active window. Once offer_end passes,
    // the product (and its variants) revert to the main price everywhere — including the
    // price added to the cart.
    const offerNowTs = Date.now();
    const isOfferActive =
        (!product.offer_start || new Date(product.offer_start).getTime() <= offerNowTs) &&
        (!product.offer_end || new Date(product.offer_end).getTime() > offerNowTs);
    const variantHasOffer = isOfferActive && !!(selectedVariant && selectedVariant.offer_price !== null && Number(selectedVariant.offer_price) > 0);
    const productHasOffer = isOfferActive && !!(product.offer_price && Number(product.offer_price) > 0);
    const hasOffer = selectedVariant ? variantHasOffer : productHasOffer;

    const displayPrice = isCustomizable
        ? (customPrice ?? 0)
        : (selectedVariant
            ? (variantHasOffer ? Number(selectedVariant.offer_price) : Number(selectedVariant.price))
            : (productHasOffer ? Number(product.offer_price) : Number(product.price || 0)));
    const oldPrice = isCustomizable ? null : (selectedVariant
        ? (variantHasOffer ? Number(selectedVariant.price) : null)
        : (productHasOffer ? Number(product.price) : null));

    const variantsTotalStock = hasVariants
        ? productVariants.reduce((s: number, v: any) => s + Number(v.stock_quantity || 0), 0)
        : 0;
    const effectiveStock = hasVariants
        ? (selectedVariant ? Number(selectedVariant.stock_quantity) : variantsTotalStock)
        : Number(product.stock_quantity || 0);

    // "Always in stock" products (track_inventory = 0) are never out of stock, even when
    // stock_quantity is 0. Variant products always honor variant stock (the backend forces
    // track_inventory = 1 for variant lines), so they remain inventory-tracked.
    const tracksInventory = hasVariants ? true : Number(product.track_inventory) === 1;
    const outOfStock = tracksInventory && effectiveStock <= 0;
    // Units the user may pick. Untracked products aren't capped by stock_quantity.
    const maxQty = tracksInventory ? effectiveStock : 99;

    // Mirror ProductCard's gallery build: primary image first, then the gallery
    // rows, dropping empty URLs so a blank DB row can't render a broken <img>.
    const galleryImages: string[] = Array.from(new Set([
        resolveUrl(product.primary_image),
        ...(Array.isArray(product.images) ? product.images.map((img: any) => resolveUrl(img.image_url)) : []),
    ].filter(Boolean)));
    const baseImages: string[] = galleryImages.length > 0 ? galleryImages : [LOGO_FALLBACK];
    // When a variant is selected with its own gallery, show ONLY that variant's images.
    const variantImageUrls: string[] = (selectedVariant && !selectedVariant.use_primary_image)
        ? (Array.isArray(selectedVariant.image_urls) && selectedVariant.image_urls.length > 0
            ? selectedVariant.image_urls
            : (selectedVariant.image_url ? [selectedVariant.image_url] : []))
        : [];
    const resolvedVariantImages: string[] = variantImageUrls.map((u: string) => resolveUrl(u)).filter(Boolean);
    const images: string[] = resolvedVariantImages.length > 0 ? resolvedVariantImages : baseImages;

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

    // Native share sheet (Web Share API) on mobile; on desktop / unsupported
    // browsers we fall back to copying the link. The rich preview shown by
    // WhatsApp/Telegram/etc. comes from the page's Open Graph tags
    // (see generateMetadata in product/[...slug]/page.tsx), so we only pass the
    // localized title + message + URL here.
    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = getLocalizedField('name', 'name_ar');
        const text = `${t('shareText')}\n${title}`;
        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ title, text, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            showNotification(t('linkCopied'), 'success');
        } catch (err: any) {
            // AbortError = user dismissed the share sheet; not an error worth surfacing.
            if (err?.name !== 'AbortError') {
                try {
                    await navigator.clipboard.writeText(url);
                    showNotification(t('linkCopied'), 'success');
                } catch {
                    showNotification(t('shareFailed'), 'error');
                }
            }
        }
    };


    const freeGifts: any[] = Array.isArray((product as any)?.free_gift_products) ? (product as any).free_gift_products : [];
    const hasFreeGifts = freeGifts.length > 0;
    const activeGiftId = selectedGiftId !== null && freeGifts.some(g => g.id === selectedGiftId)
        ? selectedGiftId
        : (freeGifts[0]?.id ?? null);
    const activeGift = freeGifts.find(g => g.id === activeGiftId) || null;

    const performAddToCart = async (withGifts: boolean) => {
        if (hasVariants && !selectedVariant) {
            showNotification(t('selectOptionsFirst', { defaultValue: 'Please select all options first' }), 'error');
            return false;
        }
        if (isCustomizable && !customAllValid) {
            showNotification(t('enterValidDimensions', { defaultValue: 'Please enter valid dimensions within the allowed ranges' }), 'error');
            return false;
        }
        const customLabel = isCustomizable
            ? customDimensionList.map(d => `${d.charAt(0).toUpperCase() + d.slice(1)}: ${customDims[d]}cm`).join(' / ')
            : undefined;
        const success = await addToCart({
            id: product.id,
            variant_id: selectedVariant?.id || null,
            variant_label: variantLabel || customLabel || undefined,
            name: product.name,
            name_ar: product.name_ar,
            // Selected variant's SKU (model number) so cart/quotation/order show it
            model: (selectedVariant && selectedVariant.sku) ? selectedVariant.sku : product.model,
            price: displayPrice,
            image: images[0],
            brand: product.brand_name,
            slug: product.slug,
            stock_quantity: effectiveStock,
            track_inventory: hasVariants ? 1 : product.track_inventory,
            quantity: Number(qty) || 1,
            oldPrice: oldPrice,
            // Only persist dimensions the admin actually enabled AND the user filled —
            // avoids leaking empty keys (e.g. "Depth: cm") into cart/order/notifications.
            custom_dimensions: isCustomizable
                ? customDimensionList.reduce((acc, d) => {
                    if (customDims[d] !== '' && customDims[d] != null) acc[d] = customDims[d];
                    return acc;
                }, {} as Record<string, string>)
                : undefined
        });

        if (success && withGifts && activeGift) {
            // Add the selected free gift as a separate cart line at price 0, tied to the parent product.
            const giftCatalogPrice = Number(activeGift.offer_price) > 0
                ? Number(activeGift.offer_price)
                : Number(activeGift.price || 0);
            await addToCart({
                id: activeGift.id,
                variant_id: null,
                name: activeGift.name,
                name_ar: activeGift.name_ar,
                price: 0,
                original_price: giftCatalogPrice,
                image: activeGift.primary_image,
                brand: activeGift.brand_name || '',
                slug: activeGift.slug,
                quantity: 1,
                is_free_gift: true,
                bundle_parent_id: product.id
            }, { silent: true });
        }

        if (success) {
            setCartAdded(true);
            setTimeout(() => setCartAdded(false), 2000);
        }
        return success;
    };

    const handleAddToCart = async () => {
        // If this product has free-gift bundles, offer them via the modal first.
        if (hasFreeGifts) {
            // Still validate selection before opening the modal so the user fixes it now.
            if (hasVariants && !selectedVariant) {
                showNotification(t('selectOptionsFirst', { defaultValue: 'Please select all options first' }), 'error');
                return;
            }
            if (isCustomizable && !customAllValid) {
                showNotification(t('enterValidDimensions', { defaultValue: 'Please enter valid dimensions within the allowed ranges' }), 'error');
                return;
            }
            setShowBundleModal(true);
            return;
        }
        await performAddToCart(false);
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

    // Which of the product's videos is the featured one. Stored alongside the links
    // when the CMS payload is an object rather than a bare array.
    let featuredVideoIndex = 0;
    if (videoDataRaw) {
        try {
            const parsed = JSON.parse(videoDataRaw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                featuredVideoIndex = parsed.featuredIndex ?? 0;
            }
        } catch { /* a bare string has no featured index */ }
    }
    const featuredVideoUrl = videoLinks[featuredVideoIndex] || videoLinks[0] || '';

    const youTubeId = (url: string) => {
        const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
        return m ? m[1] : '';
    };

    // Built from the id so the frame always lands on one origin.
    //
    // Rewriting the link textually produced "youtube.com/embed/..." from a youtu.be
    // share link and "www.youtube.com/embed/..." from a normal one — two different
    // origins for the same video. The document's Permissions-Policy delegates
    // autoplay and fullscreen to a named origin, so a frame on the other spelling
    // silently loses them.
    const toEmbedUrl = (url: string) => {
        const id = youTubeId(url);
        return id ? `https://www.youtube.com/embed/${id}` : (url || '');
    };

    // YouTube's own still, so the strip shows what the video is of rather than a
    // generic play icon.
    //
    // maxresdefault and mqdefault are both true 16:9. hqdefault, which this used
    // before, is 480x360 - 4:3 with black bars baked into the image - so filling a
    // 16:9 frame with it cropped away far more than the bars and the still looked
    // zoomed in. maxres is not generated for every upload, hence the fallback.
    const youTubeStill = (url: string) => {
        const id = youTubeId(url);
        return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
    };

    const youTubeStillFallback = (url: string) => {
        const id = youTubeId(url);
        return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '';
    };

    // The video rides along at the end of the image gallery, so it plays in the same
    // frame as the photos instead of sitting in its own column beside the copy.
    type GalleryItem =
        | { kind: 'image'; src: string }
        | { kind: 'video'; embed: string; still: string; stillFallback: string };

    const galleryItems: GalleryItem[] = [
        ...images.map((src: string) => ({ kind: 'image' as const, src })),
        ...(featuredVideoUrl
            ? [{ kind: 'video' as const, embed: toEmbedUrl(featuredVideoUrl), still: youTubeStill(featuredVideoUrl), stillFallback: youTubeStillFallback(featuredVideoUrl) }]
            : []),
    ];

    const activeIsVideo = galleryItems[currentImageIndex]?.kind === 'video';

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
                                href={`/${locale}/shop?category=${product.sub_sub_category_slug}`}
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
                                {/* Stock is a fact about the product, but pinned over a playing
                                    video it reads as a label on the video and covers it. */}
                                {!activeIsVideo && (
                                    <div
                                        className={styles.stockBadge}
                                        style={{ backgroundColor: !outOfStock ? '#62d972' : '#ff4d4f' }}
                                    >
                                        {!outOfStock ? t('inStock') : t('outOfStock')}
                                    </div>
                                )}
                                <button className={styles.wishlistBtn} onClick={toggleWishlist}>
                                    <Heart size={20} fill={isFav ? "#e31e24" : "none"} color={isFav ? "#e31e24" : "#999"} />
                                </button>
                                <button
                                    className={styles.shareBtn}
                                    onClick={handleShare}
                                    aria-label={t('share')}
                                    title={t('share')}
                                >
                                    <Share2 size={18} color="#555" />
                                </button>

                                {/* The frame keeps one shape for every slide. Reshaping it when the
                                    video became active resized the gallery mid-swipe, and the video
                                    fills the frame on its own black now, so there is nothing to gain
                                    from the change. */}
                                <div className={styles.mainImageWrapper}>
                                    <Swiper
                                        onSwiper={(swiper: any) => (mainSwiperRef.current = swiper)}
                                        spaceBetween={0}
                                        pagination={{
                                            clickable: true,
                                            el: `.${styles.swiperPagination}`,
                                            bulletClass: styles.swiperBullet,
                                            bulletActiveClass: styles.swiperBulletActive,
                                        }}
                                        modules={[Pagination]}
                                        // Swiper suppresses clicks on its slides by default, to stop a
                                        // swipe across a link from following it. That also swallowed the
                                        // first tap on the play button, so it took two. The only thing
                                        // clickable inside a slide here is that button, and it does its
                                        // own swipe check below, so the protection costs more than it
                                        // gives.
                                        preventClicks={false}
                                        preventClicksPropagation={false}
                                        className={styles.mainSwiper}
                                        onSlideChange={(swiper: any) => {
                                            const i = swiper.activeIndex;
                                            setCurrentImageIndex(i);
                                            // Moving off the video unmounts the player, so it stops
                                            // playing and stops swallowing touches. Every navigation
                                            // path reaches here through the slideTo sync effect, which
                                            // is why this is the only place that needs to know.
                                            if (galleryItems[i]?.kind !== 'video') setVideoPlaying(false);
                                        }}
                                        initialSlide={currentImageIndex}
                                    >
                                        {galleryItems.map((item, idx: number) => (
                                            <SwiperSlide key={idx} className={styles.mainSlide}>
                                                {item.kind === 'video' ? (
                                                    // The player is mounted only once the shopper asks for it.
                                                    //
                                                    // Two problems came from mounting it as soon as the slide
                                                    // became active. An iframe swallows touch events, so a finger
                                                    // that landed on the video could neither scroll the page nor
                                                    // swipe back to the photos — the gallery trapped you. And it
                                                    // pulled in the whole YouTube player the moment anyone
                                                    // reached the last slide, which is why the video was slow.
                                                    // A still image does neither: the page scrolls over it, the
                                                    // gallery swipes past it, and nothing loads until the play
                                                    // button is pressed.
                                                    videoPlaying && currentImageIndex === idx ? (
                                                        <div className={styles.galleryVideo}>
                                                            <iframe
                                                                src={`${item.embed}${item.embed.includes('?') ? '&' : '?'}autoplay=1&rel=0&playsinline=1`}
                                                                title="Product video"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>

                                                            {/* The only way back out on a phone.
                                                                A playing iframe consumes every touch inside it, so
                                                                once the video fills the frame there is nothing left
                                                                to swipe or scroll from — the page is stuck until the
                                                                player goes away. This button sits outside the iframe
                                                                and puts the still back, which frees the gesture and
                                                                stops the video at the same time. */}
                                                            <button
                                                                type="button"
                                                                className={styles.videoCloseBtn}
                                                                onClick={() => setVideoPlaying(false)}
                                                                aria-label={isArabic ? 'إغلاق الفيديو' : 'Close video'}
                                                                title={isArabic ? 'إغلاق الفيديو' : 'Close video'}
                                                            >
                                                                <CloseIcon size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className={styles.galleryVideoPoster}
                                                            // Swiper no longer eats the click, so the ordinary click
                                                            // path works — including keyboard Enter, which a
                                                            // pointer-only handler would have missed.
                                                            //
                                                            // The press position is still recorded, so a swipe that
                                                            // happens to finish on the button does not start the
                                                            // video: released more than twelve pixels from where it
                                                            // began is a swipe, not a tap.
                                                            onPointerDown={(e) => { posterTapRef.current = { x: e.clientX, y: e.clientY }; }}
                                                            onClick={(e) => {
                                                                const start = posterTapRef.current;
                                                                posterTapRef.current = null;
                                                                if (start) {
                                                                    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
                                                                    if (moved > 12) return;
                                                                }
                                                                setCurrentImageIndex(idx);
                                                                setVideoPlaying(true);
                                                            }}
                                                            aria-label="Play product video"
                                                        >
                                                            {item.still && (
                                                                <YouTubeStill
                                                                    sources={[item.still, item.stillFallback]}
                                                                    className={styles.posterImage}
                                                                />
                                                            )}
                                                            {/* YouTube's own play button, so the still reads as a video
                                                                rather than as a photograph with a symbol on it. */}
                                                            <span className={styles.galleryPlayBadge}>
                                                                <svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true">
                                                                    <path
                                                                        d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.79 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
                                                                        className={styles.ytPlayBg}
                                                                    />
                                                                    <path d="M45 24 27 14v20z" fill="#fff" />
                                                                </svg>
                                                            </span>
                                                        </button>
                                                    )
                                                ) : (
                                                    <img
                                                        src={item.src}
                                                        alt={`${getLocalizedField('name', 'name_ar')} - ${idx + 1}`}
                                                        className={styles.mainImage}
                                                        onError={swapToLogoOnError}
                                                    />
                                                )}
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                    {/* The lightbox zooms photographs; the video has its own
                                        fullscreen control inside the player. */}
                                    {!activeIsVideo && (
                                        <button
                                            className={styles.expandBtn}
                                            onClick={() => setIsFullScreen(true)}
                                            title={isArabic ? 'تكبير الصورة' : 'Expand Image'}
                                        >
                                            <Maximize2 size={20} />
                                        </button>
                                    )}
                                    {/* Custom dots container, positioned beneath the image track */}
                                    <div className={styles.swiperPagination}></div>
                                </div>

                                <div className={styles.thumbnailsWrapper}>
                                    <button
                                        className={styles.navBtn}
                                        onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : galleryItems.length - 1)}
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
                                        {galleryItems.map((item, idx: number) => (
                                            <div
                                                key={idx}
                                                className={`${styles.thumbWrapper} ${currentImageIndex === idx ? styles.active : ''}`}
                                                onClick={() => setCurrentImageIndex(idx)}
                                            >
                                                {item.kind === 'video' ? (
                                                    <>
                                                        {/* Same placeholder problem as the poster. This one also fell
                                                            back to the Mariot logo, so a video whose maxres is missing
                                                            showed the logo in the strip instead of the video. */}
                                                        <YouTubeStill
                                                            sources={[item.still, item.stillFallback]}
                                                            alt="Product video"
                                                            className={styles.thumbImage}
                                                            onExhausted={swapToLogoOnError}
                                                        />
                                                        <span className={styles.thumbPlayBadge}><PlayCircle size={20} /></span>
                                                    </>
                                                ) : (
                                                    <img src={item.src} alt={`Thumb ${idx}`} className={styles.thumbImage} onError={swapToLogoOnError} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className={styles.navBtn}
                                        onClick={() => setCurrentImageIndex(prev => prev < galleryItems.length - 1 ? prev + 1 : 0)}
                                    >
                                        <ChevronRight size={32} />
                                    </button>
                                </div>

                                <ProductTags tags={product?.tags} tagsAr={product?.tags_ar} isArabic={isArabic} variant="desktop" />
                            </div>

                            {/* Info */}
                            <div className={styles.infoSection}>
                                {product.brand_image && (
                                    <div className={styles.brandBar}>
                                        <Link
                                            href={`/shop?brand=${encodeURIComponent(product.brand_slug || product.brand_name?.toLowerCase().replace(/ /g, '-'))}`}
                                            className={styles.brandChip}
                                        >
                                            <img src={resolveUrl(product.brand_image)} alt={getLocalizedField('brand_name', 'brand_name_ar')} className={styles.brandLogo} />
                                        </Link>

                                        <span className={styles.brandSep} aria-hidden="true" />

                                        <button
                                            type="button"
                                            className={styles.ratingInline}
                                            onClick={() => {
                                                const el = document.getElementById('reviews-section');
                                                if (el) {
                                                    const y = el.getBoundingClientRect().top + window.scrollY - 160;
                                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                                }
                                            }}
                                        >
                                            <div className={styles.titleStars}>
                                                {[1, 2, 3, 4, 5].map((star) => {
                                                    const isFull = star <= fullStarsTitle || (roundUpTitle && star <= fullStarsTitle + 1);
                                                    const isHalf = !isFull && hasHalfTitle && star === fullStarsTitle + 1;
                                                    return (
                                                        <div key={`mobile-star-${star}`} style={{ position: 'relative', width: 16, height: 16 }}>
                                                            <Star size={16} fill="#e2e8f0" color="#cbd5e1" strokeWidth={1.5} style={{ position: 'absolute', top: 0, insetInlineStart: 0 }} />
                                                            {(isFull || isHalf) && (
                                                                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: isHalf ? '50%' : '100%', height: '100%', overflow: 'hidden' }}>
                                                                    <Star size={16} fill="#f59e0b" color="#f59e0b" strokeWidth={1.5} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <span className={styles.brandRatingScore}>{avgRatingRaw.toFixed(1)}</span>
                                            <span className={styles.ratingDot} aria-hidden="true">•</span>
                                            <span className={styles.titleReviewCount}>
                                                {reviewsCount} {reviewsCount === 1 ? t('review') : t('reviews')}
                                            </span>
                                        </button>
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
                                <div className={styles.modelNumber}>{t('modelLabel')} : {(selectedVariant && selectedVariant.sku) ? selectedVariant.sku : (product.model || product.slug?.toUpperCase() || product.id)}</div>

                                {hasVariants && (
                                    <div className={styles.variantOptionsWrapper}>
                                        {productOptions.map((opt: any, optIdx: number) => {
                                            const optName = (isArabic && opt.name_ar) ? opt.name_ar : opt.name;
                                            const selectedVal = selectedValues[opt.id];
                                            const selectedMeta = opt.values?.find((v: any) =>
                                                (v.value.trim() || v.value_ar.trim()) === selectedVal
                                            );
                                            const selectedLabel = (isArabic && selectedMeta?.value_ar) ? selectedMeta.value_ar : (selectedMeta?.value || selectedVal);

                                            // If any value of this option has a swatch_color, render colored circles.
                                            // Otherwise the first option falls back to image cards and the rest to text chips.
                                            const hasSwatchColors = Array.isArray(opt.values) && opt.values.some((v: any) => v.swatch_color);
                                            const showAsSwatches = hasSwatchColors;
                                            const showAsImageCards = !showAsSwatches && optIdx === 0;

                                            const primaryFallback = product.images?.[0]
                                                ? resolveUrl(product.images[0].image_url)
                                                : LOGO_FALLBACK;

                                            return (
                                                <div key={opt.id} className={styles.variantOption}>
                                                    <div className={styles.variantOptionHeader}>
                                                        <span className={styles.variantOptionName}>{optName.toUpperCase()}</span>
                                                        {selectedVal && <span className={styles.variantOptionValue}>{selectedLabel}</span>}
                                                    </div>
                                                    <div className={showAsSwatches ? styles.variantSwatches : (showAsImageCards ? styles.variantImageCards : styles.variantChips)}>
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

                                                            if (showAsSwatches) {
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        type="button"
                                                                        title={label}
                                                                        aria-label={label}
                                                                        className={`${styles.variantSwatch} ${isSelected ? styles.variantSwatchActive : ''}`}
                                                                        onClick={handleSelect}
                                                                    >
                                                                        <span
                                                                            className={styles.variantSwatchDot}
                                                                            style={{ background: val.swatch_color || '#e5e7eb' }}
                                                                        />
                                                                    </button>
                                                                );
                                                            }

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
                                                                            <img src={thumbSrc} alt={label} onError={swapToLogoOnError} />
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

                                <div className={styles.priceSection} style={isCustomizable ? { display: 'none' } : undefined}>
                                    <div className={styles.priceRowMain}>
                                        <div className={styles.currentPrice}>
                                            <CurrencyPrice amount={displayPrice} />
                                        </div>
                                        {oldPrice && (
                                            <>
                                                <div className={styles.oldPrice}>
                                                    <CurrencyPrice amount={oldPrice} />
                                                </div>
                                                {oldPrice > displayPrice && (
                                                    <span className={styles.saveText}>
                                                        {Math.round((oldPrice - displayPrice) / oldPrice * 100)}% {t('off')}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        <span className={styles.vatLabel}>{t('vatIncluded')}</span>
                                    </div>
                                </div>

                                {/* Always prose, never a bullet list: the short description reads as a
                                    paragraph even when the admin wrote it on separate lines. */}
                                {getLocalizedField('short_description', 'short_description_ar') && (
                                    <div className={styles.shortDescriptionWrapper}>
                                        <div
                                            ref={shortDescRef}
                                            dir={detectDir(getLocalizedField('short_description', 'short_description_ar'))}
                                            className={`${styles.shortDescription} ${isShortDescExpanded ? styles.expanded : ''}`}
                                            dangerouslySetInnerHTML={{ __html: cleanShortcodes(getLocalizedField('short_description', 'short_description_ar')) }}
                                        />
                                        {canShowReadMore && (
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
                                {TABBY_ENABLED && (
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
                                )}

                                {isCustomizable && customDimensionList.length > 0 && (
                                    <div className={styles.customSizingCard}>
                                        <div className={styles.customSizingHeader}>
                                            <ListChecks size={20} color="#16a1db" />
                                            <span>{isArabic ? 'تكوين مخصص' : 'Custom Configuration'}</span>
                                        </div>

                                        <div className={styles.customSizingNote}>
                                            <Info size={18} />
                                            <span>{t('customSizeNote')}</span>
                                        </div>

                                        <div className={styles.customSizingGrid}>
                                            {customDimensionList.map(dim => {
                                                const dimTiers = sizeTiers.filter(t => t.dimension === dim);
                                                const minAllowed = dimTiers.length > 0 ? Math.min(...dimTiers.map(t => Number(t.min_cm))) : undefined;
                                                const maxAllowed = dimTiers.length > 0 ? Math.max(...dimTiers.map(t => Number(t.max_cm))) : undefined;
                                                const val = customDims[dim];
                                                const numericVal = Number(val);
                                                const isInvalid = val !== '' && (!Number.isFinite(numericVal) || !dimTiers.some(t => numericVal >= Number(t.min_cm) && numericVal <= Number(t.max_cm)));
                                                const dimLabel = t(dim as any, { defaultValue: dim.charAt(0).toUpperCase() + dim.slice(1) });

                                                // Choose icon based on dimension
                                                let DimIcon = Ruler;
                                                if (dim === 'width') DimIcon = MoveHorizontal;
                                                if (dim === 'depth') DimIcon = Ruler;
                                                if (dim === 'height') DimIcon = MoveVertical;

                                                return (
                                                    <div key={dim} className={styles.customInputWrapper}>
                                                        <label className={styles.customInputLabel}>
                                                            <DimIcon size={16} color="#475569" />
                                                            {dimLabel} (cm)
                                                        </label>
                                                        <div className={styles.dimInputContainer}>
                                                            <input
                                                                type="number"
                                                                min={minAllowed}
                                                                max={maxAllowed}
                                                                step={1}
                                                                placeholder={minAllowed !== undefined && maxAllowed !== undefined ? `${minAllowed}–${maxAllowed}` : ''}
                                                                value={val}
                                                                onChange={(e) => setCustomDims(prev => ({ ...prev, [dim]: e.target.value }))}
                                                                className={`${styles.dimensionInput} ${isInvalid ? styles.dimensionInputError : ''}`}
                                                            />
                                                            <div className={styles.dimStepControls}>
                                                                <button
                                                                    type="button"
                                                                    className={styles.dimStepBtn}
                                                                    onClick={() => {
                                                                        const current = Number(val) || 0;
                                                                        const next = Math.min(maxAllowed !== undefined ? maxAllowed : 99999, Math.max(minAllowed !== undefined ? minAllowed : 0, current + 1));
                                                                        setCustomDims(prev => ({ ...prev, [dim]: next.toString() }));
                                                                    }}
                                                                    title={isArabic ? 'زيادة' : 'Increase'}
                                                                >
                                                                    <ChevronUp size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={styles.dimStepBtn}
                                                                    onClick={() => {
                                                                        const current = Number(val) || 0;
                                                                        const next = Math.max(minAllowed !== undefined ? minAllowed : 0, current - 1);
                                                                        setCustomDims(prev => ({ ...prev, [dim]: next.toString() }));
                                                                    }}
                                                                    title={isArabic ? 'تقليل' : 'Decrease'}
                                                                >
                                                                    <ChevronDown size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {minAllowed !== undefined && maxAllowed !== undefined && (
                                                            <span className={`${styles.customInputRange} ${isInvalid ? styles.customInputRangeError : ''}`}>
                                                                {isInvalid
                                                                    ? (Number.isFinite(numericVal) && numericVal < minAllowed
                                                                        ? t('minValueIs', { min: minAllowed })
                                                                        : t('maxValueIs', { max: maxAllowed }))
                                                                    : `${minAllowed}–${maxAllowed} cm`}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className={styles.customPriceFooter}>
                                            <span className={styles.customPriceLabel}>{isArabic ? 'السعر المحتسب' : 'Calculated Price'}</span>
                                            <div className={styles.customPriceValue}>
                                                {customAllValid ? (
                                                    <CurrencyPrice amount={displayPrice} />
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>--</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <DeliveryInformation days={product?.delivery_days} locale={locale} />

                                <div className={styles.purchaseActions}>
                                    <div className={styles.qtyWrapper} ref={qtyRef}>
                                        <div
                                            className={`${styles.qtyCustomSelect} ${isQtyOpen ? styles.open : ''}`}
                                            onClick={() => setIsQtyOpen(!isQtyOpen)}
                                            style={{ opacity: outOfStock ? 0.6 : 1, pointerEvents: outOfStock ? 'none' : 'auto' }}
                                        >
                                            <span className={styles.qtyCustomSelectText}>
                                                {!outOfStock ? (
                                                    <div className={styles.manualInputWrapper}>
                                                        <span className={styles.qtyPrefix}>{t('qty')}</span>
                                                        <input
                                                            type="number"
                                                            value={qty}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                if (!isNaN(val)) {
                                                                    if (val > maxQty) {
                                                                        setQty(maxQty);
                                                                        showNotification(t('maxStockReached', { count: maxQty }) || `Maximum stock available is ${maxQty}`, 'info');
                                                                    } else {
                                                                        setQty(Math.max(1, val));
                                                                    }
                                                                } else if (e.target.value === '') {
                                                                    setQty('');
                                                                }
                                                            }}
                                                            onBlur={() => { if (qty === '') setQty(1); }}
                                                            className={styles.manualQtyInput}
                                                        />
                                                    </div>
                                                ) : '0'}
                                            </span>
                                            {isQtyOpen ? (
                                                <ChevronUp size={18} className={styles.qtyArrow} />
                                            ) : (
                                                <ChevronDown size={18} className={styles.qtyArrow} />
                                            )}
                                        </div>

                                        {isQtyOpen && !outOfStock && (
                                            <div className={styles.qtyCustomOptions}>
                                                {Array.from({ length: Math.min(maxQty, 10) }, (_, i) => i + 1).map(n => (
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
                                        {t('talkToExpert')}
                                    </button>
                                </div>

                                {outOfStock ? (
                                    <button
                                        type="button"
                                        className={styles.addToCartBtn}
                                        onClick={() => setNotifyOpen(true)}
                                        style={{
                                            backgroundColor: '#1e293b',
                                            width: '100%',
                                            flex: '0 0 56px'
                                        }}
                                    >
                                        <BellRing size={22} />
                                        {isArabic ? 'أعلمني عند التوفر' : 'Notify Me'}
                                    </button>
                                ) : (
                                    <button
                                        className={styles.addToCartBtn}
                                        onClick={handleAddToCart}
                                        disabled={cartAdded || (hasVariants && !selectedVariant) || (isCustomizable && !customAllValid)}
                                        style={{
                                            backgroundColor: cartAdded ? '#28a745' : '',
                                            width: '100%',
                                            flex: '0 0 56px'
                                        }}
                                    >
                                        {cartAdded ? null : <ShoppingCart size={24} />}
                                        {cartAdded
                                            ? t('added')
                                            : (hasVariants && !selectedVariant
                                                ? t('selectOptions', { defaultValue: 'Select options' })
                                                : t('addToCart'))}
                                    </button>
                                )}

                                {/* Extra Services — placed after Add to Cart */}
                                <div className={styles.extraServicesSection}>
                                    <div className={styles.priceMatchCard} onClick={() => setShowPriceMatchModal(true)}>
                                        <span className={styles.priceMatchIconBox}>
                                            <Tag className={styles.priceMatchIcon} size={16} />
                                        </span>
                                        <div className={styles.priceMatchInfo}>
                                            <span className={styles.priceMatchMain}>{t('getPriceMatch')}</span>
                                            <span className={styles.priceMatchSub}>{t('priceMatchSub')}</span>
                                        </div>
                                        <ChevronRight size={18} className={styles.chevronIcon} />
                                    </div>
                                </div>

                                {/* Bundle Promo — inline card; customer picks ONE free gift */}
                                {hasFreeGifts && (
                                    <div className={styles.bundleCard}>
                                        <div className={styles.bundleHeader}>
                                            <strong>{isArabic ? 'إنشاء حزمة' : 'Create a bundle'}</strong>
                                            <span> — {isArabic
                                                ? 'اختر أحد المنتجات أدناه'
                                                : 'select one of the products below'}</span>
                                        </div>
                                        <div className={styles.bundleList} role="radiogroup">
                                            {freeGifts.map((g: any) => {
                                                const isSelected = g.id === activeGiftId;
                                                return (
                                                    <div
                                                        key={g.id}
                                                        role="radio"
                                                        aria-checked={isSelected}
                                                        tabIndex={0}
                                                        onClick={() => setSelectedGiftId(g.id)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedGiftId(g.id); } }}
                                                        className={`${styles.bundleItem} ${isSelected ? styles.bundleItemSelected : styles.bundleItemUnselected}`}
                                                    >
                                                        <span className={`${styles.bundleRadio} ${isSelected ? styles.bundleRadioOn : ''}`} aria-hidden="true" />
                                                        {g.primary_image && (
                                                            <img src={g.primary_image} alt={g.name} className={styles.bundleItemImg} />
                                                        )}
                                                        <div className={styles.bundleItemInfo}>
                                                            <div className={styles.bundleItemName}>{isArabic ? (g.name_ar || g.name) : g.name}</div>
                                                            <div className={styles.bundleItemPriceRow}>
                                                                {Number(g.price) > 0 && (
                                                                    <span className={styles.bundleItemOldPrice}>
                                                                        <CurrencyPrice amount={Number(g.price)} />
                                                                    </span>
                                                                )}
                                                                <span className={styles.bundleItemFree}>{isArabic ? 'مجاناً' : 'FREE'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.bundleAddBtn}
                                            onClick={() => performAddToCart(true)}
                                            disabled={outOfStock || (hasVariants && !selectedVariant) || (isCustomizable && !customAllValid) || !activeGift}
                                        >
                                            {isArabic ? 'إضافة المنتج + الهدية إلى السلة' : 'Add product + gift to cart'}
                                        </button>
                                    </div>
                                )}

                                {/* Mobile copy — sits after the bundle / price-match cards. The
                                    desktop copy under the gallery is hidden at this width. */}
                                <ProductTags
                                    tags={product?.tags}
                                    tagsAr={product?.tags_ar}
                                    isArabic={isArabic}
                                    variant="mobile"
                                />
                            </div>
                        </div>

                    </div>

                    <div className={`${styles.sidebar} ${styles.sidebarDesktop}`}>
                        <div className={styles.trustList}>
                            <TrustItem icon={<Truck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('freeShipping')} text={t('freeShippingText')} />
                            <TrustItem icon={<Award size={32} color="#4caf50" strokeWidth={1.5} />} title={t('gulfShipping')} text={t('gulfShippingText')} />
                            <TrustItem icon={<ShieldCheck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('securePayment')} text={t('securePaymentText')} />
                            <TrustItem icon={<RotateCcw size={32} color="#4caf50" strokeWidth={1.5} />} title={t('satisfaction')} text={t('satisfactionText')} />
                            <TrustItem icon={<Headset size={32} color="#4caf50" strokeWidth={1.5} />} title={t('onlineSupport')} text={t('onlineSupportText')} />
                            <TrustItem icon={<ShieldCheck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('warranty')} text={t('warrantyText', { count: Number(product?.warranty) > 0 ? Number(product?.warranty) : 1 })} />
                        </div>

                        <div className={styles.paymentMethods}>
                            <div className={styles.paymentTitle}>{t('weAcceptPayment')}</div>
                            <div className={styles.paymentLogos}>
                                <img src="/assets/visa-logo.svg" alt="Visa" className={styles.visaDetailLogo} />
                                <img src="/assets/mastercard-logo.svg" alt="Mastercard" />
                                {TABBY_ENABLED && <img src="/assets/Tabby.webp" alt="Tabby" />}
                                <img src="/assets/apple-pay-logo.svg" alt="ApplePay" />
                                <img src="/assets/google-pay-logo.svg" alt="GPay" />
                            </div>
                        </div>
                    </div>

                    <div className={styles.fbtWrapper}>
                        {product.frequently_bought_together_products && product.frequently_bought_together_products.length > 0 && (
                            <FbtSection
                                currentProduct={{
                                    ...product,
                                    price: selectedVariant ? selectedVariant.price : product.price,
                                    offer_price: selectedVariant ? selectedVariant.offer_price : product.offer_price,
                                    primary_image: images[0] || product.primary_image,
                                    variantDetails: variantLabel ? { label: variantLabel, id: selectedVariant?.id || null } : undefined,
                                }}
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

                </div>


                <div className={styles.detailsLayoutGrid}>
                    {/*     Main Content Area (Accordions Column) */}
                    <div className={styles.accordionsColumn}>
                        <div className={styles.plainDescriptionSection}>
                            <h3 className={styles.plainDescriptionTitle}>{t('description')}</h3>
                            <div className={styles.descriptionText} dir={detectDir(getLocalizedField('description', 'description_ar'))}>
                                {renderFormattedContent(getLocalizedField('description', 'description_ar')) || <p>{t('noDescription')}</p>}
                            </div>
                        </div>

                        <div className={styles.accordions} style={{ marginTop: '24px' }}>
                            {/* Product Specs */}
                            <AccordionItem
                                title={t('productSpecs')}
                                icon={<ListChecks size={20} />}
                                isOpen={!!expandedAccordions['specs']}
                                onToggle={() => toggleAccordion('specs')}
                            >
                                {getLocalizedField('specifications', 'specifications_ar') ? (
                                    <div className={styles.specsGrid}>
                                        {(() => {
                                            const cleaned = cleanShortcodes(getLocalizedField('specifications', 'specifications_ar'))
                                                .replace(/<[^>]*>/g, '\n') // Replace HTML tags with newlines
                                                .replace(/^[•\s✳️✅-]\s*/gm, ''); // Remove bullet points at start of lines
                                            const lines = cleaned.split(/\n/).filter(l => l.trim() !== '');

                                            if (lines.length > 1) {
                                                return (
                                                    <div className={styles.specsTable}>
                                                        {(() => {
                                                            const cells: any[] = [];
                                                            let desktopRowIdx = 0;
                                                            let mobileRowIdx = 0;
                                                            let itemsInRow = 0;
                                                            
                                                            lines.forEach((line) => {
                                                                const trimmed = line.trim();
                                                                let label = '';
                                                                let value = '';
                                                                const colonIdx = trimmed.indexOf(':');
                                                                if (colonIdx > 0) {
                                                                    label = trimmed.slice(0, colonIdx).trim();
                                                                    value = trimmed.slice(colonIdx + 1).trim();
                                                                } else {
                                                                    const wsIdx = trimmed.search(/\s/);
                                                                    if (wsIdx > 0) {
                                                                        label = trimmed.slice(0, wsIdx).trim();
                                                                        value = trimmed.slice(wsIdx + 1).trim();
                                                                    }
                                                                }
                                                                if (label && value) {
                                                                    cells.push({ label, value, isSingle: false, desktopRowIdx, mobileRowIdx });
                                                                    itemsInRow++;
                                                                    mobileRowIdx++;
                                                                    if (itemsInRow === 2) {
                                                                        desktopRowIdx++;
                                                                        itemsInRow = 0;
                                                                    }
                                                                } else {
                                                                    if (itemsInRow > 0) {
                                                                        desktopRowIdx++;
                                                                        itemsInRow = 0;
                                                                    }
                                                                    cells.push({ value: trimmed, isSingle: true, desktopRowIdx, mobileRowIdx });
                                                                    desktopRowIdx++;
                                                                    mobileRowIdx++;
                                                                }
                                                            });
                                                            
                                                            return cells.map((cell, idx) => (
                                                                <div 
                                                                    key={idx} 
                                                                    className={`${styles.specTableCell} ${cell.isSingle ? styles.specTableCellSingle : ''} ${cell.desktopRowIdx % 2 === 0 ? styles.desktopOdd : styles.desktopEven} ${cell.mobileRowIdx % 2 === 0 ? styles.mobileOdd : styles.mobileEven}`}
                                                                >
                                                                    {!cell.isSingle && <div className={styles.specTableLabel}>{cell.label}</div>}
                                                                    <div className={styles.specTableValue}>{cell.value}</div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                );
                                            }
                                            return <div className={styles.descriptionText} dir={detectDir(cleaned)} dangerouslySetInnerHTML={{ __html: cleaned }} />;
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
                                        <Link
                                            href={`/${locale}/shop?brand=${encodeURIComponent(product.brand_slug || (product.brand_name ? product.brand_name.toLowerCase().replace(/ /g, '-') : ''))}`}
                                            className={styles.aboutBrandLogoBox}
                                        >
                                            <img src={resolveUrl(product.brand_image)} alt={getLocalizedField('brand_name', 'brand_name_ar')} className={styles.aboutBrandLogoImg} />
                                        </Link>
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
                                                            <span className={styles.resourceFormat}>{t('pdfDocument')}</span>
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

                            {Array.isArray(product.linked_parts_products) && product.linked_parts_products.length > 0 && (
                                <AccordionItem
                                    title={t('compatibleParts') || 'Compatible Parts'}
                                    icon={<Settings size={20} />}
                                    isOpen={!!expandedAccordions['parts']}
                                    onToggle={() => toggleAccordion('parts')}
                                >
                                    {(() => {
                                        const parts = product.linked_parts_products;
                                    return (
                                        <div className={styles.linkedPartsGrid}>
                                            {parts.map((part: any, i: number) => (
                                                <div key={i} className={styles.linkedPartCard}>
                                                    <div className={styles.partImageWrap}>
                                                        <img src={resolveUrl(part.primary_image) || '/logo.png'} alt={isArabic && part.name_ar ? part.name_ar : part.name} />
                                                    </div>
                                                    <div className={styles.partInfo}>
                                                        <span className={styles.partName}>{isArabic && part.name_ar ? part.name_ar : part.name}</span>
                                                        <div className={styles.partPriceRow}>
                                                            <CurrencyPrice amount={part.offer_price > 0 ? part.offer_price : part.price} className={styles.partPrice} />
                                                            {part.offer_price > 0 && (
                                                                <CurrencyPrice amount={part.price} className={styles.partOldPrice} />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        className={styles.partAddBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart({ ...part, image: part.primary_image, quantity: 1 });
                                                        }}
                                                    >
                                                        <ShoppingCart size={16} />
                                                        <span>{t('addToCart')}</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </AccordionItem>
                            )}
                        </div>
                    </div>

                    {/* The featured video used to sit here, in its own column beside the
                        description. It now travels with the photographs in the gallery
                        above, so there is one place to look at the product. */}
                </div>

                <div className={`${styles.sidebar} ${styles.sidebarMobile}`}>
                    <div className={styles.trustList}>
                        <TrustItem icon={<Truck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('freeShipping')} text={t('freeShippingText')} />
                        <TrustItem icon={<Award size={32} color="#4caf50" strokeWidth={1.5} />} title={t('gulfShipping')} text={t('gulfShippingText')} />
                        <TrustItem icon={<ShieldCheck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('securePayment')} text={t('securePaymentText')} />
                        <TrustItem icon={<RotateCcw size={32} color="#4caf50" strokeWidth={1.5} />} title={t('satisfaction')} text={t('satisfactionText')} />
                        <TrustItem icon={<Headset size={32} color="#4caf50" strokeWidth={1.5} />} title={t('onlineSupport')} text={t('onlineSupportText')} />
                        <TrustItem icon={<ShieldCheck size={32} color="#4caf50" strokeWidth={1.5} />} title={t('warranty')} text={t('warrantyText', { count: Number(product?.warranty) > 0 ? Number(product?.warranty) : 1 })} />
                    </div>

                    <div className={styles.paymentMethods}>
                        <div className={styles.paymentTitle}>{t('weAcceptPayment')}</div>
                        <div className={styles.paymentLogos}>
                            <img src="/assets/visa-logo.svg" alt="Visa" className={styles.visaDetailLogo} />
                            <img src="/assets/mastercard-logo.svg" alt="Mastercard" />
                            {TABBY_ENABLED && <img src="/assets/Tabby.webp" alt="Tabby" />}
                            <img src="/assets/apple-pay-logo.svg" alt="ApplePay" />
                            <img src="/assets/google-pay-logo.svg" alt="GPay" />
                        </div>
                    </div>
                </div>


                {/* --- New Sections (Bottom) --- */}

                {/* Compare with similar products */}
                {(() => {
                    const adminCfg = (product as any)?.compare_config;
                    const adminEnabled = !!adminCfg?.enabled;
                    const adminSlotProducts: any[] = Array.isArray((product as any)?.compare_slot_products)
                        ? (product as any).compare_slot_products
                        : [];
                    // When admin curation is on, ignore the auto-fetched category pool.
                    if (!adminEnabled && compareCandidates.length === 0) return null;
                    if (adminEnabled && adminSlotProducts.length === 0 && (!adminCfg.rows || adminCfg.rows.length === 0)) return null;
                    const slot0 = product;
                    // When admin curation is on, the two visible slots come from the curated pool
                    // via compareVisiblePoolIdx; remaining pool entries are drawer-swappable.
                    const visibleIdx = compareVisiblePoolIdx;
                    const slotProducts: any[] = adminEnabled
                        ? [slot0, adminSlotProducts[visibleIdx[0]] || null, adminSlotProducts[visibleIdx[1]] || null]
                        : [slot0, compareSlots[0], compareSlots[1]];

                    // Common UTF-8 → Latin-1 mojibake fixes (e.g. "â€¢" → "•") so spec rows
                    // imported with the wrong encoding still display cleanly.
                    const fixMojibake = (s: string) => s
                        .replace(/â€¢/g, '•')
                        .replace(/â€"/g, '—')
                        .replace(/â€"/g, '–')
                        .replace(/â€˜/g, '‘')
                        .replace(/â€™/g, '’')
                        .replace(/â€œ/g, '“')
                        .replace(/â€/g, '”')
                        .replace(/Â°/g, '°')
                        .replace(/Â/g, '');

                    // Spec rows to never show in the compare table (case-insensitive label match).
                    const compareLabelDenylist = new Set([
                        'plate dim',
                        'container for liquid fat',
                        'standard features (heg)'
                    ]);

                    // Canonical key for a spec label: trimmed, collapsed whitespace, lower-cased.
                    // Prevents the same attribute appearing as separate rows when products differ
                    // only by casing/spacing (e.g. "Top Thickness" vs "Top thickness").
                    const normLabel = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
                    // Map a canonical key → the first original-cased label seen (used for display).
                    const labelDisplay = new Map<string, string>();

                    // Parse one spec blob into an ordered list of { label, value } pairs.
                    const parseSpecLines = (raw: string | null | undefined): Array<{ label: string; value: string }> => {
                        const out: Array<{ label: string; value: string }> = [];
                        if (!raw) return out;
                        const cleaned = fixMojibake(cleanShortcodes(String(raw)))
                            .replace(/<[^>]*>/g, '\n')
                            .replace(/^[•\s✳️✅\-â€¢]+\s*/gm, '');
                        const lines = cleaned.split(/\n/).filter(l => l.trim() !== '');
                        for (const line of lines) {
                            const parts = line.split(':');
                            if (parts.length >= 2) {
                                const label = parts[0].trim();
                                const value = parts.slice(1).join(':').trim();
                                if (!label || !value) continue;
                                out.push({ label, value });
                            }
                        }
                        return out;
                    };

                    // Build a product's spec map keyed by the canonical ENGLISH label so rows align
                    // across products regardless of which ones have Arabic specs. The Arabic value/label
                    // (when present) is matched to the English one by line order and used for display.
                    const parseSpecs = (p: any): Map<string, string> => {
                        const m = new Map<string, string>();
                        const enList = parseSpecLines(p?.specifications);
                        const arList = parseSpecLines(p?.specifications_ar);
                        enList.forEach((en, i) => {
                            const key = normLabel(en.label);
                            if (compareLabelDenylist.has(key)) return;
                            const ar = arList[i];
                            const value = (isArabic && ar?.value) ? ar.value : en.value;
                            const dispLabel = (isArabic && ar?.label) ? ar.label : en.label;
                            if (!m.has(key)) m.set(key, value);
                            if (!labelDisplay.has(key)) labelDisplay.set(key, dispLabel);
                        });
                        // Fallback: a product with only Arabic specs still keys by its own labels.
                        if (enList.length === 0) {
                            arList.forEach((ar) => {
                                const key = normLabel(ar.label);
                                if (compareLabelDenylist.has(key)) return;
                                if (!m.has(key)) m.set(key, ar.value);
                                if (!labelDisplay.has(key)) labelDisplay.set(key, ar.label);
                            });
                        }
                        return m;
                    };

                    const specMaps = slotProducts.map(p => parseSpecs(p));

                    // Build the union of attribute keys, preserving first-appearance order (left → right).
                    const seen = new Set<string>();
                    const allLabels: string[] = []; // canonical keys
                    specMaps.forEach(m => {
                        m.forEach((_, key) => {
                            if (!seen.has(key)) { seen.add(key); allLabels.push(key); }
                        });
                    });

                    // Admin-curated rows take precedence over auto-parsed labels.
                    const adminRows: Array<{ label: string; label_ar?: string; values: string[]; values_ar?: string[] }> = adminEnabled && Array.isArray(adminCfg?.rows)
                        ? adminCfg.rows
                        : [];

                    const priceOf = (p: any) => {
                        if (!p) return null;
                        const o = Number(p.offer_price);
                        return o > 0 ? o : Number(p.price);
                    };

                    // Stainless-steel products get an extra "Sizes" (W × D × H) row under Price.
                    const isStainlessSteel = [slot0?.category_slug, slot0?.sub_category_slug, slot0?.sub_sub_category_slug]
                        .some((s: any) => s === 'stainless-steel-fabrications')
                        || /stainless steel/i.test(String(slot0?.category_name || ''));

                    const parseDims = (raw: any): { width?: any; depth?: any; height?: any } | null => {
                        if (!raw) return null;
                        let bd: any = raw;
                        if (typeof bd === 'string') { try { bd = JSON.parse(bd); } catch { return null; } }
                        return (bd && typeof bd === 'object') ? bd : null;
                    };
                    const fmtSize = (bd: { width?: any; depth?: any; height?: any } | null): string | null => {
                        if (!bd) return null;
                        const nums = [bd.width, bd.depth, bd.height]
                            .map(v => (v === undefined || v === null || String(v).trim() === '') ? null : v);
                        if (nums.every(v => v === null)) return null;
                        const unit = isArabic ? 'سم' : 'cm';
                        return `${nums.map(v => (v === null ? '—' : v)).join(' × ')} ${unit}`;
                    };
                    // Slot 0 (this product) reflects the LIVE selected size so it updates with the
                    // chosen dimensions — exactly like the price does; other slots use base dimensions.
                    const sizeFor = (p: any, idx: number): string | null => {
                        if (idx === 0 && isCustomizable) {
                            return fmtSize({ width: customDims.width, depth: customDims.depth, height: customDims.height });
                        }
                        return fmtSize(parseDims(p?.base_dimensions));
                    };

                    return (
                        <div className={`${styles.extraSection} ${styles.compareSection}`}>
                            <div className={styles.sectionTitle}>
                                <h2>{isArabic ? 'قارن مع منتجات مماثلة' : 'Compare with similar products'}</h2>
                            </div>

                            <div className={styles.compareTableWrapper}>
                                <table className={styles.compareTable}>
                                    <colgroup>
                                        <col />
                                        <col />
                                        <col />
                                        <col />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th>
                                                <div className={styles.compareCornerCell}>
                                                    <div className={styles.compareCornerIcon}>
                                                        <Scale size={44} strokeWidth={1.5} />
                                                    </div>
                                                    <span className={styles.compareCornerLabel}>{isArabic ? 'قارن' : 'Compare'}</span>
                                                </div>
                                            </th>
                                            {slotProducts.map((p, idx) => (
                                                <th key={idx}>
                                                    {p ? (
                                                        <div className={styles.compareHeadCell}>
                                                            {idx === 0 ? (
                                                                // Current product — not a link (you're already here).
                                                                // Mirror the main gallery's image source (images[0]) so the
                                                                // header always shows the same picture the user is viewing,
                                                                // even when the DB `primary_image` field is stale/wrong.
                                                                <>
                                                                    <img
                                                                        src={images[0] || resolveUrl(p.primary_image) || LOGO_FALLBACK}
                                                                        alt={p.name}
                                                                        className={styles.compareHeadImg}
                                                                        onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; }}
                                                                    />
                                                                    <div className={styles.compareHeadName}>
                                                                        {isArabic ? (p.name_ar || p.name) : p.name}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <Link
                                                                    href={`/${locale}/product/${p.slug || p.id}`}
                                                                    style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'block' }}
                                                                >
                                                                    <img
                                                                        src={resolveUrl(p.primary_image || p.images?.[0]?.image_url) || LOGO_FALLBACK}
                                                                        alt={p.name}
                                                                        className={styles.compareHeadImg}
                                                                        onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; }}
                                                                    />
                                                                    <div className={styles.compareHeadName}>
                                                                        {isArabic ? (p.name_ar || p.name) : p.name}
                                                                    </div>
                                                                </Link>
                                                            )}
                                                            {idx === 0 ? (
                                                                <div className={styles.compareThisProduct}>{isArabic ? 'هذا المنتج' : 'This Product'}</div>
                                                            ) : (
                                                                // In admin mode, only offer the swap button when the curated pool has
                                                                // at least one extra product beyond what's already on screen.
                                                                (!adminEnabled || adminSlotProducts.length > 2) && (
                                                                    <button
                                                                        type="button"
                                                                        className={styles.compareChangeBtn}
                                                                        onClick={() => { setCompareSearch(''); setCompareDrawerSlot(idx - 1); }}
                                                                    >
                                                                        {isArabic ? 'تغيير المنتج' : 'Change Product'}
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={styles.compareHeadCell}>
                                                            <img
                                                                src={LOGO_FALLBACK}
                                                                alt="Mariot"
                                                                className={`${styles.compareHeadImg} ${styles.compareEmptyImg}`}
                                                            />
                                                            {!adminEnabled && (
                                                                <button
                                                                    type="button"
                                                                    className={styles.compareChangeBtn}
                                                                    onClick={() => { setCompareSearch(''); setCompareDrawerSlot(idx - 1); }}
                                                                >
                                                                    {isArabic ? 'اختر منتج' : 'Pick a product'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className={styles.compareRowLabel}>{isArabic ? 'السعر' : 'Price'}</td>
                                            {slotProducts.map((p, idx) => {
                                                // Current product (idx 0) mirrors the main price the user sees —
                                                // `displayPrice` already reflects the selected variant's offer/price.
                                                const price = idx === 0 ? displayPrice : priceOf(p);
                                                return (
                                                    <td key={idx} className={styles.compareCell}>
                                                        {price !== null && price !== undefined ? <CurrencyPrice amount={Number(price)} /> : '—'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {isStainlessSteel && (
                                            <tr>
                                                <td className={styles.compareRowLabel}>{isArabic ? 'المقاسات' : 'Sizes'}</td>
                                                {slotProducts.map((p, idx) => (
                                                    <td key={idx} className={styles.compareCell}>{sizeFor(p, idx) || '—'}</td>
                                                ))}
                                            </tr>
                                        )}
                                        {adminRows.length > 0
                                            ? adminRows.map((row, ri) => {
                                                // values[0] is "this product"; values[1 + poolIdx] maps to the curated product at that pool position.
                                                // In Arabic locale, prefer the *_ar variants but fall back to EN when empty.
                                                const pickCell = (idx: number) => {
                                                    const en = row.values?.[idx] || '';
                                                    const ar = row.values_ar?.[idx] || '';
                                                    return isArabic ? (ar || en) : en;
                                                };
                                                const cellValues = [
                                                    pickCell(0),
                                                    pickCell(1 + visibleIdx[0]),
                                                    pickCell(1 + visibleIdx[1])
                                                ];
                                                const rowLabel = isArabic ? (row.label_ar || row.label) : row.label;
                                                return (
                                                    <tr key={`admin-${ri}-${rowLabel}`}>
                                                        <td className={styles.compareRowLabel}>{rowLabel}</td>
                                                        {cellValues.map((v, ci) => (
                                                            <td key={ci} className={styles.compareCell}>
                                                                {v && v.trim() ? v : '—'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })
                                            : allLabels.map(key => (
                                                <tr key={key}>
                                                    <td className={styles.compareRowLabel}>{labelDisplay.get(key) || key}</td>
                                                    {specMaps.map((m, idx) => (
                                                        <td key={idx} className={styles.compareCell}>{m.get(key) || '—'}</td>
                                                    ))}
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}

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
                                    <div className={styles.noReviewsIcon}>
                                        <ShieldCheck size={28} color="#5bb377" />
                                    </div>
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
                            <button
                                type="button"
                                className={styles.premiumBtn}
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
                                <MessageSquare size={18} />
                                {t('speakWithExpert')}
                            </button>
                            <span style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>{t('availableMonSat')}</span>
                        </div>
                    </div>
                </div>
                {/* Tabby Modal */}
                {
                    TABBY_ENABLED && showTabbyModal && (
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
                                        <div className={styles.installmentPrice}><CurrencyPrice amount={Number(monthlyPayment)} />/mo</div>
                                    </div>

                                    <div className={styles.installmentRow}>
                                        <div className={styles.installmentInfo}>
                                            <h4>{t('payments6')}</h4>
                                            <div className={styles.installmentSub}>{t('includesFee')}</div>
                                        </div>
                                        <div className={styles.installmentPrice}><CurrencyPrice amount={Number(displayPrice) / 6 * 1.025} />/mo</div>
                                    </div>

                                    <div className={styles.installmentRow}>
                                        <div className={styles.installmentInfo}>
                                            <h4>{t('payments12')}</h4>
                                            <div className={styles.installmentSub}>{t('includesFee')}</div>
                                        </div>
                                        <div className={styles.installmentPrice}><CurrencyPrice amount={Number(displayPrice) / 12 * 1.025} />/mo</div>
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

                                    {pmError && (
                                        <div className={styles.pmErrorMessage}>
                                            <Info size={16} />
                                            <span>{pmError}</span>
                                        </div>
                                    )}

                                    <div className={styles.pmCheckboxGroup} onClick={() => {
                                        setPmForm({ ...pmForm, agreed: !pmForm.agreed });
                                        if (pmError) setPmError(null);
                                    }}>
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            className={styles.pmCheckbox}
                                            checked={pmForm.agreed}
                                            onChange={() => { }} // Handled by group click
                                        />
                                        <label htmlFor="terms" className={styles.pmCheckboxLabel}>
                                            {t('agreeTermsPrev') || 'I have read the'} <Link href={`/${locale}/price-match-policy`} onClick={(e) => e.stopPropagation()}>{t('priceMatchPolicy') || 'Price Match Policy'}</Link> {t('agreeTermsMid') || 'and I agree to the'} <Link href={`/${locale}/terms-and-conditions`} onClick={(e) => e.stopPropagation()}>{t('termsAndConditions') || 'Terms and Conditions'}</Link>
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

                {/* Compare Drawer — auto mode searches same-category pool; admin mode lists curated picks */}
                {compareDrawerSlot !== null && (() => {
                    const adminCfg = (product as any)?.compare_config;
                    const adminEnabled = !!adminCfg?.enabled;
                    const adminPool: any[] = Array.isArray((product as any)?.compare_slot_products)
                        ? (product as any).compare_slot_products
                        : [];
                    const getPrice = (p: any) => Number(p?.offer_price && Number(p.offer_price) > 0 ? p.offer_price : p?.price) || 0;
                    const getImg = (p: any) => resolveUrl(p?.primary_image || (p?.images && p.images[0]?.image_url)) || LOGO_FALLBACK;

                    // In admin mode, attach a poolIdx to each option so picking can update
                    // the visible-pool index instead of replacing the product directly.
                    const adminListRows = adminEnabled
                        ? adminPool
                            .map((p: any, poolIdx: number) => ({ p, poolIdx }))
                            .filter(({ p }) => p)
                            .filter(({ p }) => {
                                const q = compareSearch.trim().toLowerCase();
                                if (!q) return true;
                                return String(p.name || '').toLowerCase().includes(q)
                                    || String(p.name_ar || '').toLowerCase().includes(q);
                            })
                        : null;

                    return (
                        <>
                            <div className={styles.compareDrawerOverlay} onClick={() => setCompareDrawerSlot(null)} />
                            <div className={styles.compareDrawer}>
                                <div className={styles.compareDrawerHeader}>
                                    <h3>{isArabic ? 'مقارنة' : 'Comparison'}</h3>
                                    <button className={styles.compareDrawerClose} onClick={() => setCompareDrawerSlot(null)} aria-label="Close">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className={styles.compareDrawerSearchWrap}>
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.blur();
                                        }}
                                    >
                                        <input
                                            type="search"
                                            enterKeyHint="search"
                                            dir={isArabic ? 'rtl' : 'ltr'}
                                            className={styles.compareDrawerSearch}
                                            placeholder={isArabic ? 'ابحث عن منتج' : 'Search for a product'}
                                            value={compareSearch}
                                            onChange={(e) => setCompareSearch(e.target.value)}
                                        />
                                    </form>
                                </div>
                                <div className={styles.compareDrawerList}>
                                    {adminEnabled ? (
                                        (adminListRows || []).length === 0 ? (
                                            <div className={styles.compareDrawerEmpty}>
                                                {isArabic ? 'لم يتم العثور على منتجات' : 'No products found'}
                                            </div>
                                        ) : (
                                            (adminListRows || []).map(({ p, poolIdx }) => {
                                                const visibleIdx = compareVisiblePoolIdx;
                                                const otherSlotIdx = compareDrawerSlot === 0 ? 1 : 0;
                                                const isSelected = visibleIdx[compareDrawerSlot] === poolIdx;
                                                // On mobile, slot 2 is hidden so its "ownership" of a product
                                                // shouldn't block selection. We instead swap it on pick (below).
                                                const disabled = !isCompareMobile && visibleIdx[otherSlotIdx] === poolIdx;
                                                const rowPrice = getPrice(p);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        disabled={disabled}
                                                        className={`${styles.compareDrawerRow} ${isSelected ? styles.compareDrawerRowOn : ''}`}
                                                        onClick={() => {
                                                            setCompareVisiblePoolIdx(prev => {
                                                                const next: [number, number] = [...prev] as [number, number];
                                                                // If the picked product is currently in the (hidden) other slot,
                                                                // swap so the hidden slot inherits this slot's previous pick.
                                                                // Avoids both visible columns showing the same product when the
                                                                // viewport widens back to desktop.
                                                                if (prev[otherSlotIdx] === poolIdx) {
                                                                    next[otherSlotIdx] = prev[compareDrawerSlot as number];
                                                                }
                                                                next[compareDrawerSlot as number] = poolIdx;
                                                                return next;
                                                            });
                                                            setCompareDrawerSlot(null);
                                                        }}
                                                    >
                                                        <img className={styles.compareDrawerRowImg} src={getImg(p)} alt="" onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; }} />
                                                        <span className={styles.compareDrawerRowMeta}>
                                                            <span className={styles.compareDrawerRowName}>
                                                                {isArabic ? (p.name_ar || p.name) : p.name}
                                                            </span>
                                                            {rowPrice > 0 && (
                                                                <span className={styles.compareDrawerRowPrice}>
                                                                    <CurrencyPrice amount={rowPrice} />
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className={`${styles.compareDrawerRadio} ${isSelected ? styles.compareDrawerRadioOn : ''}`} aria-hidden="true" />
                                                    </button>
                                                );
                                            })
                                        )
                                    ) : (
                                        compareSearchResults.length === 0 ? (
                                            <div className={styles.compareDrawerEmpty}>
                                                {isArabic ? 'لم يتم العثور على منتجات' : 'No products found'}
                                            </div>
                                        ) : (
                                            compareSearchResults.map((p: any) => {
                                                const otherSlotIdx = compareDrawerSlot === 0 ? 1 : 0;
                                                const otherPick = compareSlots[otherSlotIdx];
                                                const currentPick = compareSlots[compareDrawerSlot];
                                                const isSelected = currentPick && currentPick.id === p.id;
                                                const disabled = otherPick && otherPick.id === p.id;
                                                const rowPrice = getPrice(p);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        disabled={!!disabled}
                                                        className={`${styles.compareDrawerRow} ${isSelected ? styles.compareDrawerRowOn : ''}`}
                                                        onClick={() => {
                                                            setCompareSlots(prev => {
                                                                const next = [...prev];
                                                                next[compareDrawerSlot] = p;
                                                                return next;
                                                            });
                                                            setCompareDrawerSlot(null);
                                                        }}
                                                    >
                                                        <img className={styles.compareDrawerRowImg} src={getImg(p)} alt="" onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; }} />
                                                        <span className={styles.compareDrawerRowMeta}>
                                                            <span className={styles.compareDrawerRowName}>
                                                                {isArabic ? (p.name_ar || p.name) : p.name}
                                                            </span>
                                                            {rowPrice > 0 && (
                                                                <span className={styles.compareDrawerRowPrice}>
                                                                    <CurrencyPrice amount={rowPrice} />
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className={`${styles.compareDrawerRadio} ${isSelected ? styles.compareDrawerRadioOn : ''}`} aria-hidden="true" />
                                                    </button>
                                                );
                                            })
                                        )
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}

                {/* Bundle Upsell Modal — appears when user clicks the main Add to Cart */}
                {showBundleModal && hasFreeGifts && (
                    <div className={styles.bundleModalOverlay} onClick={() => setShowBundleModal(false)}>
                        <div className={styles.bundleModal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.bundleModalHeader}>
                                <div>
                                    <h3 className={styles.bundleModalTitle}>{isArabic ? 'إنشاء حزمة' : 'Create a bundle'}</h3>
                                    <p className={styles.bundleModalSub}>
                                        {isArabic
                                            ? 'يمكنك إضافة منتج إضافي إلى سلتك بسعر مميز'
                                            : 'You can add an extra product to your cart at a special price'}
                                    </p>
                                </div>
                                <button className={styles.bundleModalClose} onClick={() => setShowBundleModal(false)} aria-label="Close">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className={styles.bundleList} role="radiogroup">
                                {freeGifts.map((g: any) => {
                                    const isSelected = g.id === activeGiftId;
                                    return (
                                        <div
                                            key={g.id}
                                            role="radio"
                                            aria-checked={isSelected}
                                            tabIndex={0}
                                            onClick={() => setSelectedGiftId(g.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedGiftId(g.id); } }}
                                            className={`${styles.bundleItem} ${isSelected ? styles.bundleItemSelected : styles.bundleItemUnselected}`}
                                        >
                                            <span className={`${styles.bundleRadio} ${isSelected ? styles.bundleRadioOn : ''}`} aria-hidden="true" />
                                            {g.primary_image && (
                                                <img src={g.primary_image} alt={g.name} className={styles.bundleItemImg} />
                                            )}
                                            <div className={styles.bundleItemInfo}>
                                                <div className={styles.bundleItemName}>{isArabic ? (g.name_ar || g.name) : g.name}</div>
                                                <div className={styles.bundleItemFree}>{isArabic ? 'مجاناً' : 'FREE'}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={styles.bundleModalActions}>
                                <button
                                    className={styles.bundleModalAddBtn}
                                    onClick={async () => {
                                        setShowBundleModal(false);
                                        await performAddToCart(true);
                                    }}
                                >
                                    {isArabic ? 'إضافة منتج إضافي إلى السلة' : 'Add extra product to the cart'}
                                </button>
                                <button
                                    className={styles.bundleModalSkipBtn}
                                    onClick={async () => {
                                        setShowBundleModal(false);
                                        await performAddToCart(false);
                                    }}
                                >
                                    {isArabic ? 'تخطي' : 'Skip'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
            {/* Fullscreen Image Overlay */}
            {
                isFullScreen && (
                    <div className={styles.fullscreenOverlay} onClick={() => setIsFullScreen(false)}>
                        <button
                            className={styles.closeOverlayBtn}
                            onClick={(e) => { e.stopPropagation(); setIsFullScreen(false); }}
                            aria-label={isArabic ? 'إغلاق' : 'Close'}
                        >
                            <X size={28} />
                        </button>
                        <div className={styles.fullscreenContent} onClick={e => e.stopPropagation()}>
                            {images.length > 1 ? (
                                <Swiper
                                    className={styles.fullscreenSwiper}
                                    spaceBetween={24}
                                    navigation={images.length > 1}
                                    pagination={{ clickable: true }}
                                    modules={[Navigation, Pagination]}
                                    initialSlide={currentImageIndex}
                                    onSlideChange={(swiper: any) => setCurrentImageIndex(swiper.activeIndex)}
                                >
                                    {images.map((img: string, idx: number) => (
                                        <SwiperSlide key={idx} className={styles.fullscreenSlide}>
                                            <img
                                                src={img}
                                                alt={`${getLocalizedField('name', 'name_ar')} - ${idx + 1}`}
                                                className={styles.fullscreenImage}
                                                onError={swapToLogoOnError}
                                            />
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            ) : (
                                <img
                                    src={images[currentImageIndex]}
                                    alt={getLocalizedField('name', 'name_ar')}
                                    className={styles.fullscreenImage}
                                    onError={swapToLogoOnError}
                                />
                            )}
                        </div>
                    </div>
                )
            }

            {notifyOpen && (
                <NotifyMeModal
                    open={notifyOpen}
                    onClose={() => setNotifyOpen(false)}
                    productId={product.id}
                    productName={getLocalizedField('name', 'name_ar')}
                    variantLabel={variantLabel || ''}
                />
            )}
        </div >
    );
};

export default ProductDetail;
