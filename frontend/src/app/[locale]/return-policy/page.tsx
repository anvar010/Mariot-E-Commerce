import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const metadata: Metadata = {
    title: 'Return & Refund Policy | Mariot Store',
    description: 'Review our clear and fair return policy. At Mariot Store, we ensure a smooth replacement and refund process for all your kitchen equipment purchases.',
};

export default function ReturnPolicyPage() {
    const t = useTranslations('returnPage');
    const tc = useTranslations('common');

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.mainTitle}>{t('title')}</h1>
                    <div className={styles.lastUpdated}>{t('lastUpdated')}</div>

                    <div className={styles.documentBody}>
                        <p className={styles.intro}>
                            <strong className={styles.noticeLabel}>{tc('notice')}</strong>
                            {t('intro')}
                        </p>

                        <section className={styles.section}>
                            <h2>{t('eligibilityTitle')}</h2>
                            <p>{t('eligibilityDesc')}</p>
                            <ul>
                                <li>{t('rule1')}</li>
                                <li>{t('rule2')}</li>
                                <li>{t('rule3')}</li>
                                <li>{t('rule4')}</li>
                                <li>{t('rule5')}</li>
                                <li>{t('rule6')}</li>
                                <li>{t('rule7')}</li>
                                <li>{t('rule8')}</li>
                                <li>{t('rule9')}</li>
                                <li>{t('rule10')}</li>
                                <li>{t('rule11')}</li>
                                <li>{t('rule12')}</li>
                                <li>{t('rule13')}</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('refundTitle')}</h2>
                            <p>{t('refundDesc')}</p>
                            <ul>
                                <li>{t('method1')}</li>
                                <li>{t('method2')}</li>
                                <li>{t('method3')}</li>
                                <li>{t('method4')}</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('conditionsTitle')}</h2>
                            <p>{t('conditionsDesc')}</p>
                            <ul>
                                <li>{t('condition1')}</li>
                                <li>{t('condition2')}</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('shippingTitle')}</h2>
                            <ul>
                                <li>{t('shippingItem1')}</li>
                                <li>{t('shippingItem2')}</li>
                                <li>{t('shippingItem3')}</li>
                                <li>{t('shippingItem4')}</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('contactTitle')}</h2>
                            <p>{t('contactIntro')}</p>
                            <p>{t('contactDesc')}</p>

                            <div className={styles.contactInfoBlock}>
                                <p><strong>{t('contactRequest')}</strong></p>
                                <p>{t('callLabel')}: <a href="tel:+97142882777">+971-42882777</a> / <a href="tel:+971501203917">050 120 3917</a></p>
                                <p>{t('emailLabel')}: <a href="mailto:admin@mariotkitchen.com">admin@mariotkitchen.com</a> / <a href="mailto:support@mariot-group.com">support@mariot-group.com</a></p>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
