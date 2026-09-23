'use client';

/**
 * Phone field with a country dialling code in front of it.
 *
 * The field stores one string -- "+971 50 123 4567" -- rather than a code and a number
 * kept apart. Everything downstream (the quotation record, the PDF, the customer match
 * that looks a shopper up by phone) already treats the phone as a single value, and
 * splitting it here would mean every one of those had to be taught to join it back
 * together.
 *
 * So the selector is a writing aid: picking a country swaps the leading code and leaves
 * the digits alone. Typing a full international number by hand still works, and the
 * selector follows along, because the code is read back out of the value.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { flagEmoji, flagImageSrc } from '@/utils/deliveryZones';
import styles from './PhoneNumberInput.module.css';

export interface DialCountry {
    code: string;
    dial: string;
    name: string;
}

/**
 * The GCC first, since that is where the customers are, then the rest of the common
 * destinations. Ordered deliberately rather than alphabetically: a Dubai clerk should
 * find the UAE without scrolling.
 */
export const DIAL_COUNTRIES: DialCountry[] = [
    { code: 'AE', dial: '+971', name: 'United Arab Emirates' },
    { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
    { code: 'KW', dial: '+965', name: 'Kuwait' },
    { code: 'QA', dial: '+974', name: 'Qatar' },
    { code: 'BH', dial: '+973', name: 'Bahrain' },
    { code: 'OM', dial: '+968', name: 'Oman' },
    { code: 'IN', dial: '+91', name: 'India' },
    { code: 'PK', dial: '+92', name: 'Pakistan' },
    { code: 'GB', dial: '+44', name: 'United Kingdom' },
    { code: 'US', dial: '+1', name: 'United States' },
    { code: 'EG', dial: '+20', name: 'Egypt' },
    { code: 'JO', dial: '+962', name: 'Jordan' },
    { code: 'LB', dial: '+961', name: 'Lebanon' },
    { code: 'TR', dial: '+90', name: 'Türkiye' },
];

const DEFAULT_COUNTRY = DIAL_COUNTRIES[0];

/**
 * Longest dialling code that prefixes the value.
 *
 * Longest-first matters: +97 is not a country but +971 and +974 both start with it, and
 * +1 would otherwise claim every code beginning with a one.
 */
const matchCountry = (value: string): DialCountry | null => {
    const v = (value || '').replace(/[\s-]/g, '');
    let best: DialCountry | null = null;
    for (const c of DIAL_COUNTRIES) {
        if (v.startsWith(c.dial) && (!best || c.dial.length > best.dial.length)) best = c;
    }
    return best;
};

/** The number without its dialling code, so the code can be swapped without losing it. */
const stripDial = (value: string, country: DialCountry | null): string => {
    if (!country) return value || '';
    const trimmed = (value || '').trimStart();
    return trimmed.startsWith(country.dial) ? trimmed.slice(country.dial.length).trimStart() : trimmed;
};

const CountryFlag: React.FC<{ code: string }> = ({ code }) => {
    const src = flagImageSrc(code);
    const [failed, setFailed] = useState(false);
    // Emoji where we ship no file, and also when one fails to load, so the slot is
    // never empty. Windows draws no flag glyphs, which is why files exist at all.
    if (!src || failed) return <span className={styles.flagEmoji} aria-hidden="true">{flagEmoji(code)}</span>;
    return (
        <img src={src} alt="" aria-hidden="true" className={styles.flagImg} width={20} height={14}
            loading="lazy" decoding="async" onError={() => setFailed(true)} />
    );
};

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
}

const PhoneNumberInput: React.FC<Props> = ({ value, onChange, placeholder = 'Phone', className, id }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Derived from the value, never held separately: typing "+966..." by hand has to move
    // the selector too, and a second source of truth would let the two disagree.
    const matched = matchCountry(value);
    const active = matched || DEFAULT_COUNTRY;

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const pick = (c: DialCountry) => {
        const rest = stripDial(value, matched);
        // Leaves a trailing space so the caret lands where the digits go.
        onChange(rest ? `${c.dial} ${rest}` : `${c.dial} `);
        setOpen(false);
    };

    return (
        <div className={`${styles.root} ${className || ''}`} ref={rootRef}>
            <button
                type="button"
                className={styles.codeBtn}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Country code: ${active.name} ${active.dial}`}
            >
                <CountryFlag code={active.code} />
                <span className={styles.dial}>{active.dial}</span>
                <ChevronDown size={13} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
            </button>

            <input
                id={id}
                type="tel"
                className={styles.input}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                // Numbers stay left-to-right even in an Arabic interface, or the code and
                // the digits render in the wrong order.
                dir="ltr"
            />

            {open && (
                <ul className={styles.menu} role="listbox" aria-label="Country dialling code">
                    {DIAL_COUNTRIES.map(c => (
                        <li key={c.code}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={c.code === active.code}
                                className={`${styles.option} ${c.code === active.code ? styles.optionActive : ''}`}
                                onClick={() => pick(c)}
                            >
                                <CountryFlag code={c.code} />
                                <span className={styles.optionName}>{c.name}</span>
                                <span className={styles.optionDial}>{c.dial}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PhoneNumberInput;
