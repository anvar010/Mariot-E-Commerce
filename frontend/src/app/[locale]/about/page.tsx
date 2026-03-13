import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import Image from "next/legacy/image";
import { useTranslations } from 'next-intl';

export const metadata: Metadata = {
    title: 'About Us | Mariot Store - Leading Kitchen Equipment Supplier',
    description: 'Learn about Mariot Store, your trusted partner for commercial kitchen equipment in the UAE. With over 15 years of industry experience, we provide premium solutions and expert support.',
};
import {
    MapPin,
    Mail,
    PhoneCall
} from 'lucide-react';

export default function AboutPage() {
    const t = useTranslations('aboutPage');

    const branchesData = [
        {
            name: 'Dubai Branch',
            address: 'Deira, Dubai, UAE',
            email: 'admin@mariotkitchen.com',
            phone: ['+971 4-288-2777'],
            mapLink: 'https://maps.google.com/maps?q=Mariot%20Kitchen%20Equipment%20Dubai&t=&z=15&ie=UTF8&iwloc=B&output=embed'
        },
        {
            name: 'Al Ain Branch',
            address: 'Al Ain Industrial Area, UAE',
            email: 'alain@mariotkitchen.com',
            phone: ['+971 3-722-7337'],
            mapLink: 'https://maps.google.com/maps?q=ماريوت%20لمعدات%20المطابخ%20Al%20Ain&t=&z=15&ie=UTF8&iwloc=B&output=embed'
        },
        {
            name: 'Abu Dhabi Muroor',
            address: 'Muroor Rd, Abu Dhabi, UAE',
            email: ['sales2@mariotkitchen.com', 'info@mariotkitchen.com'],
            phone: ['+971 2-645-9353', '+971 2-77-4544', '+971 2-673-5479'],
            mapLink: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d54.3744507!3d24.5026967!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5e66f6711522f7%3A0xba8c40636e4d1dc1!2s!5e0!3m2!1sen!2sae'
        },
        {
            name: 'Sharjah Al Majaz',
            address: 'Al Majaz, Sharjah, UAE',
            email: 'sales@mariot-group.com',
            phone: ['+971 6-767-7777'],
            mapLink: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d55.3824161!3d25.3168016!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5b111a48b363%3A0xf594b5fad15d22af!2s!5e0!3m2!1sen!2sae'
        },
        {
            name: 'Sharjah Industrial',
            address: 'Industrial Area, Sharjah, UAE',
            email: 'factory@mariotkitchen.com',
            phone: ['+971 6-767-7776'],
            mapLink: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d55.4295081!3d25.2927685!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5f1068f8c01d%3A0xfa273e3af48feb67!2s!5e0!3m2!1sen!2sae'
        }
    ];

    return (
        <>
            <Header />
            <main className={styles.main}>
                {/* Hero Section */}
                <section className={styles.heroSection}>
                    <div className={styles.heroOverlay}></div>
                    <div className={styles.heroContainer}>
                        <div className={styles.heroContent}>
                            <span className={styles.heroBadge}>{t('heroBadge')}</span>
                            <h1 className={styles.heroTitle}>
                                {t('heroTitlePart1')} <br />
                                <span className={styles.heroHighlight}>{t('heroTitleHighlight')}</span>
                            </h1>
                            <p className={styles.heroSubtitle}>
                                {t('heroSubtitle')}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Our Story section */}
                <section className={styles.introSection}>
                    <div className={styles.container}>
                        <div className={styles.storyLayout}>
                            <div className={styles.storyContent}>
                                <div className={styles.storyHeader}>
                                    <span className={styles.storyLabel}>{t('storyLabel')}</span>
                                    <h2 className={styles.storyTitle}>{t('storyTitle')}</h2>
                                </div>
                                <div className={styles.storyText}>
                                    <p className={styles.storyLead}>
                                        {t('storyLead')}
                                    </p>
                                    <p>
                                        {t('storyText')}
                                    </p>
                                </div>

                                <div className={styles.storyStats}>
                                    <div className={styles.statItem}>
                                        <h4>{t('premium')}</h4>
                                        <p>{t('premiumDesc')}</p>
                                    </div>
                                    <div className={styles.statItem}>
                                        <h4>{t('global')}</h4>
                                        <p>{t('globalDesc')}</p>
                                    </div>
                                    <div className={styles.statItem}>
                                        <h4>{t('support')}</h4>
                                        <p>{t('supportDesc')}</p>
                                    </div>
                                </div>

                                <div className={styles.storyQuoteBox}>
                                    <div className={styles.quoteIcon}>"</div>
                                    <p>{t('quote')}</p>
                                </div>
                            </div>

                            <div className={styles.storyImages}>
                                <div className={styles.mainImageContainer}>
                                    <img
                                        src="/assets/todayoffersbanner.webp"
                                        alt="Professional Kitchen"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div className={styles.experienceBadge}>
                                        <span className={styles.expNumber}>{t('expNumber')}</span>
                                        <span className={styles.expText}>{t.rich('expText', { br: () => <br /> })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why Choose Us Section */}
                <section className={styles.whyChooseUsSection}>
                    <div className={styles.container}>
                        <div className={styles.whyChooseUsHeader}>
                            <h2 className={styles.sectionTitle}>{t('whyChooseUsTitle')}</h2>
                            <h3 className={styles.whyChooseUsSubtitle}>{t('whyChooseUsSubtitle')}</h3>
                        </div>

                        <div className={styles.whyChooseUsContent}>
                            <p>{t('whyChooseUsPara1')}</p>
                            <p>{t('whyChooseUsPara2')}</p>
                            <p>{t('whyChooseUsPara3')}</p>
                            <p>{t('whyChooseUsPara4')}</p>
                            <p>{t('whyChooseUsPara5')}</p>
                            <p>{t('whyChooseUsPara6')}</p>
                            <p>{t('whyChooseUsPara7')}</p>
                            <p>{t('whyChooseUsPara8')}</p>
                            <p>{t('whyChooseUsPara9')}</p>
                            <p>{t('whyChooseUsPara10')}</p>
                            <p className={styles.highlightText}>
                                {t('bestSuppliers')}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Branches Section */}
                <section className={styles.branchesSectionFull}>
                    <div className={styles.centerHeaderFullWidth}>
                        <h2 className={styles.sectionTitle}>{t('ourLocations')}</h2>
                        <h3 className={styles.sectionSubtitle}>{t('trustedSuppliers')}</h3>
                    </div>

                    <div className={styles.fullWidthLocationsContainer}>
                        <div className={styles.locationsGridHorizontal}>
                            {branchesData.map((branch, index) => (
                                <div key={index} className={styles.horizontalLocationCard}>
                                    <div className={styles.cardHeader}>
                                        <h4>{branch.name}</h4>
                                    </div>
                                    <div className={styles.cardMap}>
                                        <iframe
                                            title={branch.name}
                                            src={branch.mapLink}
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            allowFullScreen
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                        ></iframe>
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <div className={styles.contactRow}>
                                            <MapPin size={20} className={styles.icon} />
                                            <span>{branch.address}</span>
                                        </div>
                                        <div className={styles.contactRow}>
                                            <Mail size={20} className={styles.icon} />
                                            {Array.isArray(branch.email) ? (
                                                <div className={styles.linkStack}>
                                                    {branch.email.map(email => (
                                                        <a key={email} href={`mailto:${email}`}>{email}</a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <a href={`mailto:${branch.email}`}>{branch.email}</a>
                                            )}
                                        </div>
                                        <div className={styles.contactRowTop}>
                                            <PhoneCall size={20} className={styles.icon} />
                                            <div className={styles.linkStack}>
                                                {branch.phone.map(phone => (
                                                    <a key={phone} href={`tel:${phone.replace(/\s|-/g, '')}`} dir="ltr">{phone}</a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
            <FloatingActions />
        </>
    );
}
