'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './IceMakers.module.css';
import Link from 'next/link';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
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

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

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

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
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
        const walk = (x - startX) * 1.1;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
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
                <div className={styles.dealsContentWrapper}>
                    <div className={styles.navButtons}>
                        <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={() => scroll('left')} aria-label="Scroll left">
                            <ChevronLeft size={24} color="currentColor" strokeWidth={2.5} />
                        </button>
                        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={() => scroll('right')} aria-label="Scroll right">
                            <ChevronRight size={24} color="currentColor" strokeWidth={2.5} />
                        </button>
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
                                <p style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>No products available at the moment.</p>
                            ) : (
                                products.map((prod) => (
                                    <div key={prod.id} className={styles.productWrapper}>
                                        <ProductCardPromotion product={{ ...prod, price: Number(prod.offer_price) > 0 ? Number(prod.offer_price) : Number(prod.price), old_price: Number(prod.offer_price) > 0 ? Number(prod.price) : (Number(prod.old_price) || Number(prod.originalPrice) || 0) }} />
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
