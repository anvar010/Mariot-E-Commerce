'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './WeeklyDeals.module.css';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useTranslations, useLocale } from 'next-intl';

// Embla imports
import useEmblaCarousel from 'embla-carousel-react';

interface WeeklyDealsProps {
    initialProducts?: any[];
}

const WeeklyDeals = ({ initialProducts = [] }: WeeklyDealsProps) => {
    const t = useTranslations('weeklyDeals');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);

    // Embla Carousel setup
    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: false, 
        direction: isRtl ? 'rtl' : 'ltr',
        align: 'start',
        skipSnaps: true,
        dragFree: true,
        containScroll: 'trimSnaps'
    });

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const fetchDeals = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/products?is_weekly_deal=true`, { credentials: "include" });
            const data = await res.json();
            if (data.success) setProducts(data.data);
        } catch (error) {
            console.error('Failed to fetch weekly deals', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Skip initial fetch if server already provided data; only poll for updates
        if (initialProducts.length === 0) fetchDeals();
        const id = setInterval(fetchDeals, 30000);
        return () => clearInterval(id);
    }, []);

    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(n => n + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const now = Date.now();
    const activeProducts = products.filter(p =>
        p.offer_end && new Date(p.offer_end).getTime() > now &&
        (!p.offer_start || new Date(p.offer_start).getTime() <= now)
    );

    if (!loading && activeProducts.length === 0) return null;

    return (
        <section id="weekly-deals" className={styles.weeklySection}>
            <div className={styles.container}>
                <div className={styles.headerFlex}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>{t('title')}</h2>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/shop?weekly=true" className={styles.viewAll}>
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
                        <div className={styles.dealsGrid}>
                            {loading ? (
                                <Loader />
                            ) : (
                                activeProducts.map((prod) => (
                                    <div key={prod.id} className={styles.productWrapper}>
                                        <ProductCardPromotion
                                            product={{
                                                ...prod,
                                                price: Number(prod.offer_price) > 0 ? Number(prod.offer_price) : Number(prod.price),
                                                old_price: Number(prod.offer_price) > 0 ? Number(prod.price) : (Number(prod.old_price) || Number(prod.originalPrice) || 0)
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

export default WeeklyDeals;