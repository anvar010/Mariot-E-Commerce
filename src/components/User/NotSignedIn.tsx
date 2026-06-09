'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import styles from './NotSignedIn.module.css';
import { useTranslations } from 'next-intl';

const NotSignedIn = () => {
    const t = useTranslations('auth');

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('notSignedInGreeting')}</h1>
            <p className={styles.subtitle}>{t('notSignedInSubtitle')}</p>
            <div className={styles.buttonGroup}>
                <Link href="/signin" className={styles.signInBtn}>
                    {t('signIn')}
                </Link>
                <Link href="/signup" className={styles.createAccountBtn}>
                    {t('createAccount')}
                </Link>
            </div>
        </div>
    );
};

export default NotSignedIn;
