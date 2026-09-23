'use client';

/**
 * One customer's complete quotation history, as a page rather than a side panel.
 *
 * The builder already shows this information inline while a quotation is being raised, to
 * warn staff that the person in front of them is a returning customer. This is the same
 * data reached the other way round: from the Staff Quotations list, by clicking a
 * customer, to answer what this company has had from us without first starting a
 * quotation for them.
 *
 * It renders CustomerHistoryPanel rather than restating it. The panel is the definition of
 * what a customer summary looks like, and a second copy here would drift from it the first
 * time either changed.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ArrowLeft, X } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { useNotification } from '@/context/NotificationContext';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import CustomerHistoryPanel, { CustomerProfile } from './CustomerHistoryPanel';
import styles from './StaffQuotationCustomer.module.css';

const DASH = '—';

interface Props {
    customerId: number;
}

const StaffQuotationCustomer: React.FC<Props> = ({ customerId }) => {
    const router = useRouter();
    const { showNotification } = useNotification();

    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // The quotation opened from the history table. Those rows carry summary columns only,
    // so the full record is fetched before it can be shown.
    const [selected, setSelected] = useState<any>(null);
    const [viewingId, setViewingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        if (!Number.isFinite(customerId)) { setNotFound(true); setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/staff-quotations/customers/${customerId}/profile`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success && data.data) setProfile(data.data);
            else setNotFound(true);
        } catch {
            showNotification('Could not load this customer', 'error');
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }, [customerId, showNotification]);

    useEffect(() => { load(); }, [load]);

    const viewQuotation = async (id: number) => {
        setViewingId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${id}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            // Staff may only open their own; the server answers 404 for anyone else's.
            if (data.success && data.data) setSelected(data.data);
            else showNotification(data.message || 'Could not open that quotation', 'error');
        } catch {
            showNotification('Could not open that quotation', 'error');
        } finally {
            setViewingId(null);
        }
    };

    if (loading) return <AdminLoader />;

    if (notFound || !profile) {
        return (
            <div className={styles.wrap}>
                <button type="button" className={styles.backBtn} onClick={() => router.push('/admin/staff-quotations')}>
                    <ArrowLeft size={15} /> Staff Quotations
                </button>
                <p className={styles.empty}>That customer could not be found.</p>
            </div>
        );
    }

    const items = selected
        ? (typeof selected.items === 'string' ? JSON.parse(selected.items) : (selected.items || []))
        : [];

    return (
        <div className={styles.wrap}>
            <button type="button" className={styles.backBtn} onClick={() => router.push('/admin/staff-quotations')}>
                <ArrowLeft size={15} /> Staff Quotations
            </button>

            <h1 className={styles.title}>Customer</h1>
            <p className={styles.subtitle}>Every quotation raised for this customer, across all branches.</p>

            {/* No onClose: the panel is the page here, so there is nothing to dismiss to. */}
            <CustomerHistoryPanel
                profile={profile}
                onView={viewQuotation}
                viewingId={viewingId}
            />

            {selected && (
                <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{selected.quotation_ref}</h2>
                            <button onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.metaGrid}>
                                <div><span>Customer</span><strong>{selected.customer_name}</strong></div>
                                <div><span>Email</span><strong>{selected.customer_email || DASH}</strong></div>
                                <div><span>Phone</span><strong>{selected.customer_phone || DASH}</strong></div>
                                <div><span>VAT / TRN</span><strong>{selected.vat_number || DASH}</strong></div>
                                <div>
                                    <span>Created by</span>
                                    <strong>
                                        {selected.created_by_name || 'Unknown'}
                                        {selected.created_by_role ? ` (${selected.created_by_role})` : ''}
                                    </strong>
                                </div>
                                <div>
                                    <span>Created on</span>
                                    <strong>{selected.created_at ? new Date(selected.created_at).toLocaleString() : DASH}</strong>
                                </div>
                            </div>
                            {selected.review_note && (
                                <p className={`${styles.notes} ${selected.status === 'rejected' ? styles.notesReject : ''}`}>
                                    <span>{selected.status === 'rejected' ? 'Not approved:' : 'Approval note:'}</span> {selected.review_note}
                                    {selected.reviewed_by_name ? ` ${DASH} ${selected.reviewed_by_name}` : ''}
                                </p>
                            )}
                            {selected.notes && <p className={styles.notes}><span>Notes:</span> {selected.notes}</p>}
                            <table className={styles.table}>
                                <thead>
                                    <tr><th>PRODUCT</th><th>UNIT</th><th>QTY</th><th>DISC %</th><th>TOTAL</th></tr>
                                </thead>
                                <tbody>
                                    {items.map((i: any, idx: number) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className={styles.itemName}>{i.name}</div>
                                                {(i.model || i.brand || i.variant_label) && (
                                                    <div className={styles.itemMeta}>
                                                        {[i.brand, i.model, i.variant_label].filter(Boolean).join(' · ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td><CurrencyPrice amount={Number(i.unit_price ?? i.price)} /></td>
                                            <td>{i.quantity}</td>
                                            <td>{Number(i.discount_pct) > 0 ? `${i.discount_pct}%` : DASH}</td>
                                            <td className={styles.lineTotal}><CurrencyPrice amount={Number(i.line_total)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className={styles.modalTotals}>
                                <div className={styles.totalRow}><span>Subtotal</span><CurrencyPrice amount={Number(selected.subtotal)} /></div>
                                <div className={styles.totalRow}><span>Discount</span><span className={styles.negative}>{'−'} <CurrencyPrice amount={Number(selected.discount_amount)} /></span></div>
                                <div className={styles.totalRow}><span>VAT (5%)</span><CurrencyPrice amount={Number(selected.tax_amount)} /></div>
                                <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>Total</span><CurrencyPrice amount={Number(selected.total_amount)} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffQuotationCustomer;
