'use client';

import React, { useState, useEffect } from 'react';
import styles from './ProductCard.module.css';
import { Heart, MessageCircle, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';
import Image from "next/legacy/image";
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { getBrandLogo } from '@/utils/brandLogos';
import { BASE_URL } from '@/config';

export interface Product {
    id: string | number;
    model?: string;
    description?: string;
    brand?: string;
    brandImage?: string;
    price?: string | number;
    oldPrice?: string | number;
    discount?: string;
    image?: string;
    is_weekly_deal?: boolean | number;
    is_limited_offer?: boolean | number;
    is_daily_offer?: boolean | number;
    offer_start?: string;
    offer_end?: string;
    [key: string]: any;
}

interface ProductCardProps {
    id?: string | number;
    model?: string;
    description?: string;
    brand?: string;
    brandImage?: string;
    price?: number;
    oldPrice?: number;
    discount?: string;
    image?: string;
    product?: Product;
    timeLeft?: { hours: number, minutes: number, seconds: number };
}

const ProductCard: React.FC<ProductCardProps> = ({
    model = "10-1/1",
    description = "RATIONAL Electric iCombi Pro- 10-1/1 Elec",
    brand = "RATIONAL",
    brandImage,
    price = 0,
    oldPrice = 0,
    discount = "",
    image = "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop",
    product,
    id = "1",
    timeLeft
}) => {
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const locale = useLocale();
    const t = useTranslations('product');
    const isArabic = locale === 'ar';

    // If product prop is provided, use it to override defaults
    const displayId = product?.id || id;
    const displayModel = isArabic && product?.name_ar ? product.name_ar : (product?.name || product?.model || product?.sku || model);
    // Priority: locale-specific description -> fallback
    const displayDescription = isArabic && product?.description_ar ? product.description_ar : (product?.description || product?.title || description);

    // Price Logic:
    const hasOffer = !!(product?.offer_price && Number(product.offer_price) > 0);
    const displayPrice = hasOffer ? Number(product.offer_price) : (Number(product?.price) || price);

    // Only show old price if it's an actual offer or explicitly provided as non-zero prop
    const displayOldPrice = hasOffer
        ? (Number(product?.price) || 0)
        : (product ? 0 : (oldPrice || 0));

    // Discount logic: Only show if valid percentage > 0
    const dbDiscount = product?.discount_percentage;
    const isDiscountValid = dbDiscount && Number(dbDiscount) > 0;

    const displayDiscount = isDiscountValid
        ? `${dbDiscount}% OFF`
        : (product ? null : (discount || null));

    // Support all possible image property names from backend/frontend
    let displayImage = product?.primary_image || product?.image_url || product?.image || image;

    // Ensure absolute URL for relative paths (e.g., from backend uploads)
    if (displayImage) {
        if (displayImage.includes('localhost:5000')) {
            displayImage = displayImage.replace('http://localhost:5000', BASE_URL);
        } else if (!displayImage.startsWith('http') && !displayImage.startsWith('data:') && !displayImage.startsWith('/assets/')) {
            displayImage = `${BASE_URL}${displayImage.startsWith('/') ? '' : '/'}${displayImage}`;
        }
    } else {
        displayImage = 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=1470&auto=format&fit=crop';
    }

    const displayBrand = isArabic && product?.brand_name_ar ? product.brand_name_ar : (product?.brand_name || product?.brand || brand);
    const localBrandLogo = getBrandLogo(displayBrand);
    const displayBrandImage = localBrandLogo || product?.brand_image || product?.brand_logo || brandImage;
    const isWeeklyDeal = !!(product?.is_weekly_deal);
    const isLimitedOffer = !!(product?.is_limited_offer);
    const isDailyOffer = !!(product?.is_daily_offer);

    const isFav = isInWishlist(displayId);

    const formatTime = (num: number) => num.toString().padStart(2, '0');

    // Live countdown timer from offer_end
    const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        const offerEnd = product?.offer_end;
        if (!offerEnd) {
            setCountdown(null);
            return;
        }

        const endDate = new Date(offerEnd).getTime();

        const updateTimer = () => {
            const now = Date.now();
            const diff = endDate - now;
            if (diff <= 0) {
                setCountdown(null);
                return;
            }
            setCountdown({
                hours: Math.floor(diff / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000)
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [product?.offer_end]);

    const activeTimer = countdown || { hours: 0, minutes: 0, seconds: 0 };

    const rating = Number(product?.average_rating || product?.rating || 0);
    const reviews = Number(product?.total_reviews || product?.reviews_count || product?.review_count || 0);

    const renderStars = (ratingValue: number) => {
        const stars = [];
        const fullStars = Math.floor(ratingValue || 0);
        const hasHalfStar = (ratingValue || 0) % 1 !== 0;

        for (let i = 0; i < fullStars; i++) {
            stars.push(<Star key={`full-${i}`} size={14} fill="#ffc107" color="#ffc107" />);
        }
        if (hasHalfStar) {
            stars.push(<div key="half" style={{ position: 'relative', display: 'inline-block' }}>
                <Star size={14} color="#ccc" />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
                    <Star size={14} fill="#ffc107" color="#ffc107" />
                </div>
            </div>);
        }
        const emptyStars = 5 - stars.length;
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<Star key={`empty-${i}`} size={14} color="#ccc" />);
        }
        return stars;
    };

    const [cartAdded, setCartAdded] = useState(false);

    const handleAddToCart = async () => {
        const success = await addToCart({
            id: displayId,
            name: displayModel,
            price: displayPrice,
            image: displayImage,
            brand: displayBrand,
            slug: product?.slug,
            stock_quantity: product?.stock_quantity,
            oldPrice: displayOldPrice
        });

        if (success) {
            setCartAdded(true);
            setTimeout(() => setCartAdded(false), 1500);
        }
    };

    const handleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isFav) {
            removeFromWishlist(displayId);
        } else {
            addToWishlist({
                id: displayId,
                name: displayModel,
                price: displayPrice,
                image: displayImage,
                brand: displayBrand
            });
        }
    };

    const [logoError, setLogoError] = React.useState(false);

    return (
        <div className={styles.productCard}>
            <div className={styles.imageSection}>
                {displayDiscount && !isDailyOffer && <div className={styles.badge}>{displayDiscount}</div>}
                {isWeeklyDeal && <div className={`${styles.dealTag} ${styles.weeklyTag}`}>{t('weeklyDeal')}</div>}
                {isLimitedOffer && <div className={`${styles.dealTag} ${styles.limitedTag}`}>{t('limitedOffer')}</div>}
                {isDailyOffer && <div className={`${styles.dealTag} ${styles.dailyTag}`}>{t('dailyOffer')}</div>}
                {!!product?.is_best_seller && <div className={`${styles.dealTag} ${styles.bestSellerTag}`}>{t('bestSeller')}</div>}

                <button
                    className={`${styles.wishlistBtn} ${isFav ? styles.wishlistActive : ''}`}
                    onClick={handleWishlist}
                    aria-label={isFav ? "Remove from wishlist" : "Add to wishlist"}
                >
                    <Heart size={20} fill={isFav ? "#e31e24" : "none"} color={isFav ? "#e31e24" : "currentColor"} />
                </button>

                <Link href={`/product/${product?.slug || displayId}`}>
                    <div className={styles.productImg} style={{ position: 'relative' }}>
                        <Image
                            src={displayImage}
                            alt={displayModel}
                            layout="fill"
                            objectFit="contain"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                    </div>
                </Link>
            </div>
            <div className={styles.productInfo}>
                {(isDailyOffer || isLimitedOffer || isWeeklyDeal) && activeTimer && (
                    <div className={styles.dealSection}>
                        <div className={styles.innerTimer}>
                            {t('endingIn')} <span>{formatTime(activeTimer.hours)}h {formatTime(activeTimer.minutes)}m {formatTime(activeTimer.seconds)}s</span>
                        </div>
                    </div>
                )}
                <div className={styles.ratingBox}>
                    <div className={styles.stars}>
                        {renderStars(rating)}
                    </div>
                    {reviews > 0 ? (
                        <span className={styles.reviewCount}>({rating.toFixed(1)}) {reviews} {reviews !== 1 ? t('reviews') : t('review')}</span>
                    ) : (
                        <span className={styles.reviewCount}>{t('noReviews')}</span>
                    )}
                </div>
                <span className={styles.modelName}>
                    {displayModel}
                </span>
                <p className={styles.description}>{t('modelLabel')} {product?.model || product?.slug?.toUpperCase() || displayId}</p>

                <Link
                    href={`/shop?brand=${encodeURIComponent((displayBrand || '').toLowerCase().replace(/ /g, '-'))}`}
                    className={styles.brandLogoBox}
                    style={{ textDecoration: 'none' }}
                >
                    <div className={styles.logoBorder}>
                        {displayBrandImage && !logoError ? (
                            <img
                                src={displayBrandImage}
                                alt={displayBrand || 'Brand'}
                                className={styles.brandLogoImg}
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <span className={styles.brandText}>{displayBrand}</span>
                        )}
                    </div>
                </Link>

                <div className={styles.priceSection}>
                    <div className={styles.currentPrice}>AED {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className={styles.savingsRow}>
                        {displayOldPrice > 0 && displayOldPrice > displayPrice && (
                            <span className={styles.oldPrice}>AED {displayOldPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        )}
                        <span className={styles.discountText}>{displayDiscount}</span>
                    </div>
                </div>

                <div className={styles.actionButtons}>
                    <button
                        className={styles.whatsappBtn}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/product/${product?.slug || displayId}` : '';
                            const msg = encodeURIComponent(t('whatsappMessage', { url: productUrl }));
                            window.open(`https://wa.me/97142882777?text=${msg}`, '_blank');
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginInlineEnd: '4px' }}>
                            <path d="M12.03 2c-5.52 0-10 4.48-10 10a9.96 9.96 0 0 0 1.53 5.39L2.03 22l4.75-1.25c1.54.85 3.32 1.33 5.25 1.33 5.52 0 10-4.48 10-10S17.55 2 12.03 2zm6.3 14.54c-.27.76-1.55 1.48-2.14 1.57-.59.09-1.34.22-3.83-.82-2.92-1.21-4.74-4.22-4.88-4.42-.15-.2-1.18-1.56-1.18-2.98 0-1.42.74-2.12 1.01-2.4.27-.28.59-.35.79-.35.19 0 .38.01.54.02.17.01.4-.04.62.5.24.59.81 1.99.88 2.14.07.15.11.32.01.52-.09.20-.14.33-.28.5-.14.17-.3.38-.43.51-.15.15-.3.32-.13.62.17.3.74 1.23 1.59 1.99.85.76 1.56 1 1.86 1.15.3.15.47.13.65-.08.18-.21.76-.89.96-1.2.2-.31.4-.26.68-.15.28.11 1.77.84 2.08.99.31.15.51.22.59.35.08.13.08.73-.19 1.48z" />
                        </svg>
                        <span>{t('whatsapp')}</span>
                    </button>
                    <button
                        className={styles.cartBtn}
                        onClick={handleAddToCart}
                        disabled={(product?.stock_quantity !== undefined && product.stock_quantity <= 0) || cartAdded}
                        style={{
                            opacity: product?.stock_quantity !== undefined && product.stock_quantity <= 0 ? 0.6 : 1,
                            cursor: product?.stock_quantity !== undefined && product.stock_quantity <= 0 ? 'not-allowed' : 'pointer',
                            backgroundColor: cartAdded ? '#28a745' : (product?.stock_quantity !== undefined && product.stock_quantity <= 0 ? '#999' : '#17a2b8'),
                            transition: 'background-color 0.3s ease'
                        }}
                    >
                        {!cartAdded && <ShoppingCart size={16} fill="white" />}
                        <span>{cartAdded ? t('added') : (product?.stock_quantity !== undefined && product.stock_quantity <= 0 ? t('outOfStock') : t('addToCart'))}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
