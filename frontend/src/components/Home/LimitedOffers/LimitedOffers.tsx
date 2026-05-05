'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './LimitedOffers.module.css';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import { API_BASE_URL } from '@/config';
import { useTranslations, useLocale } from 'next-intl';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';

// Embla imports
import useEmblaCarousel from 'embla-carousel-react';

interface LimitedOffersProps {
    initialProducts?: any[];
}

const LimitedOffers = ({ initialProducts = [] }: LimitedOffersProps) => {
    const t = useTranslations('limitedOffers');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [effectiveEndDate, setEffectiveEndDate] = useState<number | null>(null);

    // Embla Carousel setup
    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: false, 
        direction: isRtl ? 'rtl' : 'ltr',
        align: 'start',
        skipSnaps: true, // Allows skipping slides when swiping fast
        dragFree: true,  // Makes swiping feel more like a natural scroll
        containScroll: 'trimSnaps' // Prevents excess scrolling at ends
    });

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const fetchOffers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/products?is_limited_offer=true&limit=7`, { credentials: "include" });
            const data = await res.json();
            if (data.success) setProducts(data.data);
        } catch (error) {
            console.error('Failed to fetch limited offers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Skip initial fetch if server already provided data; only poll for updates
        if (initialProducts.length === 0) fetchOffers();

        let id: ReturnType<typeof setInterval> | null = null;
        const start = () => {
            if (id !== null) return;
            id = setInterval(fetchOffers, 30000);
        };
        const stop = () => {
            if (id !== null) { clearInterval(id); id = null; }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchOffers();
                start();
            } else {
                stop();
            }
        };

        if (document.visibilityState === 'visible') start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            stop();
        };
    }, []);

    useEffect(() => {
        const offerEndDates = products
            .filter(p => p.offer_end)
            .map(p => new Date(p.offer_end).getTime());

        if (offerEndDates.length > 0) {
            setEffectiveEndDate(Math.max(...offerEndDates));
        } else {
            const stored = localStorage.getItem('offer_end_time');
            setEffectiveEndDate(stored ? new Date(stored).getTime() : null);
        }
    }, [products]);

    const timeLeft = useCountdownTimer(effectiveEndDate);

    const now = Date.now();
    const activeProducts = products.filter(p =>
        p.offer_end && new Date(p.offer_end).getTime() > now &&
        (!p.offer_start || new Date(p.offer_start).getTime() <= now)
    );

    if (!loading && activeProducts.length === 0) return null;

    return (
        <section id="offers" className={styles.offersSection}>
            <div className={styles.container}>
                <div className={styles.headerFlex}>
                    <h2 className={styles.title}>{t('title')}</h2>
                    <div className={styles.headerActions}>
                        {timeLeft && (
                            <span className={styles.mainTimer}>
                                {timeLeft.hours.toString().padStart(2, '0')}{t('h')} : {timeLeft.minutes.toString().padStart(2, '0')}{t('m')} : {timeLeft.seconds.toString().padStart(2, '0')}{t('s')}
                            </span>
                        )}
                        <Link href="/shop?limited=true" className={styles.viewAll}>
                            {t('viewAll')} <span>{isRtl ? '←' : '→'}</span>
                        </Link>
                    </div>
                </div>

                <div className={styles.sliderWrapper}>
                    <div className={styles.navButtons}>
                        <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={scrollPrev} aria-label="Scroll left">
                            <ChevronLeft size={24} color="currentColor" strokeWidth={2.5} />
                        </button>
                        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={scrollNext} aria-label="Scroll right">
                            <ChevronRight size={24} color="currentColor" strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className={styles.emblaViewport} ref={emblaRef}>
                        <div className={styles.productGrid}>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', width: '100%', color: '#666' }}>{t('loading')}</div>
                            ) : (
                                activeProducts.map((prod) => (
                                    <div key={prod.id} className={styles.productWrapper}>
                                        <ProductCardPromotion
                                            product={{
                                                ...prod,
                                                price: Number(prod.offer_price) > 0 ? Number(prod.offer_price) : Number(prod.price),
                                                old_price: Number(prod.offer_price) > 0 ? Number(prod.price) : (Number(prod.old_price) || 0),
                                                primary_image: prod.primary_image || 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1'
                                            }}
                                            showTimer={true}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LimitedOffers;