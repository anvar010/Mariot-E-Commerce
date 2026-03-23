'use client';

import React from 'react';
import styles from './OffersSection.module.css';
import { useTranslations } from 'next-intl';

interface Offer {
    id: number;
    image: string;
    title: string;
    subtitle?: string;
    brand?: string;
    description: string;
    buttonText: string;
}

interface OffersSectionProps {
    initialOffers?: Offer[];
}

const OffersSection = ({ initialOffers = [] }: OffersSectionProps) => {
    const t = useTranslations('ticker');
    const offers = initialOffers;

    if (offers.length === 0) return null;

    return (
        <section className={styles.offersSection} id="offers-section">
            <div className={styles.container}>
                <div className={styles.offersGrid}>
                    {offers.map((offer) => (
                        <div key={offer.id} className={styles.offerCard}>
                            <div className={styles.imageContainer}>
                                <img src={offer.image} alt={offer.title} className={styles.offerImage} loading="lazy" />
                                {offer.subtitle && <div className={styles.overlayText}>{offer.subtitle}</div>}
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{offer.title}</h3>
                                <p className={styles.cardDescription}>{offer.description}</p>
                                <button className={styles.shopBtn}>{offer.buttonText}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ticker / Marquee Section */}
            <div className={styles.tickerContainer}>
                <div className={styles.tickerTrack}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={styles.tickerItem}>
                            <span>{t('restaurantSupply')}</span>
                            <span className={styles.separator}>✦</span>
                            <span className={styles.highlight}>{t('uaeTrustedSupplier')}</span>
                            <span className={styles.separator}>✦</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default OffersSection;
