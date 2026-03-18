'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './WeeklyDeals.module.css';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useTranslations, useLocale } from 'next-intl';

interface WeeklyDealsProps {
    initialProducts?: any[];
}

const WeeklyDeals = ({ initialProducts = [] }: WeeklyDealsProps) => {
    const t = useTranslations('weeklyDeals');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth > 768 ? 510 : 380; // Scroll roughly two items
            const currentScroll = scrollContainerRef.current.scrollLeft;
            scrollContainerRef.current.scrollTo({
                left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        // Prevent text selection while dragging
        e.preventDefault();
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.1; // Smoother speed multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    useEffect(() => {
        if (initialProducts.length > 0) return;

        const fetchDeals = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products?is_weekly_deal=true`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setProducts(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch weekly deals', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDeals();
    }, [initialProducts]);

    // If data is fetched and empty, show section with "No products" message
    const isEmpty = !loading && products.length === 0;

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
                        <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={() => scroll('left')} aria-label="Scroll left">
                            <ChevronLeft size={24} color="currentColor" strokeWidth={2.5} />
                        </button>
                        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={() => scroll('right')} aria-label="Scroll right">
                            <ChevronRight size={24} color="currentColor" strokeWidth={2.5} />
                        </button>
                    </div>
                    <div
                        className={styles.dealsGrid}
                        ref={scrollContainerRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {loading ? (
                            <Loader />
                        ) : isEmpty ? (
                            <p style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>{t('noDeals')}</p>
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
        </section>
    );
};

export default WeeklyDeals;
