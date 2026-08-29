'use client';

/**
 * Delivery zones — how much longer than the UAE each destination takes.
 *
 * A product carries one delivery_days figure, which is the UAE promise. Each row
 * here adds its offset on top, so changing "Saudi Arabia +2" to "+3" moves the
 * promise on all 1,400 product pages at once. There is deliberately no per-product
 * override: that would be a 1,400 × 7 matrix nobody would keep accurate.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { Truck, Plus, Trash2, Save, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import styles from './AdminDeliveryZones.module.css';

interface Zone {
    country_code: string;
    country_name: string;
    country_name_ar: string | null;
    extra_days: number;
    is_active: number | boolean;
    order_index: number;
}

const BLANK: Zone = {
    country_code: '', country_name: '', country_name_ar: '',
    extra_days: 0, is_active: 1, order_index: 99,
};

// The promise a mid-range product would make, so the effect of an offset is
// visible while editing rather than only on the storefront.
const SAMPLE_BASE_DAYS = 3;
const EXPRESS_MAX_DAYS = 2;

const arrivalLabel = (days: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
    return `${weekday}, ${d.getDate()} ${month}`;
};

const AdminDeliveryZones = () => {
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingCode, setSavingCode] = useState<string | null>(null);
    const [draft, setDraft] = useState<Zone | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const flash = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2600);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/delivery-zones/admin`, {
                credentials: 'include', headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Could not load delivery zones.');
            setZones(data.data.map((z: Zone) => ({ ...z, country_name_ar: z.country_name_ar ?? '' })));
        } catch (e: any) {
            setError(e.message || 'Could not load delivery zones.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const patch = (code: string, changes: Partial<Zone>) => {
        setZones(prev => prev.map(z => (z.country_code === code ? { ...z, ...changes } : z)));
    };

    const save = async (zone: Zone) => {
        setSavingCode(zone.country_code || '__new');
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/delivery-zones`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...zone,
                    country_code: zone.country_code.trim().toUpperCase(),
                    extra_days: Number(zone.extra_days),
                    order_index: Number(zone.order_index),
                    is_active: !!Number(zone.is_active),
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Could not save this zone.');
            await load();
            setDraft(null);
            flash(`${zone.country_name || zone.country_code} saved`);
        } catch (e: any) {
            setError(e.message || 'Could not save this zone.');
        } finally {
            setSavingCode(null);
        }
    };

    const remove = async (zone: Zone) => {
        // Deleting the fallback row leaves shoppers outside the listed countries with
        // no promise at all, so it is worth a second look.
        const warning = zone.country_code === 'WW'
            ? `Remove "${zone.country_name}"?\n\nThis is the catch-all row. Without it, shoppers outside the listed countries see the UAE date.`
            : `Remove "${zone.country_name}" from the delivery selector?`;
        if (!window.confirm(warning)) return;

        setSavingCode(zone.country_code);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/delivery-zones/${zone.country_code}`, {
                method: 'DELETE', credentials: 'include', headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Could not remove this zone.');
            await load();
            flash(`${zone.country_name} removed`);
        } catch (e: any) {
            setError(e.message || 'Could not remove this zone.');
        } finally {
            setSavingCode(null);
        }
    };

    const rowIsValid = (z: Zone) =>
        /^[A-Za-z]{2}$/.test(z.country_code.trim())
        && z.country_name.trim().length > 0
        && Number.isInteger(Number(z.extra_days))
        && Number(z.extra_days) >= 0;

    const renderRow = (zone: Zone, isDraft: boolean) => {
        const key = isDraft ? '__new' : zone.country_code;
        const busy = savingCode === key;
        const total = SAMPLE_BASE_DAYS + Number(zone.extra_days || 0);
        const update = (changes: Partial<Zone>) =>
            isDraft ? setDraft({ ...zone, ...changes }) : patch(zone.country_code, changes);

        return (
            <tr key={key} className={`${styles.row} ${isDraft ? styles.draftRow : ''} ${!Number(zone.is_active) && !isDraft ? styles.inactiveRow : ''}`}>
                <td>
                    <input
                        className={`${styles.input} ${styles.codeInput}`}
                        value={zone.country_code}
                        maxLength={2}
                        placeholder="AE"
                        // The code is the primary key; editing it in place would create a
                        // second row rather than rename the existing one.
                        disabled={!isDraft}
                        onChange={(e) => update({ country_code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                    />
                </td>
                <td>
                    <input
                        className={styles.input}
                        value={zone.country_name}
                        placeholder="United Arab Emirates"
                        onChange={(e) => update({ country_name: e.target.value })}
                    />
                </td>
                <td>
                    <input
                        className={styles.input}
                        dir="rtl"
                        value={zone.country_name_ar || ''}
                        placeholder="الإمارات"
                        onChange={(e) => update({ country_name_ar: e.target.value })}
                    />
                </td>
                <td>
                    <input
                        className={`${styles.input} ${styles.daysInput}`}
                        type="number"
                        min={0}
                        max={365}
                        value={zone.extra_days}
                        onChange={(e) => update({ extra_days: Number(e.target.value) })}
                    />
                </td>
                <td className={styles.previewCell}>
                    <span className={styles.previewDays}>{total}d</span>
                    <span className={styles.previewDate}>{arrivalLabel(total)}</span>
                    {total <= EXPRESS_MAX_DAYS && <span className={styles.expressTag}>EXPRESS</span>}
                </td>
                <td>
                    <input
                        className={`${styles.input} ${styles.orderInput}`}
                        type="number"
                        value={zone.order_index}
                        onChange={(e) => update({ order_index: Number(e.target.value) })}
                    />
                </td>
                <td className={styles.centerCell}>
                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={!!Number(zone.is_active)}
                            onChange={(e) => update({ is_active: e.target.checked ? 1 : 0 })}
                        />
                        <span className={styles.slider} />
                    </label>
                </td>
                <td className={styles.actionsCell}>
                    <button
                        type="button"
                        className={styles.saveRowBtn}
                        onClick={() => save(zone)}
                        disabled={busy || !rowIsValid(zone)}
                        title={isDraft ? 'Add zone' : 'Save'}
                    >
                        {busy ? <RefreshCw size={15} className={styles.spin} /> : <Save size={15} />}
                    </button>
                    {isDraft ? (
                        <button type="button" className={styles.cancelBtn} onClick={() => setDraft(null)}>Cancel</button>
                    ) : (
                        <button
                            type="button"
                            className={styles.deleteRowBtn}
                            onClick={() => remove(zone)}
                            disabled={busy}
                            title="Remove"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </td>
            </tr>
        );
    };

    const activeCount = zones.filter(z => Number(z.is_active)).length;

    return (
        <div className={styles.card}>
            <div className={styles.sectionTitle}>
                <Truck size={20} color="#3b82f6" />
                <h3>Delivery Zones</h3>
                {!loading && (
                    <span className={styles.countPill}>{activeCount} active</span>
                )}
            </div>

            <div className={styles.explainer}>
                <Info size={18} color="#64748b" />
                <div>
                    <h4>How it works</h4>
                    <p>
                        Each product has its own <strong>delivery days</strong>, which is the promise for the
                        UAE. Every destination below adds its <strong>extra days</strong> on top, and the
                        product page shows the result for whichever country the shopper picks.
                        Change one row here and it applies to the whole catalogue — there is nothing to edit
                        product by product.
                    </p>
                    <p className={styles.explainerNote}>
                        The preview column assumes a {SAMPLE_BASE_DAYS}-day product.
                        Anything arriving within {EXPRESS_MAX_DAYS} days earns the EXPRESS badge.
                    </p>
                </div>
            </div>

            {error && (
                <div className={styles.error}>
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className={styles.loading}><RefreshCw size={20} className={styles.spin} /> Loading zones…</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Country</th>
                                <th>Arabic name</th>
                                <th>Extra days</th>
                                <th>Shopper sees</th>
                                <th>Order</th>
                                <th className={styles.centerCell}>Shown</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {zones.map(z => renderRow(z, false))}
                            {draft && renderRow(draft, true)}
                            {zones.length === 0 && !draft && (
                                <tr><td colSpan={8} className={styles.empty}>No delivery zones yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!draft && !loading && (
                <button type="button" className={styles.addBtn} onClick={() => setDraft({ ...BLANK })}>
                    <Plus size={16} /> Add a zone
                </button>
            )}

            {toast && <div className={styles.toast}>{toast}</div>}
        </div>
    );
};

export default AdminDeliveryZones;
