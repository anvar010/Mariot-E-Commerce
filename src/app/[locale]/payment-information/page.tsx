import React from 'react';
import { TABBY_ENABLED } from '@/config';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { useTranslations } from 'next-intl';

import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await props.params;
    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/payment-information',
        title: isArabic
            ? 'طرق الدفع – بطاقات وتحويل بنكي وتابي | ماريوت'
            : 'Payment Options – Card, Bank Transfer & Tabby | Mariot',
        description: isArabic
            ? 'طرق دفع آمنة في ماريوت: بطاقات الائتمان والخصم، التحويل البنكي، وتابي للدفع لاحقًا. تعرف على البطاقات المقبولة وكيفية إتمام الطلب.'
            : 'Secure payment methods at Mariot: credit and debit cards, bank transfer, and Tabby buy-now-pay-later. See accepted cards and how checkout works.',
    });
}

export default function PaymentInformationPage() {
    const t = useTranslations('paymentPage');

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.mainTitle}>{t('title')}</h1>
                    <div className={styles.lastUpdated}>{t('lastUpdated')}</div>

                    <div className={styles.paymentGrid}>
                        <div className={styles.paymentCard}>
                            <h2>{t('cardTitle')}</h2>
                            <p>
                                {t('cardDesc')}
                            </p>
                            <div className={styles.cardLogos}>
                                <img src="/assets/visa-logo.svg" alt="Visa" className={styles.payLogo} />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className={styles.payLogo} />
                            </div>
                        </div>

                        <div className={styles.paymentCard}>
                            <h2>{t('bankTitle')}</h2>
                            <p>
                                {t('bankDesc')}
                            </p>
                            <p>
                                <em>{t('bankNote')}</em>
                            </p>

                            <div className={styles.bankDetailsCard}>
                                <div className={styles.bankRow}>
                                    <span className={styles.bankLabel}>{t('bankLabel')}</span>
                                    <span className={styles.bankValue}>ADIB</span>
                                </div>
                                <div className={styles.bankRow}>
                                    <span className={styles.bankLabel}>{t('accNumberLabel')}</span>
                                    <span className={styles.bankValue}>17671626</span>
                                </div>
                                <div className={styles.bankRow}>
                                    <span className={styles.bankLabel}>{t('ibanLabel')}</span>
                                    <span className={styles.bankValue}>AE540500000000017671626</span>
                                </div>
                                <div className={styles.bankRow}>
                                    <span className={styles.bankLabel}>{t('bicLabel')}</span>
                                    <span className={styles.bankValue}>ABDIAEAD</span>
                                </div>
                            </div>
                        </div>

                        {TABBY_ENABLED && (
                        <div className={styles.paymentCard}>
                            <h2>{t('tabbyTitle')}</h2>
                            <p>
                                {t('tabbyDesc')}
                            </p>
                            <div className={styles.cardLogos}>
                                <img src="/assets/Tabby.webp" alt="Tabby" className={styles.payLogoLarge} />
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
