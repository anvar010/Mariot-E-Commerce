'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './NewArrivals.module.css';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useTranslations, useLocale } from 'next-intl';

// Embla imports
import useEmblaCarousel from 'embla-carousel-react';

interface NewArrivalsProps {
    initialProducts?: any[];
}

const NewArrivals = ({ initialProducts = [] }: NewArrivalsProps) => {
    const t = useTranslations('newArrivals');
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

    useEffect(() => {
        if (initialProducts.length > 0) return;

        const fetchNewArrivals = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products?sort=newest&limit=12`, { credentials: "include" });
                const data = await res.json();
                if (data.success) setProducts(data.data);
            } catch (error) {
                console.error('Failed to fetch new arrivals', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNewArrivals();
    }, [initialProducts]);

    if (!loading && products.length === 0) return null;

    return (
        <section id="new-arrivals" className={styles.weeklySection}>
            <div className={styles.container}>
                <div className={styles.headerFlex}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>{t('title')}</h2>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/shop?sort=newest" className={styles.viewAll}>
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
                                products.map((prod) => (
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

export default NewArrivals;
