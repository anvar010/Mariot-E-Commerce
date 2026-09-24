'use client';

import React, { useMemo, useState } from 'react';
import { Building2, FileText, Clock, TrendingUp, X, Eye, Loader2, Mail } from 'lucide-react';
import WhatsappIcon from '@/components/shared/icons/WhatsappIcon';
import styles from './CustomerHistoryPanel.module.css';

/**
 * What staff see about a customer before raising a new quotation for them.
 *
 * The point of this panel is cross-branch visibility: a Sharjah clerk must be able to
 * tell at a glance that this customer already holds three Dubai quotations, so the
 * history and the branch breakdown deliberately cover ALL branches, not just the
 * viewer's own.
 */

export interface CustomerProfile {
    customer: {
        id: number;
        name: string;
        company_name: string | null;
        email: string | null;
        phone: string | null;
        vat_number: string | null;
        address: string | null;
    };
    summary: {
        total_count: number;
        total_value: number;
        by_status: Record<string, { count: number; value: number }>;
    };
    branch_history: Array<{ branch_name: string; branch_code: string | null; count: number; value: number }>;
    quotations: Array<{
        id: number;
        quotation_ref: string;
        status: string;
        total_amount: number | string;
        created_at: string;
        branch_name: string | null;
        branch_code: string | null;
        created_by_name: string | null;
        /** 'admin' or 'staff' at the time the quotation was raised. */
        created_by_role?: string | null;
        /** 1 once the quotation has been emailed, so the action can read "resend". */
        email_sent?: number | null;
    }>;
}

const money = (n: number | string) =>
    `AED ${(Number(n) || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (s: string) => {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// The statuses a staff quotation can hold, in the order they progress. Listing them
// explicitly (rather than mapping whatever the API returns) keeps a zero showing for
// statuses this customer has none of, which is itself information.
const STATUSES = ['pending', 'approved', 'rejected'] as const;

const statusClass = (s: string) => {
    const k = String(s || '').toLowerCase();
    if (k === 'approved') return styles.statusApproved;
    if (k === 'rejected') return styles.statusRejected;
    return styles.statusPending;
};

interface Props {
    profile: CustomerProfile;
    onClose?: () => void;
    /**
     * Opens one of the listed quotations in full. The rows here carry only summary
     * columns -- no line items -- so the caller fetches the whole record before showing
     * it, which is why this is a callback rather than local state.
     */
    onView?: (quotationId: number) => void;
    /** The row currently being fetched, so only that one shows a spinner. */
    viewingId?: number | null;
    /**
     * Opens the send dialog for a quotation. Owned by the parent because sending needs
     * the PDF builder and the notification system, neither of which this panel has.
     */
    onEmail?: (quotationId: number) => void;
    /** Opens WhatsApp for this customer, with the quotation named in the message. */
    onWhatsapp?: (quotationId: number) => void;
    /**
     * Renders as a standalone card rather than an inset block. Set on the customer page,
     * where this is the whole content instead of an interruption inside a form.
     */
    variant?: 'inset' | 'page';
}

const CustomerHistoryPanel: React.FC<Props> = ({ profile, onClose, onView, viewingId, onEmail, onWhatsapp, variant = 'inset' }) => {
    const { customer, summary, branch_history, quotations } = profile;

    /**
     * Branch narrowing, driven by the chips that were already here.
     *
     * The chips listed each branch and its count but did nothing, and a separate dropdown
     * beside them would have stated the same set twice. Clicking one filters the history
     * below; clicking it again clears it.
     *
     * Keyed by name rather than id because the profile endpoint returns branch_name on
     * both the chips and the rows, and not the id -- name is what the two have in common.
     */
    const [branchFilter, setBranchFilter] = useState<string | null>(null);

    const visibleQuotations = useMemo(
        () => (branchFilter
            ? quotations.filter(q => (q.branch_name || null) === branchFilter)
            : quotations),
        [quotations, branchFilter]
    );

    return (
        <div className={`${styles.panel} ${variant === 'page' ? styles.panelPage : ''}`}>
            <div className={styles.header}>
                <div>
                    <div className={styles.existingTag}>Existing customer</div>
                    <h3 className={styles.name}>{customer.name}</h3>
                    {customer.company_name && (
                        <div className={styles.company}><Building2 size={13} /> {customer.company_name}</div>
                    )}
                </div>
                {onClose && (
                    <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Dismiss customer history">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className={styles.details}>
                {customer.phone && <span><strong>Phone</strong> {customer.phone}</span>}
                {customer.email && <span><strong>Email</strong> {customer.email}</span>}
                {customer.vat_number && <span><strong>VAT</strong> {customer.vat_number}</span>}
                {customer.address && <span><strong>Address</strong> {customer.address}</span>}
            </div>

            <div className={styles.stats}>
                <div className={`${styles.stat} ${styles.statLead}`}>
                    <div className={styles.statLabel}><FileText size={13} /> Quotations</div>
                    <div className={styles.statValue}>{summary.total_count}</div>
                </div>
                <div className={`${styles.stat} ${styles.statLead}`}>
                    <div className={styles.statLabel}><TrendingUp size={13} /> Total value</div>
                    <div className={styles.statValue}>{money(summary.total_value)}</div>
                </div>
                {STATUSES.map(s => {
                    const count = summary.by_status[s]?.count ?? 0;
                    // Colour is reserved for counts that mean something. A zero of any
                    // status is unremarkable and stays neutral; a non-zero pending or
                    // rejected is what someone opening this page needs to spot.
                    const tone = count === 0 ? ''
                        : s === 'rejected' ? styles.statAlert
                        : s === 'pending' ? styles.statWarn
                        : styles.statGood;
                    return (
                        <div key={s} className={`${styles.stat} ${tone}`}>
                            <div className={styles.statLabel}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
                            <div className={styles.statValue}>{count}</div>
                        </div>
                    );
                })}
            </div>

            {branch_history.length > 0 && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Branch history</h4>
                    <div className={styles.branchRow}>
                        {branch_history.map(b => {
                            const isActive = branchFilter === b.branch_name;
                            return (
                                <button
                                    key={`${b.branch_name}-${b.branch_code}`}
                                    type="button"
                                    className={`${styles.branchChip} ${isActive ? styles.branchChipActive : ''}`}
                                    onClick={() => setBranchFilter(isActive ? null : b.branch_name)}
                                    aria-pressed={isActive}
                                    title={isActive ? 'Show all branches' : `Show only ${b.branch_name}`}
                                >
                                    {b.branch_name}
                                    {b.branch_code ? ` (${b.branch_code})` : ''}
                                    <em>{b.count}</em>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                    <Clock size={13} /> Previous quotations
                    {branchFilter
                        ? (
                            <button
                                type="button"
                                className={styles.clearFilter}
                                onClick={() => setBranchFilter(null)}
                            >
                                {branchFilter} <X size={11} />
                            </button>
                        )
                        : <span className={styles.allBranchesNote}>across all branches</span>}
                </h4>
                {visibleQuotations.length === 0 ? (
                    <p className={styles.empty}>
                        {branchFilter
                            ? `No quotations from ${branchFilter}.`
                            : 'No quotations raised for this customer yet.'}
                    </p>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Quotation No.</th>
                                    <th>Branch</th>
                                    <th>Created by</th>
                                    <th>Date</th>
                                    <th className={styles.right}>Amount</th>
                                    <th>Status</th>
                                    {(onView || onEmail || onWhatsapp) && (
                                        <th className={styles.actionsHead}><span className={styles.srOnly}>Actions</span></th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleQuotations.map(q => (
                                    <tr key={q.id}>
                                        <td className={styles.ref}>{q.quotation_ref}</td>
                                        {/* Older quotations pre-date branch numbering and carry no branch. */}
                                        <td>{q.branch_name || <span className={styles.muted}>—</span>}</td>
                                        <td>
                                            {q.created_by_name
                                                ? (
                                                    <div className={styles.author}>
                                                        <span className={styles.authorName}>{q.created_by_name}</span>
                                                        {q.created_by_role && (
                                                            <span className={`${styles.roleBadge} ${
                                                                String(q.created_by_role).toLowerCase() === 'admin'
                                                                    ? styles.roleAdmin
                                                                    : styles.roleStaff
                                                            }`}>
                                                                {q.created_by_role}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                                : <span className={styles.muted}>—</span>}
                                        </td>
                                        <td>{shortDate(q.created_at)}</td>
                                        <td className={styles.right}>{money(q.total_amount)}</td>
                                        <td><span className={`${styles.status} ${statusClass(q.status)}`}>{q.status}</span></td>
                                        {(onView || onEmail || onWhatsapp) && (
                                            <td className={styles.actionsCell}>
                                                <div className={styles.actions}>
                                                    {onView && (
                                                        <button
                                                            type="button"
                                                            className={styles.viewBtn}
                                                            onClick={() => onView(q.id)}
                                                            disabled={viewingId === q.id}
                                                            title={`View ${q.quotation_ref}`}
                                                            aria-label={`View quotation ${q.quotation_ref}`}
                                                        >
                                                            {viewingId === q.id
                                                                ? <Loader2 size={14} className={styles.spin} />
                                                                : <Eye size={14} />}
                                                        </button>
                                                    )}
                                                    {/* Only an approved quotation may be sent, which is the
                                                        same rule the main list applies -- the approval gate
                                                        means nothing if it can be bypassed from here. */}
                                                    {onEmail && (
                                                        <button
                                                            type="button"
                                                            className={styles.viewBtn}
                                                            onClick={() => onEmail(q.id)}
                                                            disabled={q.status !== 'approved'}
                                                            title={q.status !== 'approved'
                                                                ? 'Only approved quotations can be emailed'
                                                                : (Number(q.email_sent) === 1
                                                                    ? `Resend ${q.quotation_ref}`
                                                                    : `Email ${q.quotation_ref}`)}
                                                            aria-label={`Email quotation ${q.quotation_ref}`}
                                                        >
                                                            <Mail size={14} />
                                                        </button>
                                                    )}
                                                    {onWhatsapp && (
                                                        <button
                                                            type="button"
                                                            className={`${styles.viewBtn} ${styles.whatsappBtn}`}
                                                            onClick={() => onWhatsapp(q.id)}
                                                            disabled={q.status !== 'approved'}
                                                            title={q.status !== 'approved'
                                                                ? 'Only approved quotations can be sent'
                                                                : `Send ${q.quotation_ref} on WhatsApp`}
                                                            aria-label={`Send quotation ${q.quotation_ref} on WhatsApp`}
                                                        >
                                                            <WhatsappIcon size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerHistoryPanel;
