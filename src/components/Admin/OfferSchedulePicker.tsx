'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarDays, ChevronDown } from 'lucide-react';
import styles from './OfferSchedulePicker.module.css';

interface Props {
    startStr: string;          // 'YYYY-MM-DDTHH:mm' (local) or ''
    endStr: string;
    onApply: (start: string, end: string) => void;
}

type Meridiem = 'AM' | 'PM';
interface TimeParts { h: number; m: number; ap: Meridiem; }

const pad = (n: number) => String(n).padStart(2, '0');
const parse = (s: string) => (s ? new Date(s) : null);
const toStr = (d: Date | null) =>
    d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : '';

const splitTime = (d: Date | null): TimeParts => {
    if (!d) return { h: 12, m: 0, ap: 'AM' };
    const hours = d.getHours();
    const ap: Meridiem = hours >= 12 ? 'PM' : 'AM';
    let h12 = hours % 12;
    if (h12 === 0) h12 = 12;
    return { h: h12, m: d.getMinutes(), ap };
};

const applyTime = (date: Date, t: TimeParts) => {
    const d = new Date(date);
    let h = t.h % 12;
    if (t.ap === 'PM') h += 12;
    d.setHours(h, t.m, 0, 0);
    return d;
};

const fmt = (d: Date | null) =>
    d
        ? `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
        : '—';

const NumSelect: React.FC<{ value: number; options: number[]; onChange: (v: number) => void }> = ({ value, options, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return (
        <div className={styles.numWrap} ref={ref}>
            <button type="button" className={styles.numBtn} onClick={() => setOpen(o => !o)}>
                {pad(value)} <ChevronDown size={14} />
            </button>
            {open && (
                <ul className={styles.numList}>
                    {options.map(v => (
                        <li key={v} className={v === value ? styles.numOn : ''} onClick={() => { onChange(v); setOpen(false); }}>
                            {pad(v)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const OfferSchedulePicker: React.FC<Props> = ({ startStr, endStr, onApply }) => {
    const [open, setOpen] = useState(false);
    const [range, setRange] = useState<[Date | null, Date | null]>([parse(startStr), parse(endStr)]);
    const [startT, setStartT] = useState<TimeParts>(splitTime(parse(startStr)));
    const [endT, setEndT] = useState<TimeParts>(splitTime(parse(endStr)));
    const [coords, setCoords] = useState<{ left: number; bottom: number }>({ left: 0, bottom: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Anchor the (portaled) panel above the trigger so the modal's overflow can't clip it.
    const PANEL_W = 740;
    const reposition = () => {
        const r = triggerRef.current?.getBoundingClientRect();
        if (!r) return;
        const left = Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8));
        setCoords({ left, bottom: window.innerHeight - r.top + 8 });
    };

    const toggle = () => {
        if (!open) reposition();
        setOpen((o) => !o);
    };

    // Re-sync local state if the form values change externally (e.g. opening another product).
    useEffect(() => {
        setRange([parse(startStr), parse(endStr)]);
        setStartT(splitTime(parse(startStr)));
        setEndT(splitTime(parse(endStr)));
    }, [startStr, endStr]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onScrollResize = () => reposition();
        document.addEventListener('mousedown', handler);
        window.addEventListener('resize', onScrollResize);
        window.addEventListener('scroll', onScrollResize, true);
        return () => {
            document.removeEventListener('mousedown', handler);
            window.removeEventListener('resize', onScrollResize);
            window.removeEventListener('scroll', onScrollResize, true);
        };
    }, [open]);

    const [s, e] = range;
    const startFull = s ? applyTime(s, startT) : null;
    const endFull = e ? applyTime(e, endT) : null;

    const save = () => {
        onApply(toStr(startFull), toStr(endFull));
        setOpen(false);
    };

    const TimeRow = ({ t, set }: { t: TimeParts; set: (v: TimeParts) => void }) => (
        <div className={styles.timeRow}>
            <NumSelect value={t.h} options={Array.from({ length: 12 }, (_, i) => i + 1)} onChange={(h) => set({ ...t, h })} />
            <span className={styles.colon}>:</span>
            <NumSelect value={t.m} options={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]} onChange={(m) => set({ ...t, m })} />
            <div className={styles.ampm}>
                <button type="button" className={t.ap === 'AM' ? styles.ampmOn : ''} onClick={() => set({ ...t, ap: 'AM' })}>AM</button>
                <button type="button" className={t.ap === 'PM' ? styles.ampmOn : ''} onClick={() => set({ ...t, ap: 'PM' })}>PM</button>
            </div>
        </div>
    );

    return (
        <div className={styles.wrap}>
            <button type="button" ref={triggerRef} className={styles.trigger} onClick={toggle}>
                <CalendarDays size={16} />
                <span>{startStr && endStr ? `${fmt(startFull)}  →  ${fmt(endFull)}` : 'Select offer schedule'}</span>
            </button>

            {open && createPortal(
                <div className={styles.panel} ref={panelRef} style={{ left: coords.left, bottom: coords.bottom }}>
                    <DatePicker
                        selectsRange
                        inline
                        monthsShown={2}
                        startDate={s || undefined}
                        endDate={e || undefined}
                        onChange={(dates: [Date | null, Date | null]) => setRange(dates)}
                        calendarClassName={styles.cal}
                    />

                    <div className={styles.timeBar}>
                        <TimeRow t={startT} set={setStartT} />
                        <span className={styles.to}>to</span>
                        <TimeRow t={endT} set={setEndT} />
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.selected}>
                            <b>SELECTED:</b> {fmt(startFull)} to {fmt(endFull)}
                        </div>
                        <button type="button" className={styles.save} onClick={save} disabled={!startFull || !endFull}>
                            SAVE
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default OfferSchedulePicker;
