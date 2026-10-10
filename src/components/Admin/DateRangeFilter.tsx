'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import styles from './DateRangeFilter.module.css';

/** A date range as local calendar days, 'YYYY-MM-DD'. An empty `from` means no filter. */
export type DateRange = { from: string; to: string };

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmt = (s: string) => parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Whether a timestamp falls inside the range (inclusive of both whole days). */
export const inDateRange = (value: string | Date | null | undefined, range: DateRange): boolean => {
    if (!range.from) return true;
    if (!value) return false;
    const day = ymd(new Date(value));
    return day >= range.from && day <= (range.to || range.from);
};

const presets = (): { label: string; range: DateRange }[] => {
    const today = new Date();
    const t = ymd(today);
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return ymd(d); };
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return [
        { label: 'Today', range: { from: t, to: t } },
        { label: 'Yesterday', range: { from: daysAgo(1), to: daysAgo(1) } },
        { label: 'Last 7 days', range: { from: daysAgo(6), to: t } },
        { label: 'Last 30 days', range: { from: daysAgo(29), to: t } },
        { label: 'This month', range: { from: ymd(monthStart), to: t } },
        { label: 'Last month', range: { from: ymd(lastMonthStart), to: ymd(lastMonthEnd) } },
    ];
};

/**
 * A styled date-range picker for list filters.
 *
 * Not <input type="date">: its calendar is drawn by the browser or the phone and cannot be
 * styled, and it picks one day, not a range. This opens a panel of quick presets beside a
 * month calendar; tap a start day, then an end day.
 */
const DateRangeFilter = ({ value, onChange, placeholder = 'All dates' }: {
    value: DateRange;
    onChange: (range: DateRange) => void;
    placeholder?: string;
}) => {
    const [open, setOpen] = useState(false);
    // A range being picked: the start is set, the end not yet.
    const [draftStart, setDraftStart] = useState<string | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const [month, setMonth] = useState(() => {
        const base = value.from ? parse(value.from) : new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const ref = useRef<HTMLDivElement>(null);
    const today = ymd(new Date());

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

    // Each opening starts fresh, showing the month of the current selection.
    useEffect(() => {
        if (!open) return;
        setDraftStart(null);
        setHover(null);
        const base = value.from ? parse(value.from) : new Date();
        setMonth(new Date(base.getFullYear(), base.getMonth(), 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Monday-first weeks for the shown month, padded with empty cells.
    const cells = useMemo(() => {
        const first = new Date(month.getFullYear(), month.getMonth(), 1);
        const lead = (first.getDay() + 6) % 7;
        const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const out: (string | null)[] = Array(lead).fill(null);
        for (let d = 1; d <= days; d++) out.push(ymd(new Date(month.getFullYear(), month.getMonth(), d)));
        while (out.length % 7) out.push(null);
        return out;
    }, [month]);

    // What to highlight: the range being picked (start to the hovered day), else the value.
    const shown: DateRange | null = draftStart
        ? (() => {
            const end = hover || draftStart;
            return end < draftStart ? { from: end, to: draftStart } : { from: draftStart, to: end };
        })()
        : (value.from ? { from: value.from, to: value.to || value.from } : null);

    const pick = (day: string) => {
        if (!draftStart) { setDraftStart(day); return; }
        const range = day < draftStart ? { from: day, to: draftStart } : { from: draftStart, to: day };
        onChange(range);
        setDraftStart(null);
        setOpen(false);
    };

    const label = !value.from
        ? placeholder
        : (!value.to || value.to === value.from)
            ? fmt(value.from)
            : `${fmt(value.from)} – ${fmt(value.to)}`;

    const activePreset = presets().find(p => p.range.from === value.from && p.range.to === (value.to || value.from));

    return (
        <div className={styles.wrapper} ref={ref}>
            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${value.from ? styles.triggerSet : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <Calendar size={15} className={styles.icon} />
                <span className={styles.label}>{activePreset ? activePreset.label : label}</span>
                {value.from ? (
                    <span
                        role="button"
                        tabIndex={0}
                        className={styles.clear}
                        aria-label="Clear dates"
                        onClick={e => { e.stopPropagation(); onChange({ from: '', to: '' }); setOpen(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange({ from: '', to: '' }); } }}
                    >
                        <X size={14} />
                    </span>
                ) : (
                    <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
                )}
            </button>

            {open && (
                <div className={styles.panel} role="dialog" aria-label="Choose dates">
                    <div className={styles.presets}>
                        <button
                            type="button"
                            className={`${styles.preset} ${!value.from ? styles.presetActive : ''}`}
                            onClick={() => { onChange({ from: '', to: '' }); setOpen(false); }}
                        >
                            All dates
                        </button>
                        {presets().map(p => (
                            <button
                                key={p.label}
                                type="button"
                                className={`${styles.preset} ${activePreset?.label === p.label ? styles.presetActive : ''}`}
                                onClick={() => { onChange(p.range); setOpen(false); }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.calendar}>
                        <div className={styles.monthBar}>
                            <button type="button" className={styles.navBtn} aria-label="Previous month"
                                onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                                <ChevronLeft size={16} />
                            </button>
                            <span className={styles.monthLabel}>
                                {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                            </span>
                            <button type="button" className={styles.navBtn} aria-label="Next month"
                                onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div className={styles.grid}>
                            {WEEKDAYS.map(w => <span key={w} className={styles.weekday}>{w}</span>)}
                            {cells.map((day, i) => {
                                if (!day) return <span key={`e${i}`} />;
                                const isStart = !!shown && day === shown.from;
                                const isEnd = !!shown && day === shown.to;
                                const inRange = !!shown && day > shown.from && day < shown.to;
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        className={[
                                            styles.day,
                                            inRange ? styles.dayInRange : '',
                                            isStart || isEnd ? styles.daySelected : '',
                                            isStart && shown && shown.from !== shown.to ? styles.dayStart : '',
                                            isEnd && shown && shown.from !== shown.to ? styles.dayEnd : '',
                                            day === today ? styles.dayToday : '',
                                        ].join(' ')}
                                        onClick={() => pick(day)}
                                        onMouseEnter={() => draftStart && setHover(day)}
                                    >
                                        {Number(day.slice(8))}
                                    </button>
                                );
                            })}
                        </div>

                        <p className={styles.hint}>
                            {draftStart ? `From ${fmt(draftStart)} — now pick the end date` : 'Pick a start date'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
