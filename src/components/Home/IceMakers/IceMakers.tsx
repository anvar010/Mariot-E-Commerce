'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import styles from './IceMakers.module.css';
import { Link } from '@/i18n/navigation';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useTranslations, useLocale } from 'next-intl';
import { useCart } from '@/context/CartContext';

// Embla imports
import useEmblaCarousel from 'embla-carousel-react';

interface IceMakersProps {
    initialProducts?: any[];
}

const IceMakers = ({ initialProducts = [] }: IceMakersProps) => {
    const t = useTranslations('weeklyDeals');
    const ct = useTranslations('product');
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

    const { addToCart } = useCart();

    useEffect(() => {
        if (initialProducts.length > 0) return;

        const fetchIceMakers = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products?search=ice%20makers`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setProducts(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch ice makers', error);
            } finally {
                setLoading(false);
            }
        };
        fetchIceMakers();
    }, [initialProducts]);

    const isEmpty = !loading && products.length === 0;

    if (isEmpty) return null;

    return (
        <section id="ice-makers-section" className={styles.weeklySection}>
            <div className={styles.container}>
                <div className={styles.headerFlex}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>Ice Makers</h2>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/shop?category=ice-makers" className={styles.viewAll}>
                            VIEW ALL <span>{isRtl ? '←' : '→'}</span>
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
                            ) : isEmpty ? (
                                <p style={{ padding: '20px', color: '#666', fontStyle: 'italic', textAlign: 'center', width: '100%' }}>No products available at the moment.</p>
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

export default IceMakers;

