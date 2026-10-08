'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './FilterDropdown.module.css';

export type FilterOption = { value: string; label: string };

/**
 * A list-page filter that looks the same on every platform.
 *
 * Replaces the native <select> used for the status/role filters: its open list is drawn
 * by the operating system, so it came up as a plain blue system menu that no CSS can
 * reach. This keeps the same contract -- a value and a change handler -- so swapping
 * one in is a one-line change at the call site.
 */
const FilterDropdown = ({ value, onChange, options, icon, ariaLabel, align = 'end' }: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    /** Optional leading icon in the trigger. */
    icon?: React.ReactNode;
    ariaLabel: string;
    /** Which edge of the trigger the menu lines up with. */
    align?: 'start' | 'end';
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find(o => o.value === value) || options[0];

    // Closes on a click anywhere else, and on Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const choose = (v: string) => {
        onChange(v);
        setOpen(false);
    };

    return (
        <div className={styles.wrapper} ref={ref}>
            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
            >
                {icon && <span className={styles.icon}>{icon}</span>}
                <span className={styles.label}>{current?.label}</span>
                <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
            </button>
            {open && (
                <ul className={`${styles.menu} ${align === 'start' ? styles.menuStart : styles.menuEnd}`} role="listbox" aria-label={ariaLabel}>
                    {options.map(o => {
                        const selected = o.value === current?.value;
                        return (
                            <li key={o.value} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                                    onClick={() => choose(o.value)}
                                >
                                    <span>{o.label}</span>
                                    {selected && <Check size={15} />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default FilterDropdown;
