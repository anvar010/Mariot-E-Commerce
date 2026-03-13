import React from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

export const metadata = {
    title: 'Affiliate Program | Mariot Kitchen Equipment',
    description: 'Join the Mariot Kitchen Equipment affiliate program and earn commissions.',
};

export default function AffiliateProgramPage() {
    const t = useTranslations('affiliatePage');

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.mainTitle}>{t('title')}</h1>

                    <div className={styles.statusCard}>
                        <div className={styles.statusIcon}>
                            <Info size={32} />
                        </div>
                        <p className={styles.statusMessage}>
                            {t('currentlyUnavailable')}
                        </p>
                        <p className={styles.subMessage}>
                            {t('stayTuned')}
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
