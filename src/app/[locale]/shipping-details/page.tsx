import React from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const metadata = {
    title: 'Shipping Details | Mariot Kitchen Equipment',
    description: 'Information about delivery times, shipping charges, and tracking for your orders.',
};

export default function ShippingDetailsPage() {
    const t = useTranslations('shippingPage');
    const tc = useTranslations('common');

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.mainTitle}>{t('title')}</h1>
                    <div className={styles.lastUpdated}>{t('lastUpdated')}</div>

                    <div className={styles.documentBody}>
                        <p className={styles.intro}>
                            <strong className={styles.noticeLabel}>{tc('notice')}</strong>
                            {t('intro1')}<br /><br />
                            {t('intro2')}
                        </p>

                        <section className={styles.section}>
                            <h2>{t('trackingTitle')}</h2>
                            <p>{t('trackingDesc')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('damagedTitle')}</h2>
                            <p>{t('damagedDesc')}</p>
                            <ul>
                                <li>{t('step1')}</li>
                                <li>{t('step2')}</li>
                                <li>{t('step3')}</li>
                                <li>{t('step4')}</li>
                                <li>{t('step5')}</li>
                                <li>{t('step6')}</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('eidTitle')}</h2>
                            <p>{t('eidDesc')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('pricesTitle')}</h2>
                            <p>{t('pricesDesc')}</p>

                            <table className={styles.priceTable}>
                                <thead>
                                    <tr>
                                        <th>{t('weight')}</th>
                                        <th>{t('price')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>0 – 5</td>
                                        <td>49</td>
                                    </tr>
                                    <tr>
                                        <td>6 – 20</td>
                                        <td>60</td>
                                    </tr>
                                    <tr>
                                        <td>21 – 35</td>
                                        <td>75</td>
                                    </tr>
                                    <tr>
                                        <td>36 – 50</td>
                                        <td>120</td>
                                    </tr>
                                    <tr>
                                        <td>51 – 70</td>
                                        <td>140</td>
                                    </tr>
                                    <tr>
                                        <td>71 – 80</td>
                                        <td>160</td>
                                    </tr>
                                    <tr>
                                        <td>81 – 90</td>
                                        <td>180</td>
                                    </tr>
                                    <tr>
                                        <td>91 – 120</td>
                                        <td>220</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('cancelTitle')}</h2>
                            <p>{t('cancelDesc')}</p>
                        </section>

                        <section className={styles.section}>
                            <h2>{t('contactTitle')}</h2>
                            <p>{t('contactDesc')}</p>

                            <div className={styles.contactInfoBlock}>
                                <p><strong>{t('contactRequest')}</strong></p>
                                <p>{t('callLabel')}: <a href="tel:+97142882777">+971-42882777</a> / <a href="tel:+971501203917">050 120 3917</a></p>
                                <p>{t('emailLabel')}: <a href="mailto:admin@mariotkitchen.com">admin@mariotkitchen.com</a> / <a href="mailto:support@mariot-group.com">support@mariot-group.com</a></p>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
