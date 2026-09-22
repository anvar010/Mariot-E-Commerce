'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import { deliveryDateLabel, isExpressDelivery, normalizeDeliveryDays, timeUntilMidnight } from '@/utils/delivery';
import {
    DEFAULT_ZONE_CODE, DeliveryZone, FALLBACK_ZONES, findZone,
    getDeliveryZones, readStoredCountry, storeCountry, detectCountry } from '@/utils/deliveryZones';
import DeliveryCountrySelect from './DeliveryCountrySelect';
import styles from './DeliveryInformation.module.css';

interface DeliveryInformationProps {
    /** Days the admin set on the product. Blank/invalid falls back to the house default. */
    days?: number | string | null;
    locale?: string;
    /**
     * Suppresses the arrival date. An out-of-stock item has no restock date to work from,
     * so any date shown here would be a promise the business cannot keep.
     */
    outOfStock?: boolean;
}

// The storefront support line, same number as the rest of the site.
const SUPPORT_WHATSAPP = '97142882777';

/**
 * WhatsApp's glyph, inline.
 *
 * lucide-react carries no brand marks, and pulling in an icon pack for one logo is not
 * worth the bundle. `currentColor` lets the link's own colour drive it.
 */
const WhatsappIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.688 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
    </svg>
);

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
export default function DeliveryInformation({ days, locale = 'en', outOfStock = false }: DeliveryInformationProps) {
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
        (async () => {
            const list = await getDeliveryZones();
            if (cancelled) return;
            setZones(list);

            // A stored country that has since been removed or deactivated would leave
            // the selector showing a code with no matching row.
            const valid = (code: string) => list.some(z => z.country_code === code);
            if (stored && valid(stored)) {
                setCountry(stored);
                return;
            }

            // Nothing chosen before, so start from where the visitor actually is. Detection
            // never overrides a stored choice: a VPN or a roaming SIM reports the wrong
            // country often enough that the shopper's own pick has to win.
            const detected = await detectCountry();
            if (cancelled) return;
            setCountry(detected && valid(detected) ? detected : DEFAULT_ZONE_CODE);
        })();
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
                    <div className={styles.destinationRow}>
                        <MapPin size={15} className={styles.destinationIcon} />
                        <DeliveryCountrySelect
                            zones={zones}
                            value={country}
                            onChange={handleChange}
                            locale={locale}
                            label={t('deliverTo')}
                            // Each option carries its own arrival date, so the choice can be
                            // made from the list rather than by picking one and reading the
                            // line underneath. Out of stock there is no date to give, and
                            // dates in this list would contradict the message below it.
                            describeZone={outOfStock ? undefined : (z) => deliveryDateLabel(
                                normalizeDeliveryDays(baseDays + z.extra_days), locale)}
                        />
                    </div>
                )}

                {outOfStock ? (
                    // No arrival date and no cut-off countdown: neither means anything for an
                    // item that is not in stock. The destination selector above stays, since
                    // the shopper may still be choosing where they want it sent.
                    <div className={styles.outOfStockRow}>
                        <p className={styles.outOfStockText}>{t('deliveryOutOfStock')}</p>
                        <a
                            className={styles.whatsappLink}
                            href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <WhatsappIcon />
                            {t('deliveryContactWhatsapp')}
                        </a>
                    </div>
                ) : (
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
                )}
            </div>
        </section>
    );
}
