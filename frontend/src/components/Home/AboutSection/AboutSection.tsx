'use client';

import React from 'react';
import Image from "next/legacy/image";
import { Truck, ShieldCheck, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './AboutSection.module.css';

const AboutSection = () => {
    const t = useTranslations('aboutSection');

    return (
        <section className={styles.aboutSection}>
            <div className={styles.container}>
                <div className={styles.mainContent}>
                    <div className={styles.textContent}>
                        <h2 className={styles.title}>{t('title')}</h2>
                        <div className={styles.textWrapper}>
                            <p className={styles.description}>
                                {t('desc1')}
                            </p>
                            <p className={styles.description}>
                                {t('desc2')}
                            </p>
                            <p className={styles.description}>
                                {t('desc3')}
                            </p>
                        </div>
                    </div>

                    <div className={styles.imageContent}>
                        <div className={styles.iconBox}>
                            <img
                                src="/assets/mariot-logo.webp"
                                alt={t('logoAlt')}
                                className={styles.iconBoxLogo}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.trustBadges}>
                    <div className={styles.badge}>
                        <span className={styles.badgeText}>{t('freeShipping')}</span>
                        <div className={styles.badgeIcon}>
                            <Truck size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className={styles.badge}>
                        <span className={styles.badgeText}>{t('safeShopping')}</span>
                        <div className={styles.badgeIcon}>
                            <ShieldCheck size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className={styles.badge}>
                        <span className={styles.badgeText}>{t('warranty')}</span>
                        <div className={styles.badgeIcon}>
                            <Award size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
