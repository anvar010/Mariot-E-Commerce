'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { deliveryDateLabel, isExpressDelivery, normalizeDeliveryDays, timeUntilMidnight } from '@/utils/delivery';
import styles from './DeliveryInformation.module.css';

interface DeliveryInformationProps {
    /** Days the admin set on the product. Blank/invalid falls back to the house default. */
    days?: number | string | null;
    locale?: string;
}

/**
 * "Get it Tomorrow / Get it by Tue, 12 Aug" with a countdown to the midnight cut-off.
 *
 * The countdown renders only after mount: a clock rendered on the server is stale before it
 * reaches the browser, and the server's timezone is not the shopper's, so hydrating it would
 * mismatch. The date line does render on the server (it matters for first paint and for
 * crawlers) and is marked suppressHydrationWarning for the same timezone reason.
 */
export default function DeliveryInformation({ days, locale = 'en' }: DeliveryInformationProps) {
    const t = useTranslations('product');
    const deliveryDays = normalizeDeliveryDays(days);
    const express = isExpressDelivery(deliveryDays);

    const [remaining, setRemaining] = useState<{ hours: number; minutes: number } | null>(null);

    useEffect(() => {
        const tick = () => setRemaining(timeUntilMidnight());
        tick();
        // A minute of drift is invisible on an hours-and-minutes counter; 30s keeps it honest
        // without waking the tab every second.
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, []);

    // The arrival itself is the bold part ("Get it **Tomorrow**"), so it needs rich text.
    const bold = (chunks: ReactNode) => <strong>{chunks}</strong>;
    const arrival = deliveryDays === 1
        ? t.rich('deliveryTomorrow', { b: bold })
        : t.rich('deliveryByDate', { b: bold, date: deliveryDateLabel(deliveryDays, locale) });

    return (
        <section className={styles.deliveryBlock} aria-label={t('deliveryInformation')}>
            <h3 className={styles.deliveryHeading}>{t('deliveryInformation')}</h3>

            <div className={styles.deliveryCard}>
                <div className={styles.deliveryMain}>
                    {express && <span className={styles.expressBadge}>{t('deliveryExpress')}</span>}
                    <span className={styles.deliveryText} suppressHydrationWarning>{arrival}</span>
                </div>

                {remaining && (
                    <span className={styles.deliveryCountdown} suppressHydrationWarning>
                        {t('deliveryOrderIn', { hours: remaining.hours, minutes: remaining.minutes })}
                    </span>
                )}
            </div>
        </section>
    );
}
