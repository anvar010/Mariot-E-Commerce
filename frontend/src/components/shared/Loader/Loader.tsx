import React from 'react';
import { useTranslations } from 'next-intl';
import styles from './Loader.module.css';

const Loader = ({ fullPage = false }) => {
    const t = useTranslations('common');
    return (
        <div className={`${styles.loaderWrapper} ${fullPage ? styles.fullPage : ''}`}>
            <div className={styles.spinner}>
                <div className={styles.spinnerInner}></div>
                <div className={styles.spinnerGlow}></div>
                <div className={styles.logoContainer}>
                    <img
                        src="/assets/mariot-logo.webp"
                        alt="Mariot Logo"
                        className={styles.logoImg}
                    />
                </div>
            </div>
            <p className={styles.loadingText}>{t('loading')}</p>
        </div>
    );
};

export default Loader;
