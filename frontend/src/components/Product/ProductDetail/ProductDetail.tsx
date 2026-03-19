'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    Maximize2
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import styles from './ProductDetail.module.css';
import { API_BASE_URL, BASE_URL } from '@/config';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Loader from '@/components/shared/Loader/Loader';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Link from 'next/link';
import { MessageSquare, Phone } from 'lucide-react';

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

const AccordionItem = ({ title, isOpen, onToggle, children }: any) => (
    <div className={styles.accordionItem}>
        <button className={styles.accordionHeader} onClick={onToggle}>
            {title}
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {isOpen && <div className={styles.accordionContent}>{children}</div>}
    </div>
);

const ProductDetail: React.FC<ProductDetailProps> = ({ id }) => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [qty, setQty] = useState(1);
    const [showTabbyModal, setShowTabbyModal] = useState(false);
    const [showPriceMatchModal, setShowPriceMatchModal] = useState(false);
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({ specs: true });
    const [isShortDescExpanded, setIsShortDescExpanded] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const mainSwiperRef = useRef<any>(null);

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
            showNotification(isArabic ? 'يرجى الموافقة على الشروط والأحكام' : 'Please agree to the Terms and Conditions', 'error');
            return;
        }

        if (!pmForm.shopName || !pmForm.email || !pmForm.phone) {
            showNotification(isArabic ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields', 'error');
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
                showNotification(isArabic ? 'تم إرسال طلبك بنجاح. سنتواصل معك قريباً.' : 'Your request has been submitted successfully. We will contact you soon.', 'success');
                setShowPriceMatchModal(false);
                setPmForm({ shopName: '', email: '', phone: '', file: null, agreed: false });
            } else {
                throw new Error(data.message || 'Failed to submit');
            }
        } catch (err) {
            console.error('Price Match Error:', err);
            showNotification(isArabic ? 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً.' : 'An error occurred while submitting your request. Please try again later.', 'error');
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
                    // Fetch related using group if available, otherwise category
                    const relatedCategory = data.data.product_group || data.data.category_slug;
                    fetchRelated(relatedCategory, data.data.id);
                    fetchReviews(data.data.id);
                }
            } catch (err) {
                console.error("Error fetching product:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchRelated = async (cat: string, currentProductId: number) => {
            if (!cat) return;
            try {
                const res = await fetch(`${API_BASE_URL}/products?category=${cat}&limit=16`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setRelatedProducts(data.data.filter((p: any) => p.id !== currentProductId));
                }
            } catch (err) {
                console.error("Error fetching related products:", err);
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
                credentials: "include"
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

    const [isDraggingRelated, setIsDraggingRelated] = useState(false);
    const [startXRelated, setStartXRelated] = useState(0);
    const [scrollLeftRelated, setScrollLeftRelated] = useState(0);

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

    const handleRelatedMouseDown = (e: React.MouseEvent) => {
        const grid = document.getElementById('related-grid');
        if (!grid) return;
        setIsDraggingRelated(true);
        setStartXRelated(e.pageX - grid.offsetLeft);
        setScrollLeftRelated(grid.scrollLeft);
        e.preventDefault();
    };

    const handleRelatedMouseLeave = () => {
        setIsDraggingRelated(false);
    };

    const handleRelatedMouseUp = () => {
        setIsDraggingRelated(false);
    };

    const handleRelatedMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRelated) return;
        const grid = document.getElementById('related-grid');
        if (!grid) return;
        e.preventDefault();
        const x = e.pageX - grid.offsetLeft;
        const walk = (x - startXRelated) * 1.1;
        grid.scrollLeft = scrollLeftRelated - walk;
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

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('localhost:5000')) {
            return url.replace('http://localhost:5000', BASE_URL);
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const images = product.images?.length > 0
        ? product.images.map((img: any) => resolveUrl(img.image_url))
        : ['/assets/placeholder-image.webp'];

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
        const success = await addToCart({
            id: product.id,
            name: product.name,
            price: displayPrice,
            image: images[0],
            brand: product.brand_name,
            slug: product.slug,
            stock_quantity: product.stock_quantity,
            quantity: qty, // Pass selected quantity here
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

    const hasOffer = product.offer_price && Number(product.offer_price) > 0;
    const displayPrice = hasOffer ? Number(product.offer_price) : Number(product.price || 0);
    const oldPrice = hasOffer ? Number(product.price) : null;
    const monthlyPayment = (displayPrice / 4).toFixed(2);

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
                <div className={styles.layout}>

                    {/* Main Content (Left) */}
                    <div className={styles.mainContent}>
                        <div className={styles.topSection}>
                            {/* Gallery */}
                            <div className={styles.gallerySection}>
                                <div
                                    className={styles.stockBadge}
                                    style={{ backgroundColor: product.stock_quantity > 0 ? '#62d972' : '#ff4d4f' }}
                                >
                                    {product.stock_quantity > 0 ? t('inStock') : t('outOfStock')}
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
                                        <span className={styles.brandLabel}>{t('brand', { defaultValue: 'Brand' })}:</span>
                                        <Link
                                            href={`/shop?brand=${encodeURIComponent(product.brand_slug || product.brand_name?.toLowerCase().replace(/ /g, '-'))}`}
                                            className={styles.brandLogoWrapper}
                                        >
                                            <img src={resolveUrl(product.brand_image)} alt={getLocalizedField('brand_name', 'brand_name_ar')} className={styles.brandLogo} />
                                        </Link>
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

                                <div className={styles.priceSection}>
                                    <div className={styles.currentPrice}>
                                        AED {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        <span className={styles.vatLabel}>{t('vatIncluded')}</span>
                                    </div>
                                    {oldPrice && (
                                        <div className={styles.oldPrice}>AED {oldPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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
                                <div className={styles.tabbyBox}>
                                    <div className={styles.tabbyText}>
                                        {t('asLowAs')} <strong>AED {monthlyPayment}{t('perMonth')}</strong> {t('orPayments')}
                                        <span className={styles.learnMore} onClick={() => setShowTabbyModal(true)}>{t('learnMore')}</span>
                                    </div>
                                    <img src="/assets/Tabby.webp" alt="Tabby" className={styles.tabbyLogo} />
                                </div>

                                {/* Extra Services */}
                                <div className={styles.extraServicesSection}>
                                    <h3 className={styles.extraServicesTitle}>{t('extraServices') || 'Extra Services'}</h3>
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
                                    <div className={styles.qtyWrapper}>
                                        <select
                                            className={styles.qtySelect}
                                            value={qty}
                                            onChange={(e) => setQty(parseInt(e.target.value))}
                                            disabled={product.stock_quantity === 0}
                                        >
                                            {product.stock_quantity > 0 ? (
                                                Array.from({ length: Math.min(product.stock_quantity, 10) }, (_, i) => i + 1).map(n => (
                                                    <option key={n} value={n}>{t('qty')} {n}</option>
                                                ))
                                            ) : (
                                                <option value={0}>0</option>
                                            )}
                                        </select>
                                        <ChevronDown size={18} className={styles.qtyArrow} />
                                    </div>
                                    <button
                                        className={styles.addToCartBtn}
                                        onClick={handleAddToCart}
                                        disabled={product.stock_quantity === 0 || cartAdded}
                                        style={{
                                            opacity: product.stock_quantity === 0 ? 0.6 : 1,
                                            cursor: product.stock_quantity === 0 ? 'not-allowed' : 'pointer',
                                            backgroundColor: cartAdded ? '#28a745' : ''
                                        }}
                                    >
                                        {cartAdded ? null : <ShoppingCart size={24} />}
                                        {cartAdded ? t('added') : (product.stock_quantity > 0 ? t('addToCart') : t('outOfStock'))}
                                    </button>
                                </div>

                                <button
                                    className={styles.whatsappBtn}
                                    onClick={() => {
                                        const productUrl = typeof window !== 'undefined' ? window.location.href : '';
                                        const msg = encodeURIComponent(t('whatsappMessage', { url: productUrl }));
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
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" />
                                <img src="/assets/Tabby.webp" alt="Tabby" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="ApplePay" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg" alt="GPay" />
                            </div>
                        </div>
                    </div>

                </div>

                <div className={styles.fullWidthDescription}>
                    <div className={styles.descriptionSection}>
                        <h2>{t('description')}</h2>
                        <div
                            className={styles.descriptionText}
                            dangerouslySetInnerHTML={{
                                __html: cleanShortcodes(getLocalizedField('description', 'description_ar')) || `<p>${t('noDescription')}</p>`
                            }}
                        />
                    </div>
                </div>

                <div className={styles.splitLayout}>
                    <div className={styles.accordionsColumn}>
                        <div className={styles.accordions}>
                            <AccordionItem
                                title={t('productSpecs')}
                                isOpen={!!expandedAccordions['specs']}
                                onToggle={() => toggleAccordion('specs')}
                            >
                                {product.specifications ? (
                                    <div className={styles.specsGrid}>
                                        {(() => {
                                            const cleaned = cleanShortcodes(product.specifications);
                                            const lines = cleaned.split(/<br\/>|\n/).filter(l => l.trim() !== '');

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

                    {/* Right column: Featured Video */}
                    <div className={styles.videoColumn}>
                        {(() => {
                            const videoDataRaw = product.youtube_video_link;
                            let links: string[] = [];
                            let fIndex = 0;
                            if (videoDataRaw) {
                                try {
                                    const parsed = JSON.parse(videoDataRaw);
                                    if (Array.isArray(parsed)) {
                                        links = parsed.filter(v => v && v.trim() !== '');
                                    } else if (parsed && typeof parsed === 'object' && parsed.links) {
                                        links = parsed.links.filter((v: string) => v && v.trim() !== '');
                                        fIndex = parsed.featuredIndex ?? 0;
                                    } else {
                                        links = [videoDataRaw].filter(v => v && v.trim() !== '');
                                    }
                                } catch {
                                    links = [String(videoDataRaw)].filter(v => v && v.trim() !== '');
                                }
                            }

                            const hasVideo = links.length > 0;
                            const featuredUrl = hasVideo ? (links[fIndex] || links[0]) : null;

                            const getEmbedUrl = (url: string) => {
                                if (!url) return '';
                                if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/').split('&')[0];
                                if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
                                return url;
                            };

                            if (!hasVideo || !featuredUrl) return null;

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
                </div>

                {/* --- New Sections (Bottom) --- */}

                {/* You may also need */}
                {relatedProducts.length > 0 && (
                    <div className={`${styles.extraSection} ${styles.relatedSection}`}>
                        <div className={styles.sectionTitle}>
                            <h2>{t('youMayAlsoNeed')}</h2>
                        </div>
                        <div className={styles.sliderWrapper}>
                            <button
                                className={`${styles.sliderArrow} ${styles.prevArrow}`}
                                onClick={() => {
                                    const grid = document.getElementById('related-grid');
                                    if (grid) grid.scrollBy({ left: -300, behavior: 'smooth' });
                                }}
                            >
                                <ChevronLeft size={26} />
                            </button>

                            <div
                                className={styles.relatedGrid}
                                id="related-grid"
                                onMouseDown={handleRelatedMouseDown}
                                onMouseLeave={handleRelatedMouseLeave}
                                onMouseUp={handleRelatedMouseUp}
                                onMouseMove={handleRelatedMouseMove}
                                style={{ cursor: isDraggingRelated ? 'grabbing' : 'grab' }}
                            >
                                {relatedProducts.map((p) => (
                                    <ProductCardPromotion key={p.id} product={{ ...p, price: Number(p.offer_price) > 0 ? Number(p.offer_price) : Number(p.price), old_price: Number(p.offer_price) > 0 ? Number(p.price) : (Number(p.old_price) || Number(p.originalPrice) || 0) }} />
                                ))}
                            </div>

                            <button
                                className={`${styles.sliderArrow} ${styles.nextArrow}`}
                                onClick={() => {
                                    const grid = document.getElementById('related-grid');
                                    if (grid) grid.scrollBy({ left: 300, behavior: 'smooth' });
                                }}
                            >
                                <ChevronRight size={26} />
                            </button>
                        </div>
                    </div>
                )}

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
                                        else window.location.href = `/${locale}/signin`;
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
                <div className={styles.extraSection}>
                    <div className={styles.askExpertCard}>
                        <div className={styles.askContent}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '12px' }}>
                                    <MessageSquare size={24} color="#059669" />
                                </div>
                                <span style={{ color: '#059669', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase' }}>{t('expertAssistance')}</span>
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
                {showTabbyModal && (
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
                )}

                {/* Price Match Modal */}
                {showPriceMatchModal && (
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
                )}
            </div>
            {/* Fullscreen Image Overlay */}
            {isFullScreen && (
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
            )}
        </div>
    );
};

export default ProductDetail;
