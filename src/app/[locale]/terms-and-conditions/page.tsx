import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { useTranslations } from 'next-intl';

export const metadata: Metadata = {
    title: 'Terms and Conditions | Mariot Store',
    description: 'Read the official terms and conditions for shopping at Mariot Store. Learn about our service agreements, user obligations, and legal policies.',
};

export default function TermsAndConditionsPage() {
    const t = useTranslations('termsPage');
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
                            <h2>{t('aboutTitle')}</h2>
                            <p>
                                {t('aboutDesc')}
                            </p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('eligibilityTitle')}</h2>
                            <p>{t('eligibilityDesc')}</p>

                            <div className={styles.subsection}>
                                <h3>{t('buyersTitle')}</h3>
                                <p>{t('buyersList')}</p>
                            </div>

                            <div className={styles.subsection}>
                                <h3>{t('sellersTitle')}</h3>
                                <p>{t('sellersList')}</p>
                            </div>

                            <p>{t('reg2')}</p>
                            <p>{t('reg3')}</p>
                        </section>


                        <section className={styles.section}>
                            <h2>{t('obligationsTitle')}</h2>
                            <p>{t('obligations1')}</p>
                            <p>{t('obligations1List')}</p>

                            <p>{t('obligations2')}</p>
                            <p>{t('obligations2List')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('ipTitle')}</h2>
                            <p>{t('ip1')}</p>
                            <p>{t('ip1List')}</p>
                            <p>{t('ip2')}</p>
                            <p>{t('ip3')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('warrantiesTitle')}</h2>
                            <p>{t('warranties1')}</p>
                            <p>{t('warranties1List')}</p>
                            <p>{t('warranties2')}</p>
                            <p>{t('warranties3')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('liabilityTitle')}</h2>
                            <p>{t('liability1')}</p>
                            <p>{t('liability2')}</p>
                            <p>{t('liability3')}</p>
                            <p>{t('liability4')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('indemnityTitle')}</h2>
                            <p>{t('indemnity1')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('terminationTitle')}</h2>
                            <p>{t('termination1')}</p>
                            <p>{t('termination2')}</p>
                            <p>{t('termination3')}</p>
                            <p>{t('termination4')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('generalTitle')}</h2>
                            <p>{t('generalList')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('limitationTitle')}</h2>
                            <p>{t('limitation1')}</p>
                            <p>{t('limitation2')}</p>
                            <p>{t('limitation3')}</p>
                            <p>{t('limitation4')}</p>
                            <p>{t('limitation5')}</p>
                            <p>{t('limitation6')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('amendmentsTitle')}</h2>
                            <p>{t('amendments1')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('governingTitle')}</h2>
                            <p>{t('governing1')}</p>
                            <p>{t('governing2')}</p>
                        </section>

                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
