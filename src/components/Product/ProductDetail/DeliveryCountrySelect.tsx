'use client';

/**
 * Destination picker for the delivery estimate.
 *
 * A custom listbox rather than a <select>, because a native option list is drawn
 * by the operating system: it cannot be styled and it cannot hold a flag. This
 * reimplements what the native control gave us for free — keyboard navigation,
 * type-ahead, click-outside, the correct ARIA roles — which is the price of that
 * choice and worth paying only because the flags and the per-country arrival
 * dates make the list genuinely easier to read.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { DeliveryZone, flagEmoji, flagImageSrc, zoneLabel } from '@/utils/deliveryZones';
import styles from './DeliveryCountrySelect.module.css';

/**
 * Flag for a zone.
 *
 * An image where we ship one, because Windows renders no flag emoji and a
 * Windows shopper would otherwise see the bare country letters. Emoji covers
 * anything the admin adds that has no file, and also catches an image that
 * fails to load, so the slot is never empty.
 */
const ZoneFlag: React.FC<{ code: string; className?: string }> = ({ code, className }) => {
    const src = flagImageSrc(code);
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return <span className={className} aria-hidden="true">{flagEmoji(code)}</span>;
    }
    return (
        <img
            src={src}
            alt=""
            aria-hidden="true"
            className={className}
            width={22}
            height={16}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
};

interface Props {
    zones: DeliveryZone[];
    value: string;
    onChange: (code: string) => void;
    locale: string;
    label: string;
    /** Arrival label for a given zone, shown beside each option. */
    describeZone?: (zone: DeliveryZone) => string;
}

const DeliveryCountrySelect: React.FC<Props> = ({ zones, value, onChange, locale, label, describeZone }) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const typeahead = useRef({ buffer: '', at: 0 });

    const selectedIndex = Math.max(0, zones.findIndex(z => z.country_code === value));
    const selected = zones[selectedIndex];

    useEffect(() => {
        if (!open) return;
        // Closing on scroll rather than repositioning: the panel is anchored to a
        // control inside a sticky column, and a detached menu is worse than none.
        const onScroll = () => setOpen(false);
        window.addEventListener('scroll', onScroll, true);
        return () => window.removeEventListener('scroll', onScroll, true);
    }, [open]);

    // Open onto the current selection, and keep the highlighted row in view.
    useLayoutEffect(() => {
        if (!open) return;
        setActiveIndex(selectedIndex);
    }, [open, selectedIndex]);

    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
            ?.scrollIntoView({ block: 'nearest' });
    }, [open, activeIndex]);

    const commit = (index: number) => {
        const zone = zones[index];
        if (zone) onChange(zone.country_code);
        setOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                setOpen(false);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                commit(activeIndex);
                break;
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(i => (i + 1) % zones.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(i => (i - 1 + zones.length) % zones.length);
                break;
            case 'Home':
                e.preventDefault();
                setActiveIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setActiveIndex(zones.length - 1);
                break;
            default: {
                // Type-ahead. Letters typed within a second of each other build a
                // prefix, the way a native select behaves.
                if (e.key.length !== 1) return;
                const now = Date.now();
                const t = typeahead.current;
                t.buffer = now - t.at < 1000 ? t.buffer + e.key : e.key;
                t.at = now;
                const match = zones.findIndex(z =>
                    zoneLabel(z, locale).toLowerCase().startsWith(t.buffer.toLowerCase()));
                if (match >= 0) setActiveIndex(match);
            }
        }
    };

    if (zones.length === 0) return null;

    return (
        <div className={styles.root} ref={rootRef}>
            <span className={styles.label}>{label}</span>

            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                onClick={() => setOpen(o => !o)}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`${label}: ${selected ? zoneLabel(selected, locale) : ''}`}
            >
                {selected
                    ? <ZoneFlag code={selected.country_code} className={styles.flag} />
                    : <span className={styles.flag} aria-hidden="true">🌍</span>}
                <span className={styles.triggerName}>
                    {selected ? zoneLabel(selected, locale) : ''}
                </span>
                <ChevronDown size={15} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
            </button>

            {/* A backdrop rather than a document listener. Dismissing by clicking
                elsewhere used to let that same click reach the page underneath, so
                tapping away from the menu could add something to the cart. The
                backdrop swallows it: one click closes the menu and does nothing
                else. */}
            {open && (
                <div
                    className={styles.backdrop}
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            {open && (
                <ul
                    className={styles.panel}
                    role="listbox"
                    ref={listRef}
                    tabIndex={-1}
                    aria-activedescendant={`zone-opt-${activeIndex}`}
                >
                    {zones.map((zone, i) => {
                        const isSelected = zone.country_code === value;
                        return (
                            <li
                                key={zone.country_code}
                                id={`zone-opt-${i}`}
                                role="option"
                                aria-selected={isSelected}
                                data-active={i === activeIndex}
                                className={`${styles.option} ${i === activeIndex ? styles.optionActive : ''} ${isSelected ? styles.optionSelected : ''}`}
                                onMouseEnter={() => setActiveIndex(i)}
                                // click, not pointerdown. Committing on pointerdown unmounted
                                // the panel before the click finished, so the click landed on
                                // whatever was underneath — Add to Cart, Talk to Expert — and
                                // fired that instead. The panel now survives the whole
                                // press-and-release, and nothing behind it is ever the target.
                                onClick={() => commit(i)}
                            >
                                <ZoneFlag code={zone.country_code} className={styles.flag} />
                                <span className={styles.optionName}>{zoneLabel(zone, locale)}</span>
                                {describeZone && (
                                    <span className={styles.optionMeta}>{describeZone(zone)}</span>
                                )}
                                <span className={styles.tick}>{isSelected && <Check size={15} />}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default DeliveryCountrySelect;
