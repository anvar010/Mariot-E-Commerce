import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { useTranslations } from 'next-intl';

export const metadata: Metadata = {
    title: 'Privacy Policy | Mariot Store',
    description: 'Our privacy policy outlines how we handle your personal data and ensure your information remains secure when shopping at Mariot Store.',
};

export default function PrivacyPolicyPage() {
    const t = useTranslations('privacyPage');
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
                            <h2>{t('collectionTitle')}</h2>
                            <p>{t('collectionDesc')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('usageTitle')}</h2>
                            <p>{t('usageDesc')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('securityTitle')}</h2>
                            <p>{t('securityDesc')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('cookiesTitle')}</h2>
                            <p>{t('cookiesDesc')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('contactTitle')}</h2>
                            <p>{t('contactDesc')}</p>
                        </section>
                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
