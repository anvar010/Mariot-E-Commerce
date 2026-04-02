'use client';

import React from 'react';
import Image from "next/legacy/image";
import { Link } from '@/i18n/navigation';
import { Phone, Mail, Headset, Facebook, Instagram, Youtube, Linkedin, Music2, Twitter, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './Footer.module.css';

const Footer = () => {
    const t = useTranslations('footer');
    return (
        <footer className={styles.footer}>
            {/* 1. Top Support Bar */}
            <div className={styles.supportBar}>
                <div className={styles.container}>
                    <div className={styles.supportText}>
                        <h3>{t('alwaysReady')}</h3>
                        <p>{t('reachOut')}</p>
                    </div>
                    <div className={styles.supportIcons}>
                        <div className={styles.supportItem}>
                            <div className={styles.iconCircle}>
                                <Phone size={24} color="#ffffff" strokeWidth={2.5} />
                            </div>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemLabel}>{t('phoneSupport')}</span>
                                <span className={styles.itemValue} dir="ltr">+971 4 288 2777</span>
                                <span className={styles.itemSub}>{t('available247')}</span>
                            </div>
                        </div>
                        <div className={styles.supportItem}>
                            <div className={styles.iconCircle}>
                                <Mail size={24} color="#ffffff" strokeWidth={2.5} />
                            </div>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemLabel}>{t('infoEmailLabel')}</span>
                                <span className={styles.itemValue}>info@mariot-group.com</span>
                            </div>
                        </div>
                        <div className={styles.supportItem}>
                            <div className={styles.iconCircle}>
                                <Headset size={24} color="#ffffff" strokeWidth={2.5} />
                            </div>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemLabel}>{t('helpCenterLabel')}</span>
                                <span className={styles.itemValue}>help@mariot-group.com</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Footer Content */}
            <div className={styles.mainFooter}>
                <div className={styles.container}>
                    <div className={styles.footerGrid}>
                        {/* Logo and About Section */}
                        <div className={styles.aboutCol}>
                            <Link href="/" className={styles.footerLogoWrapper}>
                                <img
                                    src="/assets/mariot-logo.webp"
                                    alt={t('logoAlt')}
                                    className={styles.footerLogoImg}
                                />
                            </Link>
                            <address className={styles.address}>
                                {t('address')}
                            </address>
                        </div>

                        {/* Description Text */}
                        <div className={styles.descCol}>
                            <p>
                                {t('descLong')}
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div className={styles.linksCol}>
                            <h4>{t('quickLinks')}</h4>
                            <ul>
                                <li><Link href="/about">{t('aboutUs')}</Link></li>
                                <li><Link href="/shop-by-brands">{t('shopByBrand')}</Link></li>
                                <li><Link href="/contact">{t('contactUs')}</Link></li>
                                <li><Link href="/affiliate-program">{t('affiliateProgram')}</Link></li>
                                <li><Link href="/privacy-policy">{t('privacyPolicy')}</Link></li>
                                <li><Link href="/return-policy">{t('returnPolicy')}</Link></li>
                                <li><Link href="/shipping-details">{t('shippingDetails')}</Link></li>
                                <li><Link href="/payment-information">{t('paymentInformation')}</Link></li>
                                <li><Link href="/terms-and-conditions">{t('termsConditions')}</Link></li>
                            </ul>
                        </div>

                        {/* Product Categories */}
                        <div className={styles.linksCol}>
                            <h4>{t('productCategories')}</h4>
                            <ul>
                                <li><Link href="/shop?category=coffee-makers">{t('accessories')}</Link></li>
                                <li><Link href="/shop?category=bakery">{t('bakeryLine')}</Link></li>
                                <li><Link href="/shop?category=cooking-equipment">{t('cookingLine')}</Link></li>
                                <li><Link href="/shop?category=food-preparation">{t('foodProcessing')}</Link></li>
                                <li><Link href="/shop?category=dishwashing">{t('laundryDishWasher')}</Link></li>
                                <li><Link href="/shop?category=refrigeration">{t('refrigerationLine')}</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className={styles.footerBottomRow}>
                        <div className={styles.socialSection}>
                            <h4>{t('followUs')}</h4>
                            <div className={styles.socialIcons}>
                                <a href="https://www.facebook.com/mariotuae" target="_blank" rel="noopener noreferrer" className={styles.facebook} title="Facebook"><Facebook size={20} strokeWidth={2.5} /></a>
                                <a href="https://www.instagram.com/mariotuae/" target="_blank" rel="noopener noreferrer" className={styles.instagram} title="Instagram"><Instagram size={20} strokeWidth={2.5} /></a>
                                <a href="https://x.com/MariotUae" target="_blank" rel="noopener noreferrer" className={styles.twitter} title="X (Twitter)"><Twitter size={20} strokeWidth={2.5} /></a>
                                <a href="https://www.youtube.com/channel/UCUCWktTJNpRzUEJ58JHLu_g" target="_blank" rel="noopener noreferrer" className={styles.youtube} title="YouTube"><Youtube size={20} strokeWidth={2.5} /></a>
                                <a href="https://www.tiktok.com/@mariotmedia" target="_blank" rel="noopener noreferrer" className={styles.tiktok} title="TikTok"><Music2 size={20} strokeWidth={2.5} /></a>
                                <a href="https://ae.linkedin.com/in/mariot-kitchen-equipment-8a34a4108?trk=public_post_feed-actor-name" target="_blank" rel="noopener noreferrer" className={styles.linkedin} title="LinkedIn"><Linkedin size={20} strokeWidth={2.5} /></a>
                                <a href="https://www.pinterest.com/mariotkitchen/" target="_blank" rel="noopener noreferrer" className={styles.pinterest} title="Pinterest">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.23-.11-.94-.2-2.39.04-3.42.22-.94 1.4-5.91 1.4-5.91s-.36-.71-.36-1.76c0-1.65.95-2.88 2.15-2.88 1.01 0 1.5.76 1.5 1.67 0 1.02-.65 2.54-.98 3.94-.28 1.18.59 2.14 1.76 2.14 2.11 0 3.73-2.23 3.73-5.44 0-2.84-2.04-4.83-4.96-4.83-3.38 0-5.36 2.54-5.36 5.15 0 1.02.39 2.12.88 2.72.1.12.11.22.08.33-.09.37-.28 1.14-.32 1.3-.05.21-.16.25-.37.15-1.39-.65-2.25-2.68-2.25-4.31 0-3.51 2.55-6.73 7.35-6.73 3.86 0 6.86 2.75 6.86 6.43 0 3.84-2.42 6.93-5.78 6.93-1.13 0-2.19-.59-2.55-1.28l-.69 2.63c-.25.96-.92 2.16-1.37 2.89C9.07 23.63 10.48 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z"/>
                                    </svg>
                                </a>
                            </div>
                        </div>

                        <div className={styles.paymentSection}>
                            <h4>{t('paymentMethods')}</h4>
                            <div className={styles.paymentIcons}>
                                <div className={styles.payOption}>
                                    <img src="/assets/visa-logo.svg" alt="Visa" className={`${styles.payLogo} ${styles.visaLogo}`} />
                                </div>
                                <div className={styles.payOption}><img src="/assets/mastercard-logo.svg" alt="Mastercard" className={styles.payLogo} /></div>
                                <div className={styles.payOption}><img src="/assets/apple-pay-logo.svg" alt="Apple Pay" className={styles.payLogo} /></div>
                                <div className={styles.payOption}><img src="/assets/google-pay-logo.svg" alt="Google Pay" className={styles.payLogo} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Bottom Copyright Bar */}
            <div className={styles.copyrightBar}>
                <div className={styles.container}>
                    <p>{t('copyright')} {t('allRightsReserved')}.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
