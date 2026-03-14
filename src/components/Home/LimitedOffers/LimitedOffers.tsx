'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

    useEffect(() => {
        if (initialProducts.length > 0) return;

        const fetchOffers = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products?is_limited_offer=true&limit=8`, { credentials: "include" });
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

    // Timer Logic
    useEffect(() => {
        const updateTimer = () => {
            // Find the latest offer_end from the fetched limited offer products
            const offerEndDates = products
                .filter(p => p.offer_end)
                .map(p => new Date(p.offer_end).getTime());

            if (offerEndDates.length === 0) {
                // Fallback to localStorage if no product has an offer_end
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
                    hours: Math.floor(difference / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
                return;
            }

            // Use the latest (max) offer_end from the products
            const endTime = Math.max(...offerEndDates);
            const now = Date.now();
            const difference = endTime - now;

            if (difference <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            setTimeLeft({
                hours: Math.floor(difference / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000)
            });
        };

        const timerId = setInterval(updateTimer, 1000);
        updateTimer();

        return () => clearInterval(timerId);
    }, [products]);

    // If data is fetched and empty, show section with "No products" message
    const isEmpty = !loading && products.length === 0;

    return (
        <section id="offers" className={styles.offersSection}>
            <div className={styles.headerBar}>
                <div className={styles.container}>
                    <div className={styles.headerContent} dir={isRtl ? "rtl" : "ltr"}>
                        <h2 className={styles.title}>{t('title')}</h2>
                        <div className={styles.timerGroup}>
                            <span className={styles.mainTimer}>
                                {timeLeft.hours.toString().padStart(2, '0')}{t('h')} : {timeLeft.minutes.toString().padStart(2, '0')}{t('m')} : {timeLeft.seconds.toString().padStart(2, '0')}{t('s')}
                            </span>
                            <Link href="/shop?limited=true" className={styles.viewAll}>
                                {t('viewAll')} <span>{isRtl ? '←' : '→'}</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.productContainer}>
                <div className={styles.container}>
                    <div className={styles.productGrid}>
                        {loading ? (
                            <p>{t('loading')}</p>
                        ) : isEmpty ? (
                            <p style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>{t('noOffers')}</p>
                        ) : (
                            products.map((prod) => (
                                <ProductCardPromotion
                                    key={prod.id}
                                    product={{
                                        ...prod,
                                        image: prod.primary_image || 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1'
                                    }}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LimitedOffers;
