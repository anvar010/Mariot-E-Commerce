'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminStaffQuotations.module.css';
import { X, Search, Loader2, Package, Percent, Check, AlertTriangle } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { resolveUrl } from '@/utils/resolveUrl';

type Props = { onClose: () => void };

// Admin-only screen for setting the per-product ceiling that staff cannot exceed
// when discounting a quotation line. This is the ONLY place the cap is edited —
// the product form deliberately does not carry the field, so a routine product
// save can never silently clear a limit set here.
const DiscountLimitsModal: React.FC<Props> = ({ onClose }) => {
    const { showNotification } = useNotification();

    const [query, setQuery] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [cappedOnly, setCappedOnly] = useState(false);
    const [edits, setEdits] = useState<Record<number, string>>({});
    const [savingId, setSavingId] = useState<number | null>(null);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [bulkValue, setBulkValue] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    // Whole-quotation ceiling, stored in the shared settings table rather than on
    // any product, since it applies across every line.
    const [capPct, setCapPct] = useState('20');
    const [capSaving, setCapSaving] = useState(false);

    const load = useCallback(async (search: string) => {
        setLoading(true);
        try {
            const qs = search.trim() ? `search=${encodeURIComponent(search.trim())}&limit=40` : 'limit=40&sort=newest';
            const res = await fetch(`${API_BASE_URL}/products?${qs}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            setProducts(data.success ? (data.data || []) : []);
        } catch {
            showNotification('Could not load products', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => { load(''); }, [load]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    const pct = data.data?.staff_quotation_max_discount_pct;
                    setCapPct(pct !== undefined && pct !== null && pct !== '' ? String(pct) : '20');
                }
            } catch { /* leave the control at its defaults */ }
        })();
    }, []);

    const saveCap = async () => {
        const n = Number(capPct);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
            showNotification('Enter a percentage between 0 and 100', 'error');
            return;
        }
        setCapSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: { staff_quotation_max_discount_pct: String(n) },
                }),
            });
            const data = await res.json();
            showNotification(data.success ? 'Approval threshold saved' : (data.message || 'Failed to save'),
                data.success ? 'success' : 'error');
        } catch {
            showNotification('Failed to save', 'error');
        } finally {
            setCapSaving(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => { load(query); }, 350);
        return () => clearTimeout(t);
    }, [query, load]);

    const capOf = (p: any) =>
        p.max_staff_discount_pct === null || p.max_staff_discount_pct === undefined
            ? '' : String(p.max_staff_discount_pct);

    const valueFor = (p: any) => (edits[p.id] !== undefined ? edits[p.id] : capOf(p));

    // Blank must persist as NULL ("no limit"); 0 is a real value meaning "no
    // discount allowed", so the two can never be collapsed into one.
    const toPayload = (raw: string) => (String(raw).trim() === '' ? null : Number(raw));

    const saveOne = async (p: any) => {
        const raw = valueFor(p);
        if (raw !== '' && (Number(raw) < 0 || Number(raw) > 100)) {
            showNotification('Enter a percentage between 0 and 100', 'error');
            return;
        }
        setSavingId(p.id);
        try {
            const res = await fetch(`${API_BASE_URL}/products/bulk-update`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [p.id], data: { max_staff_discount_pct: toPayload(raw) } }),
            });
            const data = await res.json();
            if (data.success !== false) {
                setProducts(prev => prev.map(x => x.id === p.id ? { ...x, max_staff_discount_pct: toPayload(raw) } : x));
                setEdits(prev => { const n = { ...prev }; delete n[p.id]; return n; });
                showNotification(`Limit saved for ${p.name}`);
            } else {
                showNotification(data.message || 'Failed to save', 'error');
            }
        } catch {
            showNotification('Failed to save', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const applyBulk = async () => {
        if (selected.size === 0) { showNotification('Select at least one product', 'error'); return; }
        if (bulkValue !== '' && (Number(bulkValue) < 0 || Number(bulkValue) > 100)) {
            showNotification('Enter a percentage between 0 and 100', 'error');
            return;
        }
        setBulkSaving(true);
        try {
            const ids = [...selected];
            const res = await fetch(`${API_BASE_URL}/products/bulk-update`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, data: { max_staff_discount_pct: toPayload(bulkValue) } }),
            });
            const data = await res.json();
            if (data.success !== false) {
                const v = toPayload(bulkValue);
                setProducts(prev => prev.map(x => selected.has(x.id) ? { ...x, max_staff_discount_pct: v } : x));
                setSelected(new Set());
                setBulkValue('');
                showNotification(`Limit applied to ${ids.length} product${ids.length > 1 ? 's' : ''}`);
            } else {
                showNotification(data.message || 'Failed to apply', 'error');
            }
        } catch {
            showNotification('Failed to apply', 'error');
        } finally {
            setBulkSaving(false);
        }
    };

    const toggle = (id: number) => {
        setSelected(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const visible = cappedOnly
        ? products.filter(p => p.max_staff_discount_pct !== null && p.max_staff_discount_pct !== undefined)
        : products;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} style={{ maxWidth: '860px' }} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2><Percent size={17} style={{ verticalAlign: '-2px', marginRight: 6 }} />Staff Discount Limits</h2>
                    <button onClick={onClose}><X size={18} /></button>
                </div>

                <div className={styles.modalBody}>
                    <p className={styles.hint} style={{ margin: '0 0 14px' }}>
                        Sets the most a staff member may discount each product on a quotation.
                        Leave blank for no limit; enter 0 to block discounting entirely. Admins are never restricted.
                    </p>

                    <div className={styles.capBox}>
                        <label className={styles.capToggle}>
                            <AlertTriangle size={13} /> Maximum discount before approval is required
                        </label>
                        <div className={styles.capFields}>
                            <input
                                type="number" min={0} max={100} step="0.5"
                                className={styles.numInput}
                                style={{ width: '110px' }}
                                value={capPct}
                                onChange={e => setCapPct(e.target.value)}
                            />
                            <span className={styles.capNote}>
                                A staff quotation whose total discount is at or below this share of the
                                subtotal is approved automatically and can be downloaded straight away.
                                Above it, an admin has to sign it off. Set 0 to review everything, 100 to
                                review nothing. Per-product limits below are separate and still cap each line.
                            </span>
                        </div>
                        <button className={styles.saveCell} onClick={saveCap} disabled={capSaving}>
                            {capSaving ? <Loader2 size={14} className={styles.spin} /> : 'Save threshold'}
                        </button>
                    </div>

                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search products by name or model…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {loading && <Loader2 size={16} className={styles.spin} />}
                    </div>

                    <label className={styles.filterRow}>
                        <input type="checkbox" checked={cappedOnly} onChange={e => setCappedOnly(e.target.checked)} />
                        Show only products that already have a limit
                    </label>

                    {selected.size > 0 && (
                        <div className={styles.bulkBar}>
                            <span>{selected.size} selected</span>
                            <input
                                type="number" min={0} max={100} step="0.5"
                                placeholder="No limit"
                                className={styles.numInput}
                                value={bulkValue}
                                onChange={e => setBulkValue(e.target.value)}
                            />
                            <button className={styles.bulkApply} onClick={applyBulk} disabled={bulkSaving}>
                                {bulkSaving ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}
                                Apply to selected
                            </button>
                            <button className={styles.bulkClear} onClick={() => setSelected(new Set())}>Clear</button>
                        </div>
                    )}

                    <div className={styles.linesTableWrap}>
                        <table className={styles.linesTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: 30 }} />
                                    <th>Product</th>
                                    <th>Price</th>
                                    <th>Max discount %</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 ? (
                                    <tr><td colSpan={5} className={styles.emptyCell}>
                                        {loading ? 'Loading…' : 'No products match.'}
                                    </td></tr>
                                ) : visible.map(p => {
                                    const dirty = edits[p.id] !== undefined && edits[p.id] !== capOf(p);
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                                            </td>
                                            <td>
                                                <div className={styles.limitRow}>
                                                    {p.primary_image
                                                        ? <img src={resolveUrl(p.primary_image)} alt="" className={styles.resultImg} />
                                                        : <div className={styles.resultImgPlaceholder}><Package size={15} /></div>}
                                                    <div>
                                                        <div className={styles.lineName}>{p.name}</div>
                                                        <div className={styles.lineMeta}>{p.brand_name || '—'}{p.model ? ` · ${p.model}` : ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles.lineMeta}>{Number(p.price) > 0 ? Number(p.price).toFixed(2) : '—'}</td>
                                            <td>
                                                <input
                                                    type="number" min={0} max={100} step="0.5"
                                                    placeholder="No limit"
                                                    className={styles.numInput}
                                                    value={valueFor(p)}
                                                    onChange={e => setEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className={styles.saveCell}
                                                    onClick={() => saveOne(p)}
                                                    disabled={!dirty || savingId === p.id}
                                                    title={dirty ? 'Save' : 'No change'}
                                                >
                                                    {savingId === p.id ? <Loader2 size={14} className={styles.spin} /> : 'Save'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscountLimitsModal;
