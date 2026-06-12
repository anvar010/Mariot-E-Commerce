'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CategoryHomeSection.module.css';
import { Link } from '@/i18n/navigation';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import CategoryPromotionCard from '@/components/shared/CategoryPromotionCard/CategoryPromotionCard';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useLocale, useTranslations } from 'next-intl';

import useEmblaCarousel from 'embla-carousel-react';

interface CategoryHomeSectionProps {
    title: string;
    slug: string;
    posterUrl?: string | null;
    posterUrlAr?: string | null;
    initialProducts?: any[];
}

const CategoryHomeSection = ({ title, slug, posterUrl, posterUrlAr, initialProducts = [] }: CategoryHomeSectionProps) => {
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const tCommon = useTranslations('common');
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);

    const poster = (isRtl && posterUrlAr) ? posterUrlAr : posterUrl;

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

        const fetchProducts = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products?category=${encodeURIComponent(slug)}&limit=12`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setProducts(data.data);
                }
            } catch (error) {
                console.error(`Failed to fetch products for ${slug}`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [initialProducts, slug]);

    const isEmpty = !loading && products.length === 0;

    if (isEmpty) return null;

    return (
        <section className={styles.weeklySection}>
            <div className={styles.container}>
                <div className={styles.headerFlex}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>{title}</h2>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href={`/shop?category=${slug}`} className={styles.viewAll}>
                            {tCommon('viewAll')} <span>{isRtl ? '←' : '→'}</span>
                        </Link>
                    </div>
                </div>

                <div className={styles.sectionContent}>
                    {poster && (
                        <div className={styles.promoColumn}>
                            <CategoryPromotionCard
                                title={title}
                                image={poster}
                                link={`/shop?category=${slug}`}
                            />
                        </div>
                    )}

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
            </div>
        </section>
    );
};

export default CategoryHomeSection;
