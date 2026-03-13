'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './IceMakers.module.css';
import Link from 'next/link';
import ProductCard from '@/components/shared/ProductCard/ProductCard';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';
import { useTranslations, useLocale } from 'next-intl';
import { useCart } from '@/context/CartContext';

interface IceMakersProps {
    initialProducts?: any[];
}

const IceMakers = ({ initialProducts = [] }: IceMakersProps) => {
    const t = useTranslations('weeklyDeals'); // Reusing some translations or I can add specific ones
    const ct = useTranslations('product');
    const locale = useLocale();
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth > 768 ? 510 : 380;
            const currentScroll = scrollContainerRef.current.scrollLeft;
            scrollContainerRef.current.scrollTo({
                left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const { addToCart } = useCart();

    useEffect(() => {
        if (initialProducts.length > 0) return;

        const fetchIceMakers = async () => {
            try {
                // Using search for 'ice makers' to ensure exactly the same results as regular search
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
                    <div className={styles.navButtons}>
                        <button className={styles.navBtn} onClick={() => scroll('left')} aria-label="Scroll left">
                            <ChevronLeft size={20} color="currentColor" strokeWidth={2.5} />
                        </button>
                        <button className={styles.navBtn} onClick={() => scroll('right')} aria-label="Scroll right">
                            <ChevronRight size={20} color="currentColor" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
                <div className={styles.dealsContent}>
                    {/* Side Banner Card with Heading Inside */}
                    <div className={styles.bannerCard}>
                        <div className={styles.bannerOverlay}>
                            <h3 className={styles.bannerTitle}>ICE<br />MAKERS</h3>
                            <Link href="/en/shop?search=ice+makers" className={styles.viewAllBtn}>
                                VIEW ALL
                            </Link>
                        </div>
                        <img
                            src="/Ice%20Makers.webp"
                            alt="Ice Makers"
                            className={styles.bannerImg}
                        />
                    </div>

                    <div className={styles.dealsGrid} ref={scrollContainerRef}>
                        {loading ? (
                            <Loader />
                        ) : isEmpty ? (
                            <p style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>No products available at the moment.</p>
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
            </div>
        </section>
    );
};

export default IceMakers;
