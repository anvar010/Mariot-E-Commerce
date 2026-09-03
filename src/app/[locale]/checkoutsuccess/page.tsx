'use client';

import React, { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import {
    CheckCircle2,
    ShoppingBag,
    Package,
    Truck,
    MapPin,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import styles from './success.module.css';

const SuccessContent = () => {
    const t = useTranslations('success');
    const searchParams = useSearchParams();
    const [orderId, setOrderId] = useState<string>('...');
    const { user, refreshUser } = useAuth();

    useEffect(() => {
        const id = searchParams.get('orderId');
        if (id) {
            setOrderId(id);
        } else {
            // Stable order ID generation on client only to avoid hydration mismatch
            setOrderId('Order #M' + Math.floor(100000 + Math.random() * 900000));
        }
    }, [searchParams]);

    /**
     * Bring the reward balance up to date, once the order has actually settled.
     *
     * A card order earns its points only when the payment is confirmed paid, not
     * when the order is created — the crediting hangs off updatePaymentStatus, and
     * for a card that means waiting for Stripe's webhook. Refreshing back on the
     * checkout page therefore read the balance before it had changed, which is why
     * the points still looked stale after an order.
     *
     * Reading the order here is what settles it: the API reconciles a pending order
     * against Stripe when it is fetched, and marking it paid is what credits the
     * points. So this asks for the order until it comes back paid, then refreshes
     * the user. A few seconds of polling covers the webhook arriving on its own, and
     * the reconciliation covers it never arriving at all.
     */
    useEffect(() => {
        const id = searchParams.get('orderId');
        if (!id || !user) return;

        let cancelled = false;
        const delays = [0, 1500, 3000, 5000];

        (async () => {
            for (const wait of delays) {
                if (cancelled) return;
                if (wait) await new Promise(r => setTimeout(r, wait));
                try {
                    const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
                        credentials: 'include',
                        headers: getAuthHeaders(),
                    });
                    const data = await res.json();
                    if (data?.data?.payment_status === 'paid') break;
                } catch {
                    // A failed read just means trying again, or giving up quietly:
                    // the balance is only ever cosmetic on this page.
                }
            }
            if (!cancelled) await refreshUser();
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, user?.id]);

    return (
        <div className={styles.successPage}>
            <Header />

            <main className={styles.container}>
                <div className={styles.content}>
                    {/* Hero Success Section */}
                    <motion.div
                        className={styles.successHero}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className={styles.iconWrapper}>
                            <CheckCircle2 size={80} className={styles.checkIcon} />
                        </div>
                        <h1 className={styles.mainTitle}>{t('thankYou')}</h1>
                        <p className={styles.subTitle}>{t('orderReceived')}</p>
                        <div className={styles.orderBadge}>
                            <span>{t('orderId')} <strong>{orderId}</strong></span>
                        </div>
                    </motion.div>

                    {/* Timeline Animation */}
                    <div className={styles.timeline}>
                        <div className={styles.timelineItem}>
                            <div className={`${styles.dot} ${styles.active}`}></div>
                            <span>{t('confirmed')}</span>
                        </div>
                        <div className={styles.timelineLine}></div>
                        <div className={styles.timelineItem}>
                            <div className={styles.dot}></div>
                            <span>{t('processing')}</span>
                        </div>
                        <div className={styles.timelineLine}></div>
                        <div className={styles.timelineItem}>
                            <div className={styles.dot}></div>
                            <span>{t('shipped')}</span>
                        </div>
                        <div className={styles.timelineLine}></div>
                        <div className={styles.timelineItem}>
                            <div className={styles.dot}></div>
                            <span>{t('delivered')}</span>
                        </div>
                    </div>

                    {/* Action Buttons — directly under the order progress */}
                    <div className={styles.actions}>
                        <Link href="/shopnow" className={styles.continueBtn}>
                            <ShoppingBag size={20} />
                            {t('continueShopping')}
                        </Link>
                        <Link href="/profile?tab=yourOrders" className={styles.ordersBtn}>
                            {t('viewOrders')}
                            <ArrowRight size={18} />
                        </Link>
                    </div>

                    <div className={styles.infoGrid}>
                        {/* Next Steps */}
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>{t('nextSteps')}</h3>
                            <ul className={styles.stepsList}>
                                <li>
                                    <div className={styles.stepIcon}><Package size={18} /></div>
                                    <p>{t('emailNotif')}</p>
                                </li>
                                <li>
                                    <div className={styles.stepIcon}><Truck size={18} /></div>
                                    <p>{t('shipNotif')}</p>
                                </li>
                                <li>
                                    <div className={styles.stepIcon}><MapPin size={18} /></div>
                                    <p>{t('deliveryNotif')}</p>
                                </li>
                            </ul>
                        </div>

                        {/* Customer Support Card */}
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>{t('needHelp')}</h3>
                            <p className={styles.cardText}>{t('supportText')}</p>
                            <div className={styles.supportLinks}>
                                <span>Email: admin@mariotkitchen.com</span>
                                <span dir="ltr">Phone: +971 4 288 2777</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

const CheckoutSuccessPage = () => {
    return (
        <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center' }}>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
};

export default CheckoutSuccessPage;
