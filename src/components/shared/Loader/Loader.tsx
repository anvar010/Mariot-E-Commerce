import React from 'react';
import { useTranslations } from 'next-intl';
import styles from './Loader.module.css';

const Loader = ({ fullPage = false }) => {
    const t = useTranslations('common');
    return (
        <div className={`${styles.loaderContainer} ${fullPage ? styles.fullPage : ''}`}>
            <div className={styles.loaderContent}>
                <div className={styles.geometryWrapper}>
                    <div className={styles.outerRing}></div>
                    <div className={styles.innerRing}></div>
                    <div className={styles.logoGhost}>
                        <img src="/assets/mariot-logo.webp" alt="Mariot Logo" />
                    </div>
                </div>
                <div className={styles.textStack}>
                    <span className={styles.loadingText}>{t('loading', { defaultValue: 'Loading' })}</span>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Loader;
