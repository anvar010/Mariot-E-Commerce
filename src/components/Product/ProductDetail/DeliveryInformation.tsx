'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, MapPin } from 'lucide-react';
import { deliveryDateLabel, isExpressDelivery, normalizeDeliveryDays, timeUntilMidnight } from '@/utils/delivery';
import {
    DEFAULT_ZONE_CODE, DeliveryZone, FALLBACK_ZONES, findZone,
    getDeliveryZones, readStoredCountry, storeCountry, zoneLabel,
} from '@/utils/deliveryZones';
import styles from './DeliveryInformation.module.css';

interface DeliveryInformationProps {
    /** Days the admin set on the product. Blank/invalid falls back to the house default. */
    days?: number | string | null;
    locale?: string;
}

/**
 * "Get it Tomorrow / Get it by Tue, 12 Aug" with a countdown to the midnight cut-off,
 * for the destination the shopper picks.
 *
 * The product's days figure is the UAE promise; every other destination adds its zone's
 * offset on top. The chosen country is remembered, so it carries from product to product.
 *
 * What renders where matters here. Product pages are cached, so a country-specific date
 * baked into that HTML would serve the first visitor's country to everyone — a Saudi
 * shopper seeing a UAE date is a promise the business cannot keep. The server therefore
 * always renders the default-zone date (right for most visitors, and what crawlers should
 * index), and the selected country is applied after mount. Same reasoning as the countdown,
 * which cannot be server-rendered because the server's clock and timezone are not the
 * shopper's.
 */
export default function DeliveryInformation({ days, locale = 'en' }: DeliveryInformationProps) {
    const t = useTranslations('product');
    const baseDays = normalizeDeliveryDays(days);

    const [zones, setZones] = useState<DeliveryZone[]>(FALLBACK_ZONES);
    const [country, setCountry] = useState<string>(DEFAULT_ZONE_CODE);
    const [mounted, setMounted] = useState(false);
    const [remaining, setRemaining] = useState<{ hours: number; minutes: number } | null>(null);

    useEffect(() => {
        setMounted(true);
        const stored = readStoredCountry();
        if (stored) setCountry(stored);

        let cancelled = false;
        getDeliveryZones().then(list => {
            if (cancelled) return;
            setZones(list);
            // A stored country that has since been removed or deactivated would leave
            // the selector showing a code with no matching row.
            setCountry(current => (list.some(z => z.country_code === current) ? current : DEFAULT_ZONE_CODE));
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const tick = () => setRemaining(timeUntilMidnight());
        tick();
        // A minute of drift is invisible on an hours-and-minutes counter; 30s keeps it honest
        // without waking the tab every second.
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, []);

    const handleChange = (code: string) => {
        setCountry(code);
        storeCountry(code);
    };

    // Before mount the server's markup stands, which is always the default zone.
    const activeZone = mounted ? findZone(zones, country) : undefined;
    const totalDays = normalizeDeliveryDays(baseDays + (activeZone?.extra_days ?? 0));
    const express = isExpressDelivery(totalDays);

    // The arrival itself is the bold part ("Get it **Tomorrow**"), so it needs rich text.
    const bold = (chunks: ReactNode) => <strong>{chunks}</strong>;
    const arrival = totalDays === 1
        ? t.rich('deliveryTomorrow', { b: bold })
        : t.rich('deliveryByDate', { b: bold, date: deliveryDateLabel(totalDays, locale) });

    return (
        <section className={styles.deliveryBlock} aria-label={t('deliveryInformation')}>
            <h3 className={styles.deliveryHeading}>{t('deliveryInformation')}</h3>

            <div className={styles.deliveryCard}>
                {/* One zone means nothing to choose between, so the control is not offered. */}
                {zones.length > 1 && (
                    <label className={styles.destinationRow}>
                        <MapPin size={15} className={styles.destinationIcon} />
                        <span className={styles.destinationLabel}>{t('deliverTo')}</span>
                        <span className={styles.destinationSelectWrap}>
                            <select
                                className={styles.destinationSelect}
                                value={country}
                                onChange={(e) => handleChange(e.target.value)}
                                aria-label={t('deliverTo')}
                            >
                                {zones.map(z => (
                                    <option key={z.country_code} value={z.country_code}>
                                        {zoneLabel(z, locale)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={15} className={styles.destinationChevron} aria-hidden="true" />
                        </span>
                    </label>
                )}

                <div className={styles.deliveryRow}>
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
            </div>
        </section>
    );
}
