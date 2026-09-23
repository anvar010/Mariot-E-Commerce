'use client';

import React from 'react';
import { Building2, FileText, Clock, TrendingUp, X, Eye, Loader2 } from 'lucide-react';
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
}

const CustomerHistoryPanel: React.FC<Props> = ({ profile, onClose, onView, viewingId }) => {
    const { customer, summary, branch_history, quotations } = profile;

    return (
        <div className={styles.panel}>
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
                <div className={styles.stat}>
                    <div className={styles.statLabel}><FileText size={13} /> Quotations</div>
                    <div className={styles.statValue}>{summary.total_count}</div>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statLabel}><TrendingUp size={13} /> Total value</div>
                    <div className={styles.statValue}>{money(summary.total_value)}</div>
                </div>
                {STATUSES.map(s => (
                    <div key={s} className={styles.stat}>
                        <div className={styles.statLabel}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
                        <div className={styles.statValue}>{summary.by_status[s]?.count ?? 0}</div>
                    </div>
                ))}
            </div>

            {branch_history.length > 0 && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Branch history</h4>
                    <div className={styles.branchRow}>
                        {branch_history.map(b => (
                            <span key={`${b.branch_name}-${b.branch_code}`} className={styles.branchChip}>
                                {b.branch_name}
                                {b.branch_code ? ` (${b.branch_code})` : ''}
                                <em>{b.count}</em>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                    <Clock size={13} /> Previous quotations
                    <span className={styles.allBranchesNote}>across all branches</span>
                </h4>
                {quotations.length === 0 ? (
                    <p className={styles.empty}>No quotations raised for this customer yet.</p>
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
                                    {onView && <th className={styles.actionsHead}><span className={styles.srOnly}>View</span></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {quotations.map(q => (
                                    <tr key={q.id}>
                                        <td className={styles.ref}>{q.quotation_ref}</td>
                                        {/* Older quotations pre-date branch numbering and carry no branch. */}
                                        <td>{q.branch_name || <span className={styles.muted}>—</span>}</td>
                                        <td>{q.created_by_name || <span className={styles.muted}>—</span>}</td>
                                        <td>{shortDate(q.created_at)}</td>
                                        <td className={styles.right}>{money(q.total_amount)}</td>
                                        <td><span className={`${styles.status} ${statusClass(q.status)}`}>{q.status}</span></td>
                                        {onView && (
                                            <td className={styles.actionsCell}>
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
