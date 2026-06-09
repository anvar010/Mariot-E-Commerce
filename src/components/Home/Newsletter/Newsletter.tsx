'use client';

import React from 'react';
import styles from './Newsletter.module.css';
import { useLocale } from 'next-intl';

const Newsletter = () => {
    const isArabic = useLocale() === 'ar';
    return (
        <section className={styles.newsletterSection}>
            <div className={styles.container}>
                <h2 className={styles.title}>{isArabic ? 'ابقَ على اطلاع' : 'Stay in the Loop'}</h2>
                <p className={styles.subtitle}>
                    {isArabic
                        ? 'اشترك في نشرتنا البريدية للحصول على عروض حصرية وإطلاقات منتجات جديدة ونصائح خبراء المطبخ مباشرة إلى بريدك.'
                        : 'Subscribe to our newsletter for exclusive offers, new product launches, and expert kitchen tips delivered to your inbox.'}
                </p>
                <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="email"
                        placeholder={isArabic ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                        className={styles.input}
                        required
                    />
                    <button type="submit" className={styles.subscribeBtn}>
                        {isArabic ? 'اشترك' : 'Subscribe'}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default Newsletter;
