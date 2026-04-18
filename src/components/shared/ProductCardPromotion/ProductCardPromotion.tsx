import React, { useState, useEffect, useRef } from 'react';
import styles from './ProductCardPromotion.module.css';
import { Heart, ShoppingCart, Check, Clock, MessageCircle, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import Image from "next/legacy/image";
import { useCart } from '@/context/CartContext';
import { getBrandLogo } from '@/utils/brandLogos';
import { BASE_URL } from '@/config';
import { useLocale, useTranslations } from 'next-intl';
import { resolveUrl } from '@/utils/resolveUrl';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';

import useEmblaCarousel from 'embla-carousel-react';

interface ProductCardPromotionProps {
    product: {
        id: string | number;
        model?: string;
        name: string;
        description: string;
        price: number;
        old_price?: number;
        discount_percentage?: number;
        primary_image: string;
        brand_name?: string;
        brand_image?: string;
        stock_quantity?: number;
        is_best_seller?: boolean | number;
        slug?: string;
        [key: string]: any;
    };
    timeLeft?: { hours: number; minutes: number; seconds: number } | null;
    disableHover?: boolean;
    showTimer?: boolean;
    badgeType?: 'weekly' | 'limited' | 'daily';
}

const ProductCardPromotion: React.FC<ProductCardPromotionProps> = ({ product, timeLeft, disableHover, showTimer = false, badgeType }) => {
    const locale = useLocale();
    const t = useTranslations('product');
    const tTimer = useTranslations('limitedOffers');
    const isArabic = locale === 'ar';
    const displayBrand = product.brand_name || (product as any)?.brand || 'RATIONAL';
    const localBrandLogo = getBrandLogo(displayBrand);

    const displayBrandImage = resolveUrl(localBrandLogo || product.brand_image || (product as any)?.brand_logo);
    const displayImage = resolveUrl(product.primary_image) || '/assets/placeholder-image.webp';
    const formatTime = (num: number) => num.toString().padStart(2, '0');
    const isInventoryTracked = product.track_inventory === 1 || product.track_inventory === '1' || product.track_inventory === true;
    const isInStock = !isInventoryTracked || product.stock_quantity === undefined || product.stock_quantity > 0;
    const { addToCart } = useCart();
    const isBestSeller = product.is_best_seller === 1 || product.is_best_seller === true;

    const countdown = useCountdownTimer(product?.offer_end);
    const activeTimer = timeLeft ?? countdown ?? { hours: 0, minutes: 0, seconds: 0 };

    const rating = Number((product as any)?.average_rating || (product as any)?.rating || 0);
    const reviews = Number((product as any)?.total_reviews || (product as any)?.reviews_count || (product as any)?.review_count || 0);

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

    const hasOffer = !!(product.offer_price && Number(product.offer_price) > 0);
    const displayPrice = hasOffer ? Number(product.offer_price) : Number(product.price || 0);
    const displayOldPrice = Number(product.old_price) || (hasOffer ? Number(product.price) : 0);

    const handleAddToCart = () => {
        if (isInStock) {
            addToCart({
                id: product.id,
                name: (isArabic && product.name_ar) ? product.name_ar : product.name,
                price: displayPrice,
                image: resolveUrl(product.primary_image),
                brand: product.brand_name,
                slug: product.slug,
                stock_quantity: product.stock_quantity,
                track_inventory: product.track_inventory,
                oldPrice: displayOldPrice
            });
        }
    };

    const [logoError, setLogoError] = React.useState(false);
    const [failedImages, setFailedImages] = React.useState<Set<number>>(new Set());

    let allImages = [displayImage];
    if (product.images && Array.isArray(product.images)) {
        const addImages = product.images.map((img: any) => resolveUrl(img.image_url || img.image || img)).filter(Boolean);
        allImages = [...allImages, ...addImages];
    } else if (product.gallery && Array.isArray(product.gallery)) {
        const addImages = product.gallery.map((img: any) => resolveUrl(img.image_url || img.image || img)).filter(Boolean);
        allImages = [...allImages, ...addImages];
    }
    allImages = Array.from(new Set(allImages));

    const [isHovered, setIsHovered] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Embla Carousel setup
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        direction: isArabic ? 'rtl' : 'ltr',
        align: 'center',
        skipSnaps: false,
        duration: 25,
        dragFree: false
    });

    // Auto-scroll on hover (mimicking original behavior)
    useEffect(() => {
        if (!emblaApi || allImages.length <= 1 || disableHover) return;

        let interval: NodeJS.Timeout | null = null;
        if (isHovered) {
            interval = setInterval(() => {
                emblaApi.scrollNext();
            }, 2000);
        } else {
            emblaApi.scrollTo(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [emblaApi, isHovered, allImages.length, disableHover]);

    // Track active index
    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => setActiveImageIndex(emblaApi.selectedScrollSnap());
        emblaApi.on('select', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi]);

    const handleNextImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (emblaApi) emblaApi.scrollNext();
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (emblaApi) emblaApi.scrollPrev();
    };

    // Event blocking to prevent parent carousels from moving
    useEffect(() => {
        const track = emblaApi?.rootNode();
        if (!track) return;

        const stop = (e: Event) => {
            // Stop propagation to parents during bubbling
            e.stopPropagation();
        };

        const events = ['pointerdown', 'mousedown', 'touchstart', 'pointermove', 'touchmove', 'mousemove'];
        events.forEach(ev => track.addEventListener(ev, stop, { capture: false }));

        return () => {
            events.forEach(ev => track.removeEventListener(ev, stop, { capture: false }));
        };
    }, [emblaApi]);

    return (
        <div className={`${styles.card} ${disableHover ? styles.noHover : ''}`}>
            <div className={styles.tagsWrapperStart}>
                {!!product.is_weekly_deal && (
                    <div className={`${styles.dealTag} ${styles.weeklyTag}`}>{t('weeklyDeal')}</div>
                )}
                {!!product.is_limited_offer && (
                    <div className={`${styles.dealTag} ${styles.limitedTag}`}>{t('limitedOffer')}</div>
                )}
                {!!product.is_daily_offer && (
                    <div className={`${styles.dealTag} ${styles.dailyTag}`}>{t('dailyOffer')}</div>
                )}
                {/* {(!!product.is_best_seller || Number(product.sold_count) >= 2) && (
                    <div className={styles.bestSellerTag}>{t('topSellingProduct')}</div>
                )} */}
            </div>

            {Number(product.discount_percentage) > 0 && (
                <div className={styles.discountTagWrapper}>
                    <div className={styles.discountTag}>{Number(product.discount_percentage).toFixed(0)}% {t('off')}</div>
                </div>
            )}

            <Link href={`/product/${product.slug || product.id}`} className={styles.imageLink}>
                <div
                    className={styles.imageContainer}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div
                        className={styles.imageTrack}
                        ref={emblaRef}
                    >
                        <div className={styles.emblaContainer}>
                            {allImages.map((img, i) => (
                                <div key={i} className={styles.imageSlide}>
                                    <Image
                                        src={failedImages.has(i) ? '/assets/placeholder-image.webp' : img}
                                        alt={`${isArabic && product.name_ar ? product.name_ar : product.name} - ${i + 1}`}
                                        layout="fill"
                                        objectFit="contain"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                        onError={() => {
                                            setFailedImages(prev => new Set(prev).add(i));
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {allImages.length > 1 && (
                        <>
                            <button className={`${styles.navArrow} ${styles.leftArrow}`} onClick={handlePrevImage}>
                                <ChevronLeft size={16} strokeWidth={2.5} />
                            </button>
                            <button className={`${styles.navArrow} ${styles.rightArrow}`} onClick={handleNextImage}>
                                <ChevronRight size={16} strokeWidth={2.5} />
                            </button>
                            <div className={styles.dotsContainer}>
                                {allImages.map((_, i) => (
                                    <span key={i} className={`${styles.dot} ${activeImageIndex === i ? styles.activeDot : ''}`} />
                                ))}
                            </div>
                        </>
                    )}

                    {showTimer && (!!product.is_weekly_deal || !!product.is_limited_offer || !!product.is_daily_offer) && activeTimer && (
                        <div className={styles.timerWrapper}>
                            <Clock size={16} color="#ff3b30" />
                            <div className={styles.timer}>
                                {formatTime(activeTimer.hours)}{tTimer('h')} : {formatTime(activeTimer.minutes)}{tTimer('m')} : {formatTime(activeTimer.seconds)}{tTimer('s')}
                            </div>
                        </div>
                    )}
                </div>
            </Link>

            <div className={styles.info}>
                <div className={styles.metaRow}>
                    <div className={`${styles.stockBadge} ${isInStock ? styles.inStock : styles.outOfStock}`}>
                        <span>• {isInStock ? t('inStock') : t('outOfStock')}</span>
                    </div>
                </div>

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

                <h3 className={styles.productName}>{(isArabic && product.name_ar) ? product.name_ar : product.name}</h3>
                <p className={styles.description}>{t('modelLabel')} {product?.model || product?.slug?.toUpperCase() || product.id}</p>

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
                            <span className={styles.brandText}>{displayBrand || 'RATIONAL'}</span>
                        )}
                    </div>
                </Link>

                {/* Pricing */}
                <div className={styles.pricing}>
                    <div className={styles.savingsRow}>
                        {displayOldPrice > 0 && displayOldPrice > displayPrice && (
                            <span className={styles.oldPrice}>
                                AED {displayOldPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        )}
                        {Number(product.discount_percentage) > 0 && (
                            <span className={styles.percentText}>{t('save')} {Number(product.discount_percentage).toFixed(0)}%</span>
                        )}
                    </div>
                    <div className={styles.currentPrice}>
                        AED {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
                <button
                    className={styles.whatsappBtn}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/product/${product?.slug || product?.id}` : '';
                        const msg = encodeURIComponent(t('whatsappMessage', {
                            url: productUrl,
                            name: (isArabic && product.name_ar) ? product.name_ar : product.name,
                            price: displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                            model: product?.model || product?.slug?.toUpperCase() || product.id
                        }));
                        window.open(`https://wa.me/97142882777?text=${msg}`, '_blank');
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>{t('whatsapp')}</span>
                </button>
                <button
                    className={styles.cartBtn}
                    onClick={handleAddToCart}
                    disabled={!isInStock}
                    style={{
                        opacity: !isInStock ? 0.5 : 1,
                        cursor: !isInStock ? 'not-allowed' : 'pointer'
                    }}
                >
                    <ShoppingCart size={18} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
};

export default ProductCardPromotion;
