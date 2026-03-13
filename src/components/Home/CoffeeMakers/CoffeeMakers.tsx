'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CoffeeMakers.module.css';
import Link from 'next/link';
import ProductCard from '@/components/shared/ProductCard/ProductCard';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL } from '@/config';

interface CoffeeMakersProps {
    initialProducts?: any[];
}

const CoffeeMakers = ({ initialProducts = [] }: CoffeeMakersProps) => {
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
                            <h3 className={styles.bannerTitle}>COFFEE<br />MAKERS</h3>
                            <Link href="/en/shop?search=coffee+makers" className={styles.viewAllBtn}>
                                VIEW ALL
                            </Link>
                        </div>
                        <img
                            src="/Coffee%20Makers.webp"
                            alt="Coffee Makers"
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

export default CoffeeMakers;
