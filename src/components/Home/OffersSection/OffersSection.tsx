'use client';

import React from 'react';
import styles from './OffersSection.module.css';
import { useTranslations } from 'next-intl';

const offers = [
    {
        id: 1,
        image: "/assets/offerposter.webp",
        title: "SUPER SALE",
        subtitle: "UP TO 50% OFF",
        brand: "SPECIAL OFFER",
        description: "",
        buttonText: "SHOP NOW"
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?q=80&w=1384&auto=format&fit=crop",
        title: "New on MARIOT : Techno Dom",
        subtitle: "!!! NEW ARRIVALS !!!",
        brand: "TECNO DOM",
        description: "Now Available on Mariot: Techno Dom - Premium Coffee Maker & Parts...",
        buttonText: "SHOP TECHNO DOM >"
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=1470&auto=format&fit=crop",
        title: "New on MARIOT : Techno Dom",
        subtitle: "!!! NEW ARRIVALS !!!",
        brand: "TECNO DOM",
        description: "Now Available on Mariot: Techno Dom - Premium Coffee Maker & Parts...",
        buttonText: "SHOP TECHNO DOM >"
    },
    {
        id: 4,
        image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1470&auto=format&fit=crop",
        title: "New on MARIOT : Techno Dom",
        subtitle: "!!! NEW ARRIVALS !!!",
        brand: "TECNO DOM",
        description: "Now Available on Mariot: Techno Dom - Premium Coffee Maker & Parts...",
        buttonText: "SHOP TECHNO DOM >"
    },
    {
        id: 5,
        image: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=1470&auto=format&fit=crop",
        title: "Pro Pizza Ovens",
        subtitle: "NEW IN STOCK",
        brand: "ITALIA PRO",
        description: "Authentic stone-baked pizza ovens now available for commercial use...",
        buttonText: "EXPLORE OVENS >"
    },
    {
        id: 6,
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop",
        title: "Stainless Steel Prep Tables",
        subtitle: "BULK DEAL",
        brand: "STEELCRAFT",
        description: "Heavy duty work tables with undershelves. Perfect for busy kitchens...",
        buttonText: "VIEW TABLES >"
    },
    {
        id: 7,
        image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1470&auto=format&fit=crop",
        title: "Commercial Refrigeration",
        subtitle: "SAVE 20%",
        brand: "COOLFLOW",
        description: "Energy efficient reach-in refrigerators and freezers with digital control...",
        buttonText: "SEE COOLING >"
    },
    {
        id: 8,
        image: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=1470&auto=format&fit=crop",
        title: "Chef's Preparation Kits",
        subtitle: "LIMITED EDITION",
        brand: "CHEFTECH",
        description: "Professional grade knife sets and prep tools for the modern culinary artist...",
        buttonText: "LEARN MORE >"
    }
];

const OffersSection = () => {
    const t = useTranslations('ticker');

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
