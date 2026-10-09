'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import styles from './FilterDropdown.module.css';

export type FilterOption = { value: string; label: string };

/** A label without the tree indent (non-breaking spaces and the └ marker) used for categories. */
const plainLabel = (label: string) => label.replace(/^[\s └]+/, '');

/**
 * A list-page filter that looks the same on every platform.
 *
 * Replaces the native <select> used for the status/role filters: its open list is drawn
 * by the operating system, so it came up as a plain blue system menu that no CSS can
 * reach. This keeps the same contract -- a value and a change handler -- so swapping
 * one in is a one-line change at the call site.
 *
 * For long lists (a hundred brands, a category tree) pass `searchable`: a search box
 * sits above the options and the list scrolls within a fixed height.
 */
const FilterDropdown = ({ value, onChange, options, icon, ariaLabel, align = 'end', searchable = false, searchPlaceholder = 'Search…', fullWidth = false }: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    /** Optional leading icon in the trigger. */
    icon?: React.ReactNode;
    ariaLabel: string;
    /** Which edge of the trigger the menu lines up with. */
    align?: 'start' | 'end';
    /** Adds a search box above the options. */
    searchable?: boolean;
    searchPlaceholder?: string;
    /** Trigger and menu span the full width of the container. */
    fullWidth?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
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

    // A fresh search each time the list opens, with the cursor already in the box.
    useEffect(() => {
        if (!open) return;
        setQuery('');
        if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    }, [open, searchable]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(o => plainLabel(o.label).toLowerCase().includes(q));
    }, [options, query]);

    const choose = (v: string) => {
        onChange(v);
        setOpen(false);
    };

    return (
        <div className={`${styles.wrapper} ${fullWidth ? styles.wrapperFull : ''}`} ref={ref}>
            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
            >
                {icon && <span className={styles.icon}>{icon}</span>}
                {/* The closed control shows the plain name, not the tree indent. */}
                <span className={styles.label}>{current ? plainLabel(current.label) : ''}</span>
                <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
            </button>
            {open && (
                <div className={`${styles.menu} ${fullWidth ? styles.menuFull : (align === 'start' ? styles.menuStart : styles.menuEnd)}`}>
                    {searchable && (
                        <div className={styles.searchRow}>
                            <Search size={14} />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                aria-label={searchPlaceholder}
                            />
                        </div>
                    )}
                    <ul className={`${styles.list} ${searchable ? styles.listScroll : ''}`} role="listbox" aria-label={ariaLabel}>
                        {visible.length === 0 && <li className={styles.noMatch}>No matches</li>}
                        {visible.map(o => {
                            const selected = o.value === current?.value;
                            return (
                                <li key={o.value} role="option" aria-selected={selected}>
                                    <button
                                        type="button"
                                        className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                                        onClick={() => choose(o.value)}
                                    >
                                        {/* While searching, the tree indent is dropped: matches from
                                            different branches would otherwise sit at odd depths. */}
                                        <span className={styles.optionLabel}>{query ? plainLabel(o.label) : o.label}</span>
                                        {selected && <Check size={15} />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FilterDropdown;
