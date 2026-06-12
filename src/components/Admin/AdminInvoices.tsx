'use client';

import React, { useState, useEffect } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import styles from './AdminInvoices.module.css';
import { FileText, Search, User, Calendar, Hash, Package, Eye, Download, Loader2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';

const AdminInvoices = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [issuedByFilter, setIssuedByFilter] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [viewingId, setViewingId] = useState<number | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const { showNotification } = useNotification();

    const handleViewInvoice = async (inv: any) => {
        if (viewingId) return;
        setViewingId(inv.id);
        try {
            // Fetch order items so the PDF can list them
            const orderRes = await fetch(`${API_BASE_URL}/orders/${inv.order_id}`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const orderData = await orderRes.json();
            const items = orderData?.data?.items || [];

            const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
            const dataUri = await generateInvoicePDF({
                invoice_number: inv.invoice_number,
                order_id: inv.order_id,
                customer_name: inv.user_name || '',
                given_by_name: inv.given_by_name || '',
                final_amount: Number(inv.order_total || inv.final_amount || 0),
                delivery_charge: Number(orderData?.data?.delivery_charge) || 0,
                items
            });

            // Convert data URI to blob and open in a new tab
            const base64 = dataUri.replace(/^data:application\/pdf[^,]*,/, '');
            const byteChars = atob(base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            const win = window.open(blobUrl, '_blank');
            if (!win) {
                // Popup blocked — fall back to download
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `Invoice-${inv.invoice_number}.pdf`;
                a.click();
            }
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error: any) {
            console.error('[Invoice View] Failed:', error?.message || error);
            showNotification('Failed to generate invoice PDF', 'error');
        } finally {
            setViewingId(null);
        }
    };

    const handleDownloadInvoice = async (inv: any) => {
        if (downloadingId) return;
        setDownloadingId(inv.id);
        try {
            const orderRes = await fetch(`${API_BASE_URL}/orders/${inv.order_id}`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const orderData = await orderRes.json();
            const items = orderData?.data?.items || [];

            const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
            const dataUri = await generateInvoicePDF({
                invoice_number: inv.invoice_number,
                order_id: inv.order_id,
                customer_name: inv.user_name || '',
                given_by_name: inv.given_by_name || '',
                final_amount: Number(inv.order_total || inv.final_amount || 0),
                delivery_charge: Number(orderData?.data?.delivery_charge) || 0,
                items
            });

            const base64 = dataUri.replace(/^data:application\/pdf[^,]*,/, '');
            const byteChars = atob(base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Invoice-${inv.invoice_number}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error: any) {
            console.error('[Invoice Download] Failed:', error?.message || error);
            showNotification('Failed to download invoice PDF', 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setIsDropdownOpen(false);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/invoices`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setInvoices(data.data);
            } else {
                showNotification(data.message || 'Failed to load invoices', 'error');
            }
        } catch (error) {
            console.error('Failed to fetch invoices', error);
            showNotification('Failed to load invoices', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Derive unique staff names for the "Issued By" filter
    const uniqueIssuers = Array.from(
        new Set(invoices.map(inv => inv.given_by_name).filter(Boolean))
    ).sort() as string[];

    const issuerCounts = invoices.reduce<Record<string, number>>((acc, inv) => {
        const name = inv.given_by_name || 'Unknown';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    const filtered = invoices.filter(inv => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            inv.invoice_number?.toLowerCase().includes(term) ||
            inv.user_name?.toLowerCase().includes(term) ||
            inv.user_email?.toLowerCase().includes(term) ||
            String(inv.order_id).includes(term) ||
            inv.given_by_name?.toLowerCase().includes(term)
        );
        const matchesIssuer = issuedByFilter === 'all' || (inv.given_by_name || 'Unknown') === issuedByFilter;
        return matchesSearch && matchesIssuer;
    });

    return (
        <div className={styles.adminInvoices}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Invoices</h1>
                        <div className={styles.totalBadge}>
                            <FileText size={14} />
                            <span><strong>{invoices.length}</strong> invoices</span>
                        </div>
                    </div>
                    <p>All invoices issued upon order delivery, including who issued them.</p>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by invoice number, customer, order ID, or issued by..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {uniqueIssuers.length >= 1 && (
                    <div className={styles.customDropdownContainer} onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}>
                        <div className={`${styles.customDropdownHeader} ${isDropdownOpen ? styles.isOpen : ''}`}>
                            <User size={15} style={{ opacity: 0.6 }} />
                            <span className={styles.filterLabel}>Issued By:</span>
                            <span className={styles.filterSelectedValue}>
                                {issuedByFilter === 'all' ? `All Staff (${invoices.length})` : `${issuedByFilter} (${issuerCounts[issuedByFilter] || 0})`}
                            </span>
                            <div className={styles.dropdownValueArrow}></div>
                        </div>

                        <div className={`${styles.customDropdownMenu} ${isDropdownOpen ? styles.isOpen : ''}`}>
                            <div
                                className={`${styles.customDropdownOption} ${issuedByFilter === 'all' ? styles.activeOption : ''}`}
                                onClick={() => { setIssuedByFilter('all'); setIsDropdownOpen(false); }}
                            >
                                All Staff ({invoices.length})
                            </div>
                            {uniqueIssuers.map(name => (
                                <div
                                    key={name}
                                    className={`${styles.customDropdownOption} ${issuedByFilter === name ? styles.activeOption : ''}`}
                                    onClick={() => { setIssuedByFilter(name); setIsDropdownOpen(false); }}
                                >
                                    {name} ({issuerCounts[name] || 0})
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th><Hash size={13} /> Invoice No.</th>
                            <th><Package size={13} /> Order</th>
                            <th><User size={13} /> Customer</th>
                            <th>Amount</th>
                            <th><User size={13} /> Issued By</th>
                            <th><Calendar size={13} /> Date Issued</th>
                            <th>Order Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '60px' }}>
                                    <AdminLoader message="Loading Invoices..." />
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className={styles.emptyState}>
                                    <FileText size={40} strokeWidth={1.2} />
                                    <p>{searchTerm ? 'No invoices match your search.' : 'No invoices yet. Invoices are created when an order is marked as delivered.'}</p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(inv => (
                                <tr key={inv.id}>
                                    <td>
                                        <span className={styles.invoiceNumber}>
                                            <FileText size={13} />
                                            {inv.invoice_number}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.orderId}>#{inv.order_id}</span>
                                    </td>
                                    <td>
                                        <div className={styles.clientInfo}>
                                            <span className={styles.customerName}>{inv.user_name || '—'}</span>
                                            <span className={styles.customerEmail}>{inv.user_email || '—'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.amount}>
                                            <CurrencyPrice amount={Number(inv.order_total)} />
                                        </span>
                                    </td>
                                    <td>
                                        {inv.given_by_name ? (
                                            <span className={styles.issuedBy}>{inv.given_by_name}</span>
                                        ) : (
                                            <span className={styles.issuedByEmpty}>—</span>
                                        )}
                                    </td>
                                    <td className={styles.dateCell}>
                                        {new Date(inv.created_at).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${inv.order_status === 'delivered' ? styles.delivered : ''}`}>
                                            {(inv.order_status || 'delivered').toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                                className={styles.viewBtn}
                                                onClick={() => handleViewInvoice(inv)}
                                                disabled={viewingId === inv.id}
                                                title="View Invoice PDF"
                                            >
                                                {viewingId === inv.id
                                                    ? <Loader2 size={16} className={styles.spinIcon} />
                                                    : <Eye size={16} />}
                                            </button>
                                            <button
                                                className={styles.viewBtn}
                                                onClick={() => handleDownloadInvoice(inv)}
                                                disabled={downloadingId === inv.id}
                                                title="Download Invoice PDF"
                                            >
                                                {downloadingId === inv.id
                                                    ? <Loader2 size={16} className={styles.spinIcon} />
                                                    : <Download size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminInvoices;
