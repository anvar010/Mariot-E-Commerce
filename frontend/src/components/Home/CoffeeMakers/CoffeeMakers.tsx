'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import styles from './CoffeeMakers.module.css';
import { Link } from '@/i18n/navigation';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import CategoryPromotionCard from '@/components/shared/CategoryPromotionCard/CategoryPromotionCard';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useLocale } from 'next-intl';

// Embla imports
import useEmblaCarousel from 'embla-carousel-react';

interface CoffeeMakersProps {
    initialProducts?: any[];
}

const CoffeeMakers = ({ initialProducts = [] }: CoffeeMakersProps) => {
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

        const fetchCoffeeMakers = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products?search=coffee%20makers`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setProducts(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch coffee makers', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCoffeeMakers();
    }, [initialProducts]);

    const isEmpty = !loading && products.length === 0;

    if (isEmpty) return null;

    return (
        <section id="coffee-makers-section" className={styles.weeklySection}>
            <div className={styles.container}>
                <div className={styles.headerFlex}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>Coffee Makers</h2>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/shop?category=coffee-makers" className={styles.viewAll}>
                            VIEW ALL <span>{isRtl ? '←' : '→'}</span>
                        </Link>
                    </div>
                </div>

                <div className={styles.sectionContent}>
                    <div className={styles.promoColumn}>
                        <CategoryPromotionCard 
                            title="Coffee Makers" 
                            image="/assets/images/promo/coffee_makers_promo.png" 
                            link="/shop?category=coffee-makers" 
                        />
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
            </div>
        </section>
    );
};

export default CoffeeMakers;

