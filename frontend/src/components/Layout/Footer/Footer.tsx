'use client';

import React from 'react';
import Image from "next/legacy/image";
import Link from 'next/link';
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
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={styles.payLogoSvg} id="visa">
                                        <polygon fill="#1565c0" points="17.202 32.269 21.087 32.269 23.584 16.732 19.422 16.732"></polygon>
                                        <path fill="#1565c0" d="M13.873 16.454l-3.607 11.098-.681-3.126c-1.942-4.717-5.272-6.659-5.272-6.659l3.456 14.224h4.162l5.827-15.538H13.873zM44.948 16.454h-4.162l-6.382 15.538h3.884l.832-2.22h4.994l.555 2.22H48L44.948 16.454zM39.954 26.997l2.22-5.826 1.11 5.826H39.954zM28.855 20.893c0-.832.555-1.665 2.497-1.665 1.387 0 2.775 1.11 2.775 1.11l.832-3.329c0 0-1.942-.832-3.607-.832-4.162 0-6.104 2.22-6.104 4.717 0 4.994 5.549 4.162 5.549 6.659 0 .555-.277 1.387-2.497 1.387s-3.884-.832-3.884-.832l-.555 3.329c0 0 1.387.832 4.162.832 2.497.277 6.382-1.942 6.382-5.272C34.405 23.113 28.855 22.836 28.855 20.893z"></path>
                                        <path fill="#ff9800" d="M9.711,25.055l-1.387-6.936c0,0-0.555-1.387-2.22-1.387c-1.665,0-6.104,0-6.104,0 S8.046,19.229,9.711,25.055z"></path>
                                    </svg>
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
