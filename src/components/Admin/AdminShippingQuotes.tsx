'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Truck, Search, RefreshCw, Send, X, Package, MapPin, Phone, Mail, AlertTriangle } from 'lucide-react';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import styles from './AdminShippingQuotes.module.css';

/**
 * Shipping quote requests, and the one thing the shop does with them: put a delivery price
 * on a request so the customer can accept it.
 *
 * Nothing here creates or charges an order. Setting a price emails the customer a link;
 * the order only exists once they accept and pay.
 */

interface QuoteItem {
    id: number;
    product_id: number | null;
    name: string;
    model: string | null;
    image: string | null;
    quantity: number;
    price_at_request: string | number;
    product_removed: number;
}

interface Quote {
    id: number;
    reference: string;
    status: 'pending' | 'quoted' | 'accepted' | 'declined' | 'expired' | 'ordered';
    country: string;
    state: string | null;
    city: string | null;
    address_line1: string | null;
    address_line2: string | null;
    zip_code: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    customer_note: string | null;
    user_name: string | null;
    user_email: string | null;
    subtotal: string | number;
    vat_amount: string | number;
    discount_amount: string | number;
    points_discount: string | number;
    delivery_charge: string | number | null;
    quoted_total: string | number | null;
    admin_note: string | null;
    item_count?: number;
    items?: QuoteItem[];
    created_at: string;
    expires_at: string | null;
    quoted_by_name?: string | null;
}

const money = (n: unknown) => `AED ${(Number(n) || 0).toFixed(2)}`;

const resolveImage = (path: string | null): string => {
    if (!path) return '/assets/placeholder.png';
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const STATUS_LABEL: Record<Quote['status'], string> = {
    pending: 'Awaiting price',
    quoted: 'Price sent',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    ordered: 'Paid',
};

const AdminShippingQuotes: React.FC = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // The quote open in the side panel, fetched in full -- the list endpoint carries only
    // a line count, not the lines themselves.
    const [detail, setDetail] = useState<Quote | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [charge, setCharge] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/shipping-quotes/all`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) setQuotes(data.data || []);
        } catch (err) {
            console.error('Failed to load shipping quotes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openDetail = async (quote: Quote) => {
        setDetail(quote);
        setDetailLoading(true);
        setFeedback(null);
        // Pre-filled so re-pricing starts from the current figure rather than blank.
        setCharge(quote.delivery_charge != null ? String(Number(quote.delivery_charge)) : '');
        setNote(quote.admin_note || '');
        try {
            const res = await fetch(`${API_BASE_URL}/shipping-quotes/${quote.id}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) setDetail(data.data);
        } catch (err) {
            console.error('Failed to load quote detail', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const sendPrice = async () => {
        if (!detail) return;
        const amount = Number(charge);
        if (!Number.isFinite(amount) || amount < 0) {
            setFeedback({ type: 'err', text: 'Enter a delivery cost of zero or more.' });
            return;
        }
        setSaving(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_BASE_URL}/shipping-quotes/${detail.id}/price`, {
                method: 'PUT',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ delivery_charge: amount, admin_note: note }),
            });
            const data = await res.json();
            if (!data.success) {
                setFeedback({ type: 'err', text: data.message || 'Could not send the price.' });
                return;
            }
            setFeedback({ type: 'ok', text: 'Price sent to the customer.' });
            setDetail(d => (d ? { ...d, ...data.data } : d));
            load();
        } catch {
            setFeedback({ type: 'err', text: 'Could not reach the server.' });
        } finally {
            setSaving(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return quotes.filter(quote => {
            if (statusFilter !== 'all' && quote.status !== statusFilter) return false;
            if (!q) return true;
            return [quote.reference, quote.user_name, quote.contact_name, quote.contact_email, quote.user_email, quote.country]
                .some(v => String(v || '').toLowerCase().includes(q));
        });
    }, [quotes, search, statusFilter]);

    const pendingCount = quotes.filter(q => q.status === 'pending').length;

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><Truck size={24} /> Shipping Quotes</h1>
                    <p>Requests from outside the UAE, waiting on a delivery cost.</p>
                </div>
                <div className={styles.headerRight}>
                    {pendingCount > 0 && <span className={styles.pendingBadge}>{pendingCount} awaiting price</span>}
                    <button className={styles.refreshBtn} onClick={load} disabled={loading}>
                        <RefreshCw size={16} className={loading ? styles.spin : ''} /> Refresh
                    </button>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <Search size={16} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search reference, customer or country"
                    />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={styles.select}>
                    <option value="all">All statuses</option>
                    {Object.entries(STATUS_LABEL).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className={styles.empty}><RefreshCw size={28} className={styles.spin} /><p>Loading requests…</p></div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    <Truck size={34} />
                    <p>{quotes.length === 0 ? 'No shipping quote requests yet.' : 'Nothing matches that search.'}</p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Customer</th>
                                <th>Destination</th>
                                <th>Goods</th>
                                <th>Delivery</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(quote => (
                                <tr key={quote.id} className={quote.status === 'pending' ? styles.rowPending : ''}>
                                    <td>
                                        <span className={styles.ref}>{quote.reference}</span>
                                        <span className={styles.date}>
                                            {new Date(quote.created_at).toLocaleDateString('en-GB')}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.name}>{quote.contact_name || quote.user_name || '—'}</span>
                                        <span className={styles.sub}>{quote.contact_email || quote.user_email || ''}</span>
                                    </td>
                                    <td>
                                        <span className={styles.name}>{quote.country}</span>
                                        <span className={styles.sub}>{[quote.city, quote.state].filter(Boolean).join(', ')}</span>
                                    </td>
                                    <td>{money(quote.subtotal)}</td>
                                    <td>{quote.delivery_charge != null ? money(quote.delivery_charge) : <span className={styles.dash}>—</span>}</td>
                                    <td>
                                        <span className={`${styles.status} ${styles[quote.status]}`}>
                                            {STATUS_LABEL[quote.status]}
                                        </span>
                                    </td>
                                    <td>
                                        <button className={styles.openBtn} onClick={() => openDetail(quote)}>
                                            {quote.status === 'pending' ? 'Set price' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {detail && (
                <div className={styles.overlay} onClick={() => setDetail(null)}>
                    <aside className={styles.panel} onClick={e => e.stopPropagation()}>
                        <div className={styles.panelHead}>
                            <div>
                                <h2>{detail.reference}</h2>
                                <span className={`${styles.status} ${styles[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setDetail(null)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.panelBody}>
                            <section className={styles.block}>
                                <h3><MapPin size={15} /> Deliver to</h3>
                                <p className={styles.address}>
                                    {[detail.address_line1, detail.address_line2, detail.city, detail.state, detail.country, detail.zip_code]
                                        .filter(Boolean).join(', ')}
                                </p>
                                <p className={styles.contact}>
                                    {detail.contact_name || detail.user_name || '—'}
                                    {detail.contact_phone && <> · <Phone size={13} /> {detail.contact_phone}</>}
                                    {(detail.contact_email || detail.user_email) && <> · <Mail size={13} /> {detail.contact_email || detail.user_email}</>}
                                </p>
                                {detail.customer_note && <p className={styles.note}>“{detail.customer_note}”</p>}
                            </section>

                            <section className={styles.block}>
                                <h3><Package size={15} /> Items {detail.items ? `(${detail.items.length})` : ''}</h3>
                                {detailLoading ? (
                                    <p className={styles.muted}>Loading items…</p>
                                ) : (
                                    <div className={styles.items}>
                                        {(detail.items || []).map(item => (
                                            <div key={item.id} className={styles.item}>
                                                <img src={resolveImage(item.image)} alt="" className={styles.itemImg} />
                                                <div className={styles.itemInfo}>
                                                    <span className={styles.itemName}>{item.name}</span>
                                                    {Number(item.product_removed) === 1 && (
                                                        <span className={styles.removed}>
                                                            <AlertTriangle size={12} /> Product no longer on the site
                                                        </span>
                                                    )}
                                                    {item.model && <span className={styles.sub}>{item.model}</span>}
                                                </div>
                                                <span className={styles.itemQty}>×{item.quantity}</span>
                                                <span className={styles.itemPrice}>{money(item.price_at_request)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className={styles.block}>
                                <h3>Totals</h3>
                                <div className={styles.totals}>
                                    <div><span>Goods</span><span>{money(detail.subtotal)}</span></div>
                                    {Number(detail.discount_amount) > 0 && (
                                        <div><span>Discount</span><span>−{money(detail.discount_amount)}</span></div>
                                    )}
                                    {Number(detail.points_discount) > 0 && (
                                        <div><span>Points</span><span>−{money(detail.points_discount)}</span></div>
                                    )}
                                    <div><span>VAT (5%)</span><span>{money(detail.vat_amount)}</span></div>
                                    <div>
                                        <span>Delivery</span>
                                        <span>{detail.delivery_charge != null ? money(detail.delivery_charge) : '—'}</span>
                                    </div>
                                    {detail.quoted_total != null && (
                                        <div className={styles.grand}><span>Total</span><span>{money(detail.quoted_total)}</span></div>
                                    )}
                                </div>
                            </section>

                            {/* A paid quote is settled: repricing it would change what was already
                                charged, and the backend refuses it too. */}
                            {detail.status !== 'ordered' && (
                                <section className={styles.block}>
                                    <h3>{detail.status === 'pending' ? 'Set the delivery cost' : 'Update the delivery cost'}</h3>
                                    <label className={styles.field}>
                                        <span>Delivery charge (AED)</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={charge}
                                            onChange={e => setCharge(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Note to the customer (optional)</span>
                                        <textarea
                                            rows={3}
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            placeholder="Carrier, transit time, anything they should know."
                                        />
                                    </label>

                                    {feedback && (
                                        <p className={feedback.type === 'ok' ? styles.ok : styles.err}>{feedback.text}</p>
                                    )}

                                    <button className={styles.sendBtn} onClick={sendPrice} disabled={saving}>
                                        <Send size={16} />
                                        {saving ? 'Sending…' : detail.status === 'pending' ? 'Send price to customer' : 'Resend updated price'}
                                    </button>
                                    <p className={styles.hint}>
                                        Emails the customer a link to accept. No order is created and nothing is
                                        charged until they accept and pay.
                                    </p>
                                </section>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
};

export default AdminShippingQuotes;
