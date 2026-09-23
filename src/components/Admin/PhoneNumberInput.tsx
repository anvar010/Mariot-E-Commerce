'use client';

/**
 * Phone field with a country dialling code in front of it.
 *
 * The stored value is one string -- "+971 501234567" -- because everything downstream
 * treats the phone as a single field: the quotation record, the PDF, and the customer
 * match that decides whether this is a returning customer.
 *
 * What the person types, though, is only the subscriber number. The code is shown once,
 * on the button, and the input holds the rest. Previously the input showed the whole
 * value, so choosing +966 and then typing produced a field reading "+966 509955446" next
 * to a button also reading "+966" -- the code stated twice, and easy to end up typed
 * twice.
 *
 * The country is still derived from the stored value rather than kept beside it, so a
 * number pasted in complete lands on the right country and the two cannot disagree.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { flagEmoji, flagImageSrc } from '@/utils/deliveryZones';
import { DIAL_COUNTRIES, DEFAULT_DIAL_COUNTRY, DialCountry, matchDialCountry } from '@/data/dialCountries';
import styles from './PhoneNumberInput.module.css';

const CountryFlag: React.FC<{ code: string }> = ({ code }) => {
    const src = flagImageSrc(code);
    const [failed, setFailed] = useState(false);
    // Emoji where we ship no image, and also when one fails to load, so the slot is never
    // empty. Windows draws no flag glyphs, which is why the images exist at all.
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

const PhoneNumberInput: React.FC<Props> = ({ value, onChange, placeholder = 'Phone number', className, id }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const matched = matchDialCountry(value);
    const active = matched || DEFAULT_DIAL_COUNTRY;

    // What the input shows: the value with its dialling code removed. A value that does
    // not start with a known code is shown whole, so a half-typed or unusual number is
    // never hidden from the person entering it.
    const subscriber = useMemo(() => {
        if (!matched) return value || '';
        return (value || '').trimStart().slice(matched.dial.length).trimStart();
    }, [value, matched]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return DIAL_COUNTRIES;
        // Matched on name and on code, with or without the +, so both "saudi" and "966"
        // find the same row.
        const bare = q.replace(/^\+/, '');
        return DIAL_COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(q) || c.dial.replace('+', '').startsWith(bare));
    }, [query]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // The list is long enough that it is unusable without typing, so the search field
    // takes focus as soon as it opens.
    useEffect(() => {
        if (open) searchRef.current?.focus();
        else setQuery('');
    }, [open]);

    const emit = (country: DialCountry, rest: string) => {
        const digits = rest.trim();
        onChange(digits ? `${country.dial} ${digits}` : country.dial);
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
                value={subscriber}
                onChange={e => emit(active, e.target.value)}
                // Numbers stay left-to-right even in an Arabic interface, or the digits
                // render in the wrong order.
                dir="ltr"
            />

            {open && (
                <div className={styles.menu}>
                    <div className={styles.searchRow}>
                        <Search size={14} className={styles.searchIcon} aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="text"
                            className={styles.search}
                            placeholder="Search country or code"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            aria-label="Search country or dialling code"
                        />
                    </div>
                    <ul className={styles.list} role="listbox" aria-label="Country dialling code">
                        {results.length === 0 && <li className={styles.noResult}>No match</li>}
                        {results.map(c => (
                            <li key={`${c.code}-${c.dial}`}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={c.code === active.code}
                                    className={`${styles.option} ${c.code === active.code ? styles.optionActive : ''}`}
                                    onClick={() => { emit(c, subscriber); setOpen(false); }}
                                >
                                    <CountryFlag code={c.code} />
                                    <span className={styles.optionName}>{c.name}</span>
                                    <span className={styles.optionDial}>{c.dial}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PhoneNumberInput;
