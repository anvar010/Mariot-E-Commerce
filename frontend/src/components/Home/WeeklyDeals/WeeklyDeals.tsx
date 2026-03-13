'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './WeeklyDeals.module.css';
import ProductCard from '@/components/shared/ProductCard/ProductCard';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useTranslations } from 'next-intl';

interface WeeklyDealsProps {
    initialProducts?: any[];
}

const WeeklyDeals = ({ initialProducts = [] }: WeeklyDealsProps) => {
    const t = useTranslations('weeklyDeals');
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
                    <h2 className={styles.title}>{t('title')}</h2>
                    <div className={styles.navButtons}>
                        <button className={styles.navBtn} onClick={() => scroll('left')} aria-label="Scroll left">
                            <ChevronLeft size={20} color="currentColor" strokeWidth={2.5} />
                        </button>
                        <button className={styles.navBtn} onClick={() => scroll('right')} aria-label="Scroll right">
                            <ChevronRight size={20} color="currentColor" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
                <div className={styles.dealsGrid} ref={scrollContainerRef}>
                    {loading ? (
                        <Loader />
                    ) : isEmpty ? (
                        <p style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>{t('noDeals')}</p>
                    ) : (
                        products.map((prod) => (
                            <ProductCard
                                key={prod.id}
                                product={prod}
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default WeeklyDeals;
