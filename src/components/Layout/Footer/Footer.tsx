'use client';

import React from 'react';
import Image from "next/legacy/image";
import { Link } from '@/i18n/navigation';
import { Phone, Mail, Headset, Facebook, Instagram, Youtube, Linkedin, Music2 } from 'lucide-react';
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
                                <a href="#" className={styles.facebook} title="Facebook"><Facebook size={20} strokeWidth={2.5} /></a>
                                <a href="#" className={styles.instagram} title="Instagram"><Instagram size={20} strokeWidth={2.5} /></a>
                                <a href="#" className={styles.youtube} title="YouTube"><Youtube size={20} strokeWidth={2.5} /></a>
                                <a href="#" className={styles.tiktok} title="TikTok"><Music2 size={20} strokeWidth={2.5} /></a>
                                <a href="#" className={styles.linkedin} title="LinkedIn"><Linkedin size={20} strokeWidth={2.5} /></a>
                            </div>
                        </div>

                        <div className={styles.paymentSection}>
                            <h4>{t('paymentMethods')}</h4>
                            <div className={styles.paymentIcons}>
                                <div className={styles.payOption}>
                                    <img src="/assets/visa-logo.svg" alt="Visa" className={styles.payLogo} />
                                </div>
                                <div className={styles.payOption}><img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className={styles.payLogo} /></div>
                                <div className={styles.payOption}><img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className={styles.payLogo} /></div>
                                <div className={styles.payOption}><img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg" alt="Google Pay" className={styles.payLogo} /></div>
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
