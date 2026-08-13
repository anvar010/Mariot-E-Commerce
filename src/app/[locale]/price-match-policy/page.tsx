import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { Tag } from 'lucide-react';

import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await props.params;
    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/price-match-policy',
        title: isArabic
            ? 'ضمان مطابقة الأسعار لمعدات المطابخ | ماريوت الإمارات'
            : 'Price Match Guarantee on Kitchen Equipment | Mariot UAE',
        description: isArabic
            ? 'وجدته بسعر أقل؟ تطابق ماريوت السعر على معدات المطابخ التجارية في الإمارات. تعرف على آلية ضمان مطابقة الأسعار وكيفية تقديم طلبك.'
            : 'Found it cheaper elsewhere? Mariot matches the price on commercial kitchen equipment across the UAE. See how our price match guarantee works and how to claim.',
    });
}

export default function PriceMatchPolicyPage() {
    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.mainTitle}>Price Match Policy</h1>

                    <div className={styles.statusCard}>
                        <div className={styles.statusIcon}>
                            <Tag size={32} />
                        </div>
                        <p className={styles.statusMessage}>
                            Our Price Match guarantee is currently being finalized.
                        </p>
                        <p className={styles.subMessage}>
                            We are committed to providing you with the best prices. Stay tuned for full details.
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
