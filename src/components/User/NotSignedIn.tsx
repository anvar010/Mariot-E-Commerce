'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import styles from './NotSignedIn.module.css';
import { useTranslations } from 'next-intl';

const NotSignedIn = () => {
    const t = useTranslations('auth');

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Hello</h1>
            <p className={styles.subtitle}>You&apos;re not signed in!</p>
            <div className={styles.buttonGroup}>
                <Link href="/signin" className={styles.signInBtn}>
                    Sign in
                </Link>
                <Link href="/signup" className={styles.createAccountBtn}>
                    Create account
                </Link>
            </div>
        </div>
    );
};

export default NotSignedIn;
