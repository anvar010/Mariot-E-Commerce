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
import QuotationEmailModal from './QuotationEmailModal';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import { resolveUrl } from '@/utils/resolveUrl';
import QuotationLineProduct from './QuotationLineProduct';
import styles from './StaffQuotationCustomer.module.css';
import { whatsappLink } from '@/utils/whatsappLink';

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
    // The quotation whose send dialog is open, if any.
    const [emailModal, setEmailModal] = useState<any>(null);

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

    /**
     * Fetches the full quotation, since the history rows carry summary columns only and
     * both sending and the PDF need the line items.
     */
    const fetchFull = async (id: number) => {
        const res = await fetch(`${API_BASE_URL}/staff-quotations/${id}`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && data.data) return data.data;
        throw new Error(data.message || 'Could not open that quotation');
    };

    const openEmail = async (id: number) => {
        try {
            const full = await fetchFull(id);
            if (!full.customer_email) {
                showNotification('This quotation has no customer email', 'error');
                return;
            }
            setEmailModal(full);
        } catch (e: any) {
            showNotification(e?.message || 'Could not open that quotation', 'error');
        }
    };

    const sendEmail = async (q: any, ccEmails: string[]): Promise<boolean> => {
        try {
            const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
            // 'silent': the email wants the data URI only -- nothing saved, nothing opened.
            const pdfDataUri = await generateQuotationPDF({
                ...q,
                items: items.map((i: any) => ({ ...i, image: resolveUrl(i.image) })),
            }, 'silent', false);
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${q.id}/send-email`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdf_base64: pdfDataUri, locale: 'en', cc_emails: ccEmails }),
            });
            const data = await res.json();
            showNotification(data.message || (data.success ? 'Email sent' : 'Failed to send'), data.success ? 'success' : 'error');
            // Reload so the history reflects the send that just happened.
            if (data.success) { load(); return true; }
            return false;
        } catch {
            showNotification('Failed to send the email', 'error');
            return false;
        }
    };

    /**
     * Opens WhatsApp for this customer with the quotation PDF downloaded ready to attach.
     *
     * A wa.me link cannot carry a file -- WhatsApp accepts only a phone number and a text
     * message, and nothing in the web API allows an attachment. So the PDF is saved first
     * and the chat opens second, leaving the file in the downloads tray where WhatsApp's
     * own attach button picks it up. That is one drag instead of the whole manual
     * download-then-find-the-number routine.
     */
    const openWhatsapp = async (id: number) => {
        try {
            const full = await fetchFull(id);
            const link = whatsappLink(full.customer_phone);
            if (!link) {
                showNotification('This quotation has no usable phone number', 'error');
                return;
            }

            // A download link rather than the file: wa.me carries a phone number and a
            // message and nothing else, so the PDF cannot be attached. The customer opens
            // the link and the download starts on its own.
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${id}/share`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!data.success || !data.data?.token) {
                showNotification(data.message || 'Could not create the download link', 'error');
                return;
            }
            const url = `${window.location.origin}/en/quotation/${data.data.token}`;
            const text = `Quotation ${full.quotation_ref} for ${full.customer_name} — total AED ${Number(full.total_amount || 0).toFixed(2)}

Download: ${url}`;
            window.open(`${link}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        } catch (e: any) {
            showNotification(e?.message || 'Could not prepare that quotation', 'error');
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
                onEmail={openEmail}
                onWhatsapp={openWhatsapp}
                variant="page"
            />

            {emailModal && (
                <QuotationEmailModal
                    quotation={emailModal}
                    onClose={() => setEmailModal(null)}
                    onSend={(cc) => sendEmail(emailModal, cc)}
                />
            )}

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
                                                <QuotationLineProduct item={i} />
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
