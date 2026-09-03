import React from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './Affiliate.module.css';
import { useTranslations } from 'next-intl';
import {
    UserPlus,
    Share2,
    Wallet,
    HelpCircle,
    ChevronDown,
    ArrowRight,
    MessageCircle,
    ShoppingCart,
    ClipboardCheck,
    MousePointerClick,
    Coins,
    Trophy,
    Headphones,
    Mail,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';

import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await props.params;
    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/affiliate-program',
        title: isArabic
            ? 'برنامج الشراكة – اربح عمولة | ماريوت دبي'
            : 'Affiliate Program – Earn Commission | Mariot Dubai',
        description: isArabic
            ? 'انضم إلى برنامج الشراكة من ماريوت واربح عمولة على كل عملية بيع لمعدات المطابخ التجارية تقوم بترشيحها. الانضمام مجاني. قدّم طلبك عبر الإنترنت.'
            : 'Join the Mariot affiliate program and earn commission on every commercial kitchen equipment sale you refer. Free to join, based in Dubai. Apply online now.',
    });
}

const PatternIcon = () => (
    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <polygon id="tri" points="40,5 60,5 50,25" />
        </defs>
        <use href="#tri" fill="#2B5A5B" />
        <use href="#tri" transform="rotate(60 50 50)" fill="#64748b" />
        <use href="#tri" transform="rotate(120 50 50)" fill="#2B5A5B" />
        <use href="#tri" transform="rotate(180 50 50)" fill="#64748b" />
        <use href="#tri" transform="rotate(240 50 50)" fill="#2B5A5B" />
        <use href="#tri" transform="rotate(300 50 50)" fill="#64748b" />
    </svg>
);

export default function AffiliateProgramPage() {
    const t = useTranslations('affiliatePage');

    const rawWelcomeText = t('welcomeText');
    const textParts = rawWelcomeText.split(/(?<=\.)\s+/).filter(Boolean);

    const renderTitle = (title: string) => {
        const enMatch = 'Mariot Affiliate';
        const arMatch = 'ماريوت للتسويق بالعمولة';

        if (title.includes(enMatch)) {
            const parts = title.split(enMatch);
            return <>{parts[0]}<span className={styles.tealText}>{enMatch}</span>{parts[1]}</>;
        }
        if (title.includes(arMatch)) {
            const parts = title.split(arMatch);
            return <>{parts[0]}<span className={styles.tealText}>{arMatch}</span>{parts[1]}</>;
        }
        if (title.includes('Mariot')) {
            const parts = title.split('Mariot');
            return <>{parts[0]}<span className={styles.tealText}>Mariot</span>{parts[1]}</>;
        }
        if (title.includes('ماريوت')) {
            const parts = title.split('ماريوت');
            return <>{parts[0]}<span className={styles.tealText}>ماريوت</span>{parts[1]}</>;
        }
        return title;
    };

    const renderWaysTitle = (rawTitle: string) => {
        const enMatch = 'Extra Points';
        const arMatch = 'نقاط إضافية';

        if (rawTitle.includes(enMatch)) {
            const parts = rawTitle.split(enMatch);
            return (
                <>
                    <span className={styles.titleDark}>{parts[0].trim()}</span>
                    <span className={styles.titleLight}>{enMatch}</span>
                </>
            );
        }
        if (rawTitle.includes(arMatch)) {
            const parts = rawTitle.split(arMatch);
            return (
                <>
                    <span className={styles.titleDark}>{parts[0].trim()}</span>
                    <span className={styles.titleLight}>{arMatch}</span>
                </>
            );
        }
        return <span className={styles.titleDark}>{rawTitle}</span>;
    };

    const renderFaqTitle = (rawTitle: string) => {
        const enMatch = 'Questions';
        const arMatch = 'الشائعة';

        if (rawTitle.includes(enMatch)) {
            const parts = rawTitle.split(enMatch);
            return (
                <>
                    <span className={styles.titleDark}>{parts[0].trim()}</span>
                    <span className={styles.titleLight}>{enMatch}</span>
                </>
            );
        }
        if (rawTitle.includes(arMatch)) {
            const parts = rawTitle.split(arMatch);
            return (
                <>
                    <span className={styles.titleDark}>{parts[0].trim()}</span>
                    <span className={styles.titleLight}>{arMatch}</span>
                </>
            );
        }
        return <span className={styles.titleDark}>{rawTitle}</span>;
    };

    return (
        <main className={styles.main}>
            <Header />

            {/* Large Banner Section */}
            <section className={styles.banner}>
                <img
                    src="/mariot-reward-program.webp"
                    alt="Affiliate Program"
                    className={styles.bannerImg}
                />
            </section>

            {/* Intro/Welcome Section */}
            <section className={styles.welcomeSection}>
                <div className={styles.container}>
                    <div className={styles.welcomeGrid}>
                        <div className={styles.welcomeLeft}>
                            <h2 style={{ marginTop: 0 }}>{renderTitle(t('welcomeTitle'))}</h2>
                            <p className={styles.welcomeSubtitleLeft}>{t('welcomeSubtitle')}</p>
                        </div>
                        <div className={styles.welcomeRight}>
                            {textParts.map((part, index) => {
                                const isLast = index === textParts.length - 1;
                                return (
                                    <p key={index} className={isLast ? styles.boldText : ''}>
                                        {part}
                                    </p>
                                );
                            })}
                            <Link href="/signup" className={styles.registerBtn}>
                                {t('ctaJoin')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className={styles.howItWorksNew}>
                <div className={styles.container}>
                    <h2 className={styles.howTitle}>{t('howItWorksTitle')}</h2>
                    <div className={styles.stepsGrid}>
                        <div className={styles.stepNew}>
                            <div className={styles.stepImageWrapper}>
                                <img src="/1.webp" alt="Sign up" className={styles.stepImage} />
                            </div>
                            <h4>{t('step1')}</h4>
                            <p>{t('step1Desc')}</p>
                        </div>
                        <div className={styles.stepNew}>
                            <div className={styles.stepImageWrapper}>
                                <img src="/2.webp" alt="Earn Points" className={styles.stepImage} />
                            </div>
                            <h4>{t('step2')}</h4>
                            <p>{t('step2Desc')}</p>
                        </div>
                        <div className={styles.stepNew}>
                            <div className={styles.stepImageWrapper}>
                                <img src="/3-Photoroom.png" alt="Redeem rewards" className={styles.stepImage} />
                            </div>
                            <h4>{t('step3')}</h4>
                            <p>{t('step3Desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ways to Earn Section */}
            <section className={styles.waysToEarn}>
                <div className={styles.container}>
                    <div className={styles.waysGrid}>
                        {/* Left Side */}
                        <div className={styles.waysLeft}>

                            <h2 className={styles.waysTitle}>
                                {renderWaysTitle(t('waysToEarnTitle'))}
                            </h2>
                            <p className={styles.waysSubtitle}>{t('waysToEarnSubtitle')}</p>
                        </div>

                        {/* Right Side */}
                        <div className={styles.waysRight}>
                            <div className={styles.bonusesGrid}>
                                <div className={styles.bonusItem}>
                                    <div className={styles.bonusIconCircle}>
                                        <ShoppingCart size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className={styles.bonusValue}>{t('bonus1Value')}</div>
                                    <div className={styles.bonusLabel}>{t('bonus1')}</div>
                                </div>
                                <div className={styles.bonusItem}>
                                    <div className={styles.bonusIconCircle}>
                                        <ClipboardCheck size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className={styles.bonusValue}>{t('bonus2Value')}</div>
                                    <div className={styles.bonusLabel}>{t('bonus2')}</div>
                                </div>
                                <div className={styles.bonusItem}>
                                    <div className={styles.bonusIconCircle}>
                                        <MousePointerClick size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className={styles.bonusValue}>...more</div>
                                    <div className={styles.bonusLabel}>with every purchase</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaBottom}>
                <div className={styles.container}>
                    <div className={styles.ctaContent}>
                        <img src="/assets/mariot-logo.webp" alt="Mariot Logo" className={styles.ctaLogo} />
                        <h2 className={styles.ctaBrand}>Mariot Affiliate Program</h2>
                        <h3 className={styles.ctaText}>
                            Start earning, redeeming, and enjoying the perks of being a part of our thriving community.
                        </h3>
                        <Link href="/signup" className={`${styles.registerBtn} ${styles.ctaBtn}`}>
                            {t('ctaJoin')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* FAQ & Contact Split Section */}
            <section className={styles.faqContactSplit}>
                <div className={styles.container}>
                    <div className={styles.splitGrid}>
                        {/* Left Side: FAQs */}
                        <div className={styles.faqColumn}>
                            <h2 className={styles.splitTitle}>
                                {renderFaqTitle(t('faqTitle'))}
                            </h2>
                            <div className={styles.faqListMinimal}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => {
                                    const question = t(`faq${num}`);
                                    const answer = t(`faq${num}Desc`);
                                    if (!question || question === `faq${num}`) return null;
                                    return (
                                        <details key={num} className={styles.faqItemMinimal}>
                                            <summary>
                                                <ChevronRight className={styles.chevronMinimal} size={20} strokeWidth={2.5} />
                                                <span>{question}</span>
                                            </summary>
                                            <div className={styles.faqAnswerMinimal}>
                                                <p>{answer}</p>
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Side: Sticky Contact & Terms */}
                        <div className={styles.contactColumnWrapper}>
                            <div className={styles.contactSticky}>
                                <h2 className={styles.splitTitle}>
                                    <span className={styles.titleDark}>Got more questions?</span>
                                    <span className={styles.titleLight}>Contact us</span>
                                </h2>

                                <div className={styles.contactItemsList}>
                                    {/* Phone Item */}
                                    <div className={styles.contactListItem}>
                                        <div className={styles.contactIconCircle}>
                                            <Headphones size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className={styles.contactItemContent}>
                                            <div className={styles.contactItemLabel}>PHONE SUPPORT</div>
                                            <div className={styles.contactItemValue}>+971 4 288 2777</div>
                                            <div className={styles.contactItemSub}>Mon - Sat | 9AM - 8PM</div>
                                            <a href="https://wa.me/97142882777" className={styles.whatsappPill} target="_blank" rel="noreferrer">
                                                <MessageCircle size={16} />
                                                <span>Message us on WhatsApp</span>
                                            </a>
                                        </div>
                                    </div>

                                    {/* Email Item */}
                                    <div className={styles.contactListItem}>
                                        <div className={styles.contactIconCircle}>
                                            <Mail size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className={styles.contactItemContent}>
                                            <div className={styles.contactItemLabel}>SUPPORT EMAIL</div>
                                            <div className={styles.contactItemValue}>admin@mariotkitchen.com</div>
                                        </div>
                                    </div>

                                    {/* Help Center Item */}
                                    <div className={styles.contactListItem}>
                                        <div className={styles.contactIconCircle}>
                                            <HelpCircle size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className={styles.contactItemContent}>
                                            <div className={styles.contactItemLabel}>HELP CENTER</div>
                                            <div className={styles.contactItemValue}>
                                                <Link href="/contact" className={styles.contactLinkInline}>contact us</Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.termsBox}>
                                    <h3>Terms & Conditions</h3>
                                    <p>Available here: <Link href="/en/terms-and-conditions" className={styles.termsLink}>terms and conditions</Link></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
            <FloatingActions />
        </main>
    );
}
