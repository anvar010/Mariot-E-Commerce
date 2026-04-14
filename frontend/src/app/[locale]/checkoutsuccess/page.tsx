'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import {
    CheckCircle2,
    ShoppingBag,
    ChevronRight,
    Package,
    Truck,
    MapPin,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import { useTranslations } from 'next-intl';
import { useCart } from '@/context/CartContext';
import styles from './success.module.css';

const SuccessContent = () => {
    const router = useRouter();
    const t = useTranslations('success');
    const searchParams = useSearchParams();
    const { clearCart } = useCart();
    const orderId = searchParams.get('orderId') || 'Order #M' + Math.floor(100000 + Math.random() * 900000);

    // Defensive programming to ensure cart is cleared
    useEffect(() => {
        clearCart();
    }, [clearCart]);

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
                                <span>Email: support@mariotstore.com</span>
                                <span dir="ltr">Phone: +971 4 000 0000</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.actions}>
                        <Link href="/shopnow" className={styles.continueBtn}>
                            <ShoppingBag size={20} />
                            {t('continueShopping')}
                        </Link>
                        <Link href="/profile?tab=orders" className={styles.ordersBtn}>
                            {t('viewOrders')}
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

const CheckoutSuccessPage = () => {
    return (
        <Suspense fallback={<div className={styles.successPage}>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
};

export default CheckoutSuccessPage;
