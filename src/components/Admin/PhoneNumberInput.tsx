'use client';

/**
 * Phone field with a country dialling code in front of it.
 *
 * Validation is delegated to libphonenumber-js, Google's libphonenumber ported to
 * JavaScript, rather than a digit count of our own. Every country has its own rules --
 * the UAE takes 9 subscriber digits, India 10, the UK 10 -- and several have more than
 * one valid length depending on the prefix. A fixed limit is wrong somewhere the moment
 * the list grows past one country, and the list here is every country.
 *
 * The stored value is the international form, "+971501234567", because that is the one
 * spelling that means the same thing everywhere, and the customer match compares numbers
 * across countries. The field shows the national part only: the code is already on the
 * button, and repeating it in the box is how it ended up typed twice.
 *
 * A leading zero is the national trunk prefix. It is correct when dialling inside a
 * country and meaningless with a country code, so 0501234567 and 501234567 are the same
 * UAE line and both normalise to +971501234567.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, AlertCircle } from 'lucide-react';
import { parsePhoneNumberFromString, getExampleNumber, type CountryCode } from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';
import { flagEmoji, flagImageSrc } from '@/utils/deliveryZones';
import { DIAL_COUNTRIES, DEFAULT_DIAL_COUNTRY, DialCountry, matchDialCountry } from '@/data/dialCountries';
import styles from './PhoneNumberInput.module.css';

/**
 * A country's flag.
 *
 * Local images for the six GCC countries, flagcdn for the rest -- the same source the
 * contact page's picker uses. Emoji only as a last resort: Windows draws nothing for
 * regional-indicator pairs, so a list relying on them appears to have no flags at all.
 */
const CountryFlag: React.FC<{ code: string }> = ({ code }) => {
    const local = flagImageSrc(code);
    const [remoteFailed, setRemoteFailed] = useState(false);
    const [localFailed, setLocalFailed] = useState(false);

    const src = (local && !localFailed)
        ? local
        : (remoteFailed ? null : `https://flagcdn.com/40x30/${code.toLowerCase()}.png`);

    if (!src) return <span className={styles.flagEmoji} aria-hidden="true">{flagEmoji(code)}</span>;

    return (
        <img
            src={src} alt="" aria-hidden="true" className={styles.flagImg}
            width={20} height={14} loading="lazy" decoding="async"
            onError={() => { if (local && !localFailed) setLocalFailed(true); else setRemoteFailed(true); }}
        />
    );
};

/** The national number an example mobile for this country uses, for the placeholder. */
const placeholderFor = (iso: string): string => {
    try {
        const ex = getExampleNumber(iso as CountryCode, examples as any);
        return ex ? ex.nationalNumber : 'Phone number';
    } catch {
        return 'Phone number';
    }
};

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    /** Reports whether the current number is a valid one for the chosen country. */
    onValidityChange?: (valid: boolean) => void;
}

const PhoneNumberInput: React.FC<Props> = ({ value, onChange, className, id, onValidityChange }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    // Errors appear once the field has been left or a send is attempted, not while the
    // first digit is still being typed -- every number is invalid halfway through.
    const [touched, setTouched] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const matched = matchDialCountry(value);
    const active = matched || DEFAULT_DIAL_COUNTRY;

    // What the input shows: the value with its dialling code removed. A value not
    // starting with a known code is shown whole, so a pasted or unusual number is never
    // hidden from the person entering it.
    const national = useMemo(() => {
        if (!matched) return value || '';
        return (value || '').trimStart().slice(matched.dial.length).trimStart();
    }, [value, matched]);

    const parsed = useMemo(() => {
        const digits = national.replace(/\D/g, '');
        if (!digits) return null;
        try {
            return parsePhoneNumberFromString(digits, active.code as CountryCode) || null;
        } catch {
            return null;
        }
    }, [national, active.code]);

    const isValid = !!parsed?.isValid();
    const isEmpty = national.replace(/\D/g, '').length === 0;

    useEffect(() => { onValidityChange?.(isEmpty || isValid); }, [isEmpty, isValid, onValidityChange]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return DIAL_COUNTRIES;
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

    useEffect(() => {
        if (open) searchRef.current?.focus();
        else setQuery('');
    }, [open]);

    /**
     * Writes the value back in international form.
     *
     * Only digits survive: spaces and dashes are how people write numbers, not part of
     * them, and letters are never valid. The leading zero goes with them once a country
     * code is present, since the two never appear together in a real international
     * number.
     */
    const emit = (country: DialCountry, raw: string) => {
        const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
        onChange(digits ? `${country.dial}${digits}` : country.dial);
    };

    const error = touched && !isEmpty && !isValid
        ? (parsed
            // libphonenumber distinguishes "not a number at all" from "the right shape,
            // wrong length", and the second is the one worth stating precisely.
            ? `Enter a valid ${active.name} number, for example ${placeholderFor(active.code)}`
            : `That is not a valid ${active.name} number`)
        : null;

    return (
        <div className={`${styles.root} ${className || ''}`} ref={rootRef}>
            <div className={`${styles.control} ${error ? styles.controlError : ''}`}>
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
                    inputMode="numeric"
                    className={styles.input}
                    placeholder={placeholderFor(active.code)}
                    value={national}
                    onChange={e => emit(active, e.target.value)}
                    onBlur={() => setTouched(true)}
                    aria-invalid={!!error}
                    // Numbers stay left-to-right even in an Arabic interface, or the
                    // digits render in the wrong order.
                    dir="ltr"
                />
            </div>

            {error && (
                <p className={styles.error}><AlertCircle size={12} /> {error}</p>
            )}

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
                                    // Re-emitted under the new country so the stored value
                                    // carries the new code, and the length rule that judges
                                    // it changes with it.
                                    onClick={() => { emit(c, national); setOpen(false); }}
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
