'use client'; // Error components must be Client Components

import React, { useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import { Home, Percent, Tag, ShieldAlert, RotateCcw } from 'lucide-react';
import { useLocale } from 'next-intl';
import styles from './not-found.module.css'; // Reusing not-found CSS for beautiful branding

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const locale = useLocale();
    const isArabic = locale === 'ar';

    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global bounded error caught:", error);
    }, [error]);

    return (
        <main style={{ backgroundColor: '#ffffff' }}>
            <Header />

            <div className={styles.pageWrapper}>
                <div className={styles.content} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div className={styles.staticIcon} style={{ color: '#e31e24' }}>
                        <ShieldAlert size={80} strokeWidth={1} />
                    </div>
                    <p className={styles.sorryText} style={{ textAlign: 'center' }}>
                        {isArabic ? 'يبدو أنه حدث خطأ ما' : 'Something went wrong'}
                    </p>
                    <h1 className={styles.promptText} style={{ textAlign: 'center' }}>
                        {isArabic ? 'واجهنا مشكلة غير متوقعة أثناء تحميل هذه الصفحة.' : 'We encountered an unexpected issue while loading this page.'}
                    </h1>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '40px' }}>
                        <button
                            onClick={() => reset()}
                            className={styles.searchButton}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px 30px', borderRadius: '6px' }}
                        >
                            <RotateCcw size={18} />
                            {isArabic ? 'حاول مجدداً' : 'Try again'}
                        </button>
                    </div>

                    <div className={styles.shortcuts}>
                        <p className={styles.shortcutsTitle}>
                            {isArabic ? 'روابط سريعة' : 'Safe Shortcuts'}
                        </p>
                        <div className={styles.shortcutsGrid}>
                            <Link href={`/${locale}`} className={styles.shortcutBtn}>
                                <Home size={18} className={styles.icon} />
                                {isArabic ? 'الرئيسية' : 'Homepage'}
                            </Link>
                            <Link href={`/${locale}/today-offers`} className={styles.shortcutBtn}>
                                <Percent size={18} className={styles.icon} />
                                {isArabic ? 'العروض' : 'Deals'}
                            </Link>
                            <Link href={`/${locale}/shop-by-brands`} className={styles.shortcutBtn}>
                                <Tag size={18} className={styles.icon} />
                                {isArabic ? 'تسوق حسب العلامة التجارية' : 'Shop by Brand'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
            {/* Note: FloatingActions is already inside layout.tsx, but some pages dual-render it. 
                Since it's in layout.tsx we can omit it here. However layout.tsx does NOT have Header/Footer. */}
        </main>
    );
}
