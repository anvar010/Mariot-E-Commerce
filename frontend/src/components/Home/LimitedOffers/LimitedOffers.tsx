'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './LimitedOffers.module.css';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import { API_BASE_URL } from '@/config';
import { useTranslations, useLocale } from 'next-intl';

interface LimitedOffersProps {
    initialProducts?: any[];
}

const LimitedOffers = ({ initialProducts = [] }: LimitedOffersProps) => {
    const t = useTranslations('limitedOffers');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth > 768 ? 480 : 360;
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

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.1;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    useEffect(() => {
        if (initialProducts.length > 0) return;

        const fetchOffers = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products?is_limited_offer=true&limit=7`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setProducts(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch limited offers', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, [initialProducts]);

    useEffect(() => {
        const updateTimer = () => {
            const offerEndDates = products
                .filter(p => p.offer_end)
                .map(p => new Date(p.offer_end).getTime());

            if (offerEndDates.length === 0) {
                const storedEndTime = localStorage.getItem('offer_end_time');
                if (!storedEndTime) {
                    setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                    return;
                }
                const endTime = new Date(storedEndTime).getTime();
                const now = Date.now();
                const difference = endTime - now;

                if (difference <= 0) {
                    setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                    return;
                }
                setTimeLeft({
                    hours: Math.floor(difference / 3600000),
                    minutes: Math.floor((difference % 3600000) / 60000),
                    seconds: Math.floor((difference % 60000) / 1000)
                });
                return;
            }

            const endTime = Math.max(...offerEndDates);
            const now = Date.now();
            const difference = endTime - now;

            if (difference <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }
            setTimeLeft({
                hours: Math.floor(difference / 3600000),
                minutes: Math.floor((difference % 3600000) / 60000),
                seconds: Math.floor((difference % 60000) / 1000)
            });
        };

        const timerId = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timerId);
    }, [products]);

    const isEmpty = !loading && products.length === 0;

    return (
        <section id="offers" className={styles.offersSection}>
            <div className={styles.container}>
                <div className={styles.headerFlex}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>{t('title')}</h2>
                    </div>
                    <div className={styles.headerActions}>
                        <span className={styles.mainTimer}>
                            {timeLeft.hours.toString().padStart(2, '0')}{t('h')} : {timeLeft.minutes.toString().padStart(2, '0')}{t('m')} : {timeLeft.seconds.toString().padStart(2, '0')}{t('s')}
                        </span>
                        <Link href="/shop?limited=true" className={styles.viewAll}>
                            {t('viewAll')} <span>{isRtl ? '←' : '→'}</span>
                        </Link>
                    </div>
                </div>

                <div className={styles.sliderWrapper}>
                    <div className={styles.navButtons}>
                        <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={() => scroll('left')} aria-label="Scroll left">
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </button>
                        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={() => scroll('right')} aria-label="Scroll right">
                            <ChevronRight size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div
                        className={styles.productGrid}
                        ref={scrollContainerRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', width: '100%' }}>{t('loading')}</div>
                        ) : isEmpty ? (
                            <p style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>{t('noOffers')}</p>
                        ) : (
                            products.map((prod) => (
                                <div key={prod.id} className={styles.productWrapper}>
                                    <ProductCardPromotion
                                        product={{
                                            ...prod,
                                            price: Number(prod.offer_price) > 0 ? Number(prod.offer_price) : Number(prod.price),
                                            old_price: Number(prod.offer_price) > 0 ? Number(prod.price) : (Number(prod.old_price) || 0),
                                            primary_image: prod.primary_image || 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1'
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

export default LimitedOffers;
