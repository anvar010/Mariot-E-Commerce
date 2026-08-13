import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { useTranslations } from 'next-intl';

import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await props.params;
    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/privacy-policy',
        title: isArabic
            ? 'سياسة الخصوصية | ماريوت لمعدات المطابخ'
            : 'Privacy Policy | Mariot Kitchen Equipment UAE',
        description: isArabic
            ? 'كيف تجمع ماريوت بياناتك الشخصية وتستخدمها وتحميها عند التسوق لمعدات المطابخ التجارية عبر الإنترنت، بما في ذلك حقوقك وملفات الارتباط وأمان البيانات.'
            : 'How Mariot collects, uses and protects your personal data when you shop for commercial kitchen equipment online. Your rights, cookies and data security explained.',
    });
}

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
