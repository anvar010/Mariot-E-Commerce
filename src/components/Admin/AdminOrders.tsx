'use client';

import React, { useState, useEffect, useRef } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './AdminOrders.module.css';
import { Search, Package, Download, FileText, X, Loader2, Eye, RotateCcw } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import { useAuth } from '@/context/AuthContext';

type StatusFilter = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_FILTERS: { key: StatusFilter; label: string; dotColor: string }[] = [
    { key: 'all', label: 'All', dotColor: '#64748b' },
    { key: 'pending', label: 'Pending', dotColor: '#ca8a04' },
    { key: 'processing', label: 'Processing', dotColor: '#3b82f6' },
    { key: 'shipped', label: 'Shipped', dotColor: '#8b5cf6' },
    { key: 'delivered', label: 'Delivered', dotColor: '#10b981' },
    { key: 'cancelled', label: 'Cancelled', dotColor: '#dc2626' }
];


// Payment method as the back office reads it: 'tamara' -> 'Tamara', 'bank' -> 'Bank Transfer'.
const formatPaymentMethod = (method?: string) => {
    const labels: Record<string, string> = {
        card: 'Card',
        tabby: 'Tabby',
        tamara: 'Tamara',
        bank: 'Bank Transfer',
        cod: 'Cash on Delivery',
    };
    if (!method) return '—';
    return labels[method.toLowerCase()] || method.toUpperCase();
};

const AdminOrders = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialStatus = (searchParams.get('status') as StatusFilter) || 'all';
    const { user } = useAuth();

    const [orders, setOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(
        STATUS_FILTERS.some(f => f.key === initialStatus) ? initialStatus : 'all'
    );
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const { showNotification } = useNotification();

    // Refunds move real money, so the panel loads the order's actual refund position from
    // the server rather than assuming the full total is still refundable.
    const [refundModal, setRefundModal] = useState<{
        isOpen: boolean; order: any; amount: string; reason: string;
        captured: number; refunded: number; remaining: number; blocker: string | null;
        refunds: any[]; loading: boolean; submitting: boolean;
    }>({ isOpen: false, order: null, amount: '', reason: '', captured: 0, refunded: 0, remaining: 0, blocker: null, refunds: [], loading: false, submitting: false });

    const openRefund = async (order: any) => {
        setRefundModal({ isOpen: true, order, amount: '', reason: '', captured: 0, refunded: 0, remaining: 0, blocker: null, refunds: [], loading: true, submitting: false });
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${order.id}/refunds`, {
                credentials: 'include', headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Could not load refund details');
            setRefundModal(prev => ({
                ...prev,
                captured: Number(data.data.captured) || 0,
                refunded: Number(data.data.refunded) || 0,
                remaining: Number(data.data.remaining) || 0,
                blocker: data.data.blocker || null,
                refunds: Array.isArray(data.data.refunds) ? data.data.refunds : [],
                // Prefilled with the whole remaining balance: refunding everything is the
                // common case, and typing it by hand is where a wrong figure creeps in.
                amount: (Number(data.data.remaining) || 0).toFixed(2),
                loading: false,
            }));
        } catch (err: any) {
            showNotification(err.message || 'Could not load refund details', 'error');
            setRefundModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
    };

    const submitRefund = async () => {
        const { order, amount, reason } = refundModal;
        setRefundModal(prev => ({ ...prev, submitting: true }));
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${order.id}/refund`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount), reason }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Refund failed');
            showNotification(data.message, 'success');
            setRefundModal(prev => ({ ...prev, submitting: false }));
            fetchOrders();
            // Reopen on the updated figures: the operator sees the refund they just made
            // land in the history rather than a panel that vanishes.
            openRefund(order);
        } catch (err: any) {
            showNotification(err.message || 'Refund failed', 'error');
            setRefundModal(prev => ({ ...prev, submitting: false }));
        }
    };


    // Invoice modal state
    const [invoiceModal, setInvoiceModal] = useState<{
        isOpen: boolean;
        orderId: number | null;
        order: any | null;
    }>({ isOpen: false, orderId: null, order: null });
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [givenByName, setGivenByName] = useState('');
    const [invoiceOrderItems, setInvoiceOrderItems] = useState<any[]>([]);
    const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
    const [invoiceSubmitStep, setInvoiceSubmitStep] = useState<string>('');
    const [invoiceError, setInvoiceError] = useState<string | null>(null);
    const invoiceInputRef = useRef<HTMLInputElement>(null);

    // Keep URL in sync so the dashboard cards' deep links work + are shareable.
    const handleStatusFilter = (status: StatusFilter) => {
        setStatusFilter(status);
        const params = new URLSearchParams(searchParams.toString());
        if (status === 'all') params.delete('status');
        else params.set('status', status);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
        confirmLabel?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleExport = async () => {
        try {
            setExporting(true);
            const response = await fetch(`${API_BASE_URL}/admin/export/orders`, {
                credentials: "include",
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Export failed');

            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!data.success) {
                    showNotification(data.message || 'Export failed', 'error');
                    return;
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mariot_orders_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            showNotification('Order history exported successfully');
        } catch (error) {
            console.error('Failed to export orders:', error);
            showNotification('Failed to export orders', 'error');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/orders`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    const openInvoiceModal = async (orderId: number, orderData: any) => {
        setInvoiceNumber('');
        setGivenByName(user?.name || '');
        setInvoiceOrderItems([]);
        setInvoiceError(null);
        setInvoiceModal({ isOpen: true, orderId, order: orderData });
        setTimeout(() => invoiceInputRef.current?.focus(), 100);

        // Fetch order items in background so PDF has line items
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) setInvoiceOrderItems(data.data?.items || []);
        } catch {
            // PDF will render with empty items if fetch fails — not critical
        }
    };

    const submitDeliveredWithInvoice = async () => {
        if (!invoiceNumber.trim()) {
            showNotification('Please enter an invoice number', 'error');
            return;
        }
        const orderId = invoiceModal.orderId!;
        const order = invoiceModal.order;
        try {
            setIsSubmittingInvoice(true);
            setInvoiceError(null);

            // 0. Validate invoice isn't duplicate natively
            setInvoiceSubmitStep('Validating invoice...');
            const checkRes = await fetch(`${API_BASE_URL}/invoices/check?number=${encodeURIComponent(invoiceNumber.trim())}`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const checkData = await checkRes.json();
            if (checkData.success && checkData.exists) {
                setInvoiceError('This invoice number already exists. Please use a unique number.');
                setIsSubmittingInvoice(false);
                setInvoiceSubmitStep('');
                return;
            }

            // 1. Generate invoice PDF — non-blocking, delivery continues even if PDF fails
            let pdfDataUri: string | null = null;
            try {
                setInvoiceSubmitStep('Generating PDF...');
                const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
                pdfDataUri = await generateInvoicePDF({
                    invoice_number: invoiceNumber.trim(),
                    order_id: orderId,
                    customer_name: order?.user_name || '',
                    given_by_name: givenByName.trim() || user?.name || '',
                    final_amount: Number(order?.final_amount || 0),
                    delivery_charge: Number(order?.delivery_charge) || 0,
                    items: invoiceOrderItems
                });
            } catch (pdfErr: any) {
                console.error('[Invoice PDF] Generation failed, continuing without PDF:', pdfErr?.message || pdfErr);
            }

            // 2. Update order status to delivered
            setInvoiceSubmitStep('Updating order status...');
            const statusRes = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                credentials: 'include',
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'delivered' })
            });
            const statusData = await statusRes.json();
            if (!statusData.success) {
                showNotification(statusData.message || 'Failed to update status', 'error');
                return;
            }

            // 3. Create invoice record + send email (with PDF if generated successfully)
            setInvoiceSubmitStep('Sending invoice email...');
            const invoiceRes = await fetch(`${API_BASE_URL}/invoices`, {
                credentials: 'include',
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    invoice_number: invoiceNumber.trim(),
                    given_by_name: givenByName.trim() || user?.name || '',
                    ...(pdfDataUri && { pdf_base64: pdfDataUri })
                })
            });
            const invoiceData = await invoiceRes.json();
            if (!invoiceData.success) {
                setInvoiceError(invoiceData.message || 'Invoice creation failed. Please check the invoice number.');
                return;
            } else {
                showNotification(`Order #${orderId} delivered — Invoice #${invoiceNumber.trim()} sent${pdfDataUri ? ' with PDF' : ''}`);
            }

            setInvoiceModal({ isOpen: false, orderId: null, order: null });
            setInvoiceError(null);
            fetchOrders();
        } catch (error: any) {
            console.error('[Invoice] Submission error:', error?.message || error);
            showNotification(error?.message || 'Error processing delivery', 'error');
        } finally {
            setIsSubmittingInvoice(false);
            setInvoiceSubmitStep('');
        }
    };

    const previewInvoice = async () => {
        if (!invoiceNumber.trim()) {
            showNotification('Please enter an invoice number to preview', 'error');
            return;
        }
        try {
            setIsSubmittingInvoice(true);
            setInvoiceSubmitStep('Generating Preview...');
            const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
            const pdfDataUri = await generateInvoicePDF({
                invoice_number: invoiceNumber.trim(),
                order_id: invoiceModal.orderId!,
                customer_name: invoiceModal.order?.user_name || 'Customer',
                given_by_name: givenByName.trim() || user?.name || '',
                final_amount: Number(invoiceModal.order?.final_amount || invoiceModal.order?.total_amount || 0),
                delivery_charge: Number(invoiceModal.order?.delivery_charge) || 0,
                items: invoiceOrderItems
            });

            // Convert and open
            const base64 = pdfDataUri.replace(/^data:application\/pdf[^,]*,/, '');
            const byteChars = atob(base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error: any) {
            console.error('Preview Error:', error);
            showNotification('Failed to generate preview', 'error');
        } finally {
            setIsSubmittingInvoice(false);
            setInvoiceSubmitStep('');
        }
    };

    const handleStatusChange = (orderId: number, newStatus: string, orderData?: any) => {
        // Delivered requires invoice — open special modal instead
        if (newStatus === 'delivered') {
            openInvoiceModal(orderId, orderData);
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Update Order Status',
            message: `Are you sure you want to change the status of Order #${orderId} to ${newStatus.toUpperCase()}?`,
            type: 'info',
            confirmLabel: 'Update Status',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                        credentials: "include",
                        method: 'PUT',
                        headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: newStatus })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification(`Order #${orderId} status updated to ${newStatus}`);
                        fetchOrders();
                    } else {
                        showNotification(data.message || 'Failed to update status', 'error');
                    }
                } catch (error) {
                    showNotification('Error updating order', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handlePaymentStatusChange = (orderId: number, newStatus: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Update Payment Status',
            message: `Are you sure you want to change the payment status of Order #${orderId} to ${newStatus.toUpperCase()}?`,
            type: 'warning',
            confirmLabel: 'Update Payment',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                        credentials: "include",
                        method: 'PUT',
                        headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ payment_status: newStatus })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification(`Order #${orderId} payment status updated to ${newStatus}`);
                        fetchOrders();
                    } else {
                        showNotification(data.message || 'Failed to update payment status', 'error');
                    }
                } catch (error) {
                    showNotification('Error updating payment status', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const [activeDropdown, setActiveDropdown] = useState<{ id: number, type: 'status' | 'payment' } | null>(null);

    const toggleDropdown = (id: number, type: 'status' | 'payment', e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeDropdown?.id === id && activeDropdown?.type === type) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown({ id, type });
        }
    };

    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
    }, {});

    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            order.id.toString().includes(term) ||
            (order.user_name && order.user_name.toLowerCase().includes(term)) ||
            (order.user_email && order.user_email.toLowerCase().includes(term))
        );
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return styles.statusPending;
            case 'processing': return styles.statusProcessing;
            case 'shipped': return styles.statusShipped;
            case 'delivered': return styles.statusDelivered;
            case 'cancelled': return styles.statusCancelled;
            default: return '';
        }
    };

    return (
        <div className={styles.adminOrders}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Orders Management</h1>
                        <div className={styles.totalBadge}>
                            <Package size={14} />
                            <span><strong>{orders.length}</strong> orders</span>
                        </div>
                    </div>
                    <p>Track and manage customer orders and fulfillment status.</p>
                </div>
                <button
                    className={styles.exportBtn}
                    onClick={handleExport}
                    disabled={exporting}
                >
                    <Download size={18} />
                    <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
                </button>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search orders by ID or customer name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.statusChips}>
                    {STATUS_FILTERS.map(f => {
                        const isActive = statusFilter === f.key;
                        const count = f.key === 'all' ? orders.length : (statusCounts[f.key] || 0);
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => handleStatusFilter(f.key)}
                                className={`${styles.filterChip} ${isActive ? styles.activeChip : ''}`}
                                style={{
                                    '--chip-color': f.dotColor,
                                    '--chip-bg': isActive ? '#fff' : '#f8fafc',
                                    '--chip-border': isActive ? f.dotColor : '#e2e8f0',
                                    '--chip-text': isActive ? f.dotColor : '#475569',
                                    '--chip-shadow': isActive ? `${f.dotColor}22` : 'transparent',
                                } as React.CSSProperties}
                            >
                                <span className={styles.chipDot} style={{ background: f.dotColor }} />
                                {f.label}
                                <span className={styles.chipCount} style={{
                                    background: isActive ? `${f.dotColor}15` : '#e2e8f0',
                                    color: isActive ? f.dotColor : '#64748b',
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Method</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '60px' }}><AdminLoader message="Loading Active Orders..." /></td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>No orders found matching your search.</td></tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id}>
                                    <td className={styles.id}>#{order.id}</td>
                                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className={styles.clientInfo}>
                                            <span className={styles.customerName}>{order.user_name}</span>
                                            <span className={styles.customerEmail}>{order.user_email}</span>
                                            {(order.receiver_name || order.receiver_phone) && (
                                                <span className={styles.receiverInfo}>
                                                    🚚 {order.receiver_name}{order.receiver_phone ? ` · ${order.receiver_phone}` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.amount}><CurrencyPrice amount={Number(order.final_amount)} /></div>
                                        {(Number(order.points_used) > 0 || Number(order.discount_amount) > 0) && (
                                            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
                                                {Number(order.points_used) > 0 && <div>• {order.points_used} Pts Redeemed</div>}
                                                {Number(order.discount_amount) > 0 && <div>• Coupon: -<CurrencyPrice amount={Number(order.discount_amount)} /></div>}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${getStatusStyle(order.status)}`}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.customDropdown}>
                                            <div
                                                className={`${styles.dropdownHeader} ${order.payment_status === 'paid' ? styles.paymentPaid :
                                                    order.payment_status === 'failed' ? styles.paymentFailed :
                                                        order.payment_status === 'pending' ? styles.paymentPending : ''
                                                    } ${activeDropdown?.id === order.id && activeDropdown?.type === 'payment' ? styles.isOpen : ''}`}
                                                onClick={(e) => toggleDropdown(order.id, 'payment', e)}
                                            >
                                                <span>{order.payment_status.toUpperCase()}</span>
                                                <div className={styles.dropdownValueArrow}></div>
                                            </div>
                                            <div className={`${styles.dropdownMenu} ${activeDropdown?.id === order.id && activeDropdown?.type === 'payment' ? styles.isOpen : ''}`}>
                                                {['pending', 'paid', 'failed', 'refunded'].map((status) => (
                                                    <div
                                                        key={status}
                                                        className={styles.dropdownOption}
                                                        onClick={() => {
                                                            handlePaymentStatusChange(order.id, status);
                                                            setActiveDropdown(null);
                                                        }}
                                                    >
                                                        {status.toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.methodBadge}>{formatPaymentMethod(order.payment_method)}</span>
                                    </td>
                                    <td>
                                        <div className={styles.customDropdown}>
                                            <div
                                                className={`${styles.dropdownHeader} ${order.status === 'delivered' ? styles.orderDelivered :
                                                    order.status === 'processing' ? styles.orderProcessing :
                                                        order.status === 'cancelled' ? styles.orderCancelled : ''
                                                    } ${activeDropdown?.id === order.id && activeDropdown?.type === 'status' ? styles.isOpen : ''}`}
                                                onClick={(e) => toggleDropdown(order.id, 'status', e)}
                                            >
                                                <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                                                <div className={styles.dropdownValueArrow}></div>
                                            </div>
                                            <div className={`${styles.dropdownMenu} ${activeDropdown?.id === order.id && activeDropdown?.type === 'status' ? styles.isOpen : ''}`}>
                                                {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                                                    <div
                                                        key={status}
                                                        className={styles.dropdownOption}
                                                        onClick={() => {
                                                            handleStatusChange(order.id, status, order);
                                                            setActiveDropdown(null);
                                                        }}
                                                    >
                                                        {status === 'delivered'
                                                            ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={13} />Delivered + Invoice</span>
                                                            : status.charAt(0).toUpperCase() + status.slice(1)
                                                        }
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Only offered once money has actually been taken. */}
                                        {(order.payment_status === 'paid' || order.payment_status === 'refunded') && (
                                            <button
                                                type="button"
                                                className={`${styles.refundBtn} ${order.payment_status === 'refunded' ? styles.refundBtnDone : ''}`}
                                                onClick={() => openRefund(order)}
                                                title={order.payment_status === 'refunded' ? 'See when this was refunded' : 'Refund this order'}
                                            >
                                                <RotateCcw size={13} />
                                                <span>{order.payment_status === 'refunded' ? 'Refunded' : 'Refund'}</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {refundModal.isOpen && (
                <div className={styles.invoiceOverlay} onClick={() => !refundModal.submitting && setRefundModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className={styles.refundModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.invoiceModalHeader}>
                            <div className={styles.invoiceModalTitle}>
                                <RotateCcw size={20} />
                                <span>Refund order #{refundModal.order?.id}</span>
                            </div>
                            <button className={styles.closeModal} onClick={() => setRefundModal(prev => ({ ...prev, isOpen: false }))} disabled={refundModal.submitting}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.refundBody}>
                            {refundModal.loading ? (
                                <AdminLoader message="Checking what can be refunded…" />
                            ) : refundModal.blocker ? (
                                <p className={styles.refundBlocked}>{refundModal.blocker}</p>
                            ) : (
                                <>
                                    <div className={styles.refundFigures}>
                                        <div><span>Order total</span><strong>AED {refundModal.captured.toFixed(2)}</strong></div>
                                        <div><span>Already refunded</span><strong>AED {refundModal.refunded.toFixed(2)}</strong></div>
                                        <div><span>Refundable now</span><strong>AED {refundModal.remaining.toFixed(2)}</strong></div>
                                    </div>

                                    {refundModal.refunds.length > 0 && (
                                        <div className={styles.refundHistory}>
                                            <span className={styles.refundHistoryTitle}>Refund history</span>
                                            {refundModal.refunds.map((rf: any) => (
                                                <div key={rf.id} className={styles.refundEntry}>
                                                    <div className={styles.refundEntryTop}>
                                                        <strong>AED {Number(rf.amount).toFixed(2)}</strong>
                                                        <span>{new Date(rf.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className={styles.refundEntryMeta}>
                                                        <span>via {rf.gateway}</span>
                                                        {rf.gateway_refund_id && <span title="Reference at the gateway">{rf.gateway_refund_id}</span>}
                                                    </div>
                                                    {rf.reason && <div className={styles.refundEntryReason}>{rf.reason}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {refundModal.remaining <= 0 ? (
                                        <p className={styles.refundDone}>
                                            This order is fully refunded. There is nothing left to send back.
                                        </p>
                                    ) : (
                                    <>
                                    <label className={styles.refundLabel}>Amount to refund (AED)</label>
                                    <input
                                        type="number"
                                        className={styles.refundInput}
                                        min="0.01"
                                        max={refundModal.remaining}
                                        step="0.01"
                                        value={refundModal.amount}
                                        onChange={e => setRefundModal(prev => ({ ...prev, amount: e.target.value }))}
                                        disabled={refundModal.submitting}
                                    />

                                    <label className={styles.refundLabel}>Reason (optional)</label>
                                    <input
                                        type="text"
                                        className={styles.refundInput}
                                        maxLength={255}
                                        placeholder="e.g. Item returned"
                                        value={refundModal.reason}
                                        onChange={e => setRefundModal(prev => ({ ...prev, reason: e.target.value }))}
                                        disabled={refundModal.submitting}
                                    />

                                    <p className={styles.refundWarning}>
                                        This sends money back to the customer through {formatPaymentMethod(refundModal.order?.payment_method)}.
                                        It cannot be undone.
                                    </p>

                                    <button
                                        type="button"
                                        className={styles.refundConfirm}
                                        onClick={submitRefund}
                                        disabled={
                                            refundModal.submitting
                                            || !(Number(refundModal.amount) > 0)
                                            || Number(refundModal.amount) > refundModal.remaining
                                        }
                                    >
                                        {refundModal.submitting
                                            ? <><Loader2 size={16} className={styles.spin} /> Refunding…</>
                                            : `Refund AED ${(Number(refundModal.amount) || 0).toFixed(2)}`}
                                    </button>
                                    </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                type={confirmModal.type}
                isLoading={isActionLoading}
            />

            {/* Invoice Modal */}
            {invoiceModal.isOpen && (
                <div className={styles.invoiceOverlay} onClick={() => !isSubmittingInvoice && setInvoiceModal({ isOpen: false, orderId: null, order: null })}>
                    <div className={styles.invoiceModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.invoiceModalHeader}>
                            <div className={styles.invoiceModalTitle}>
                                <FileText size={20} />
                                <span>Mark as Delivered — Issue Invoice</span>
                            </div>
                            <button className={styles.invoiceModalClose} onClick={() => setInvoiceModal({ isOpen: false, orderId: null, order: null })} disabled={isSubmittingInvoice}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.invoiceModalBody}>
                            <p className={styles.invoiceModalDesc}>
                                Order <strong>#{invoiceModal.orderId}</strong> will be marked as delivered.
                                Enter the invoice number to attach to this delivery — the invoice will be emailed to the customer.
                            </p>

                            <div className={styles.invoiceField}>
                                <label>Invoice Number <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    ref={invoiceInputRef}
                                    type="text"
                                    placeholder="e.g. INV-2025-0001"
                                    value={invoiceNumber}
                                    onChange={e => { setInvoiceNumber(e.target.value); setInvoiceError(null); }}
                                    onKeyDown={e => e.key === 'Enter' && submitDeliveredWithInvoice()}
                                    disabled={isSubmittingInvoice}
                                />
                            </div>

                            <div className={styles.invoiceField}>
                                <label>Invoice Given By</label>
                                <input
                                    type="text"
                                    placeholder="Staff / admin name"
                                    value={givenByName}
                                    onChange={e => setGivenByName(e.target.value)}
                                    disabled={isSubmittingInvoice}
                                />
                                <span className={styles.invoiceFieldHint}>The name that will appear on the invoice email sent to customer.</span>
                            </div>

                            {invoiceOrderItems.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Order items</label>
                                    <div style={{ marginTop: 6, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                        {invoiceOrderItems.map((it: any, idx: number) => {
                                            const isFree = Number(it.is_free_gift) === 1;
                                            return (
                                            <div key={idx} style={{ padding: '10px 12px', borderTop: idx === 0 ? 'none' : '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <span>{it.name}</span>
                                                        {isFree && (
                                                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#10b981', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4 }}>FREE</span>
                                                        )}
                                                    </div>
                                                    {(it.model_number || it.variant_sku || it.product_model) && (
                                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                            Model: {it.model_number || it.variant_sku || it.product_model}
                                                        </div>
                                                    )}
                                                    {isFree && it.bundle_parent_name && (
                                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                            Free gift with {it.bundle_parent_name}
                                                        </div>
                                                    )}
                                                    {it.custom_label && (
                                                        <div style={{ fontSize: 12, color: '#0f172a', background: '#fef3c7', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>
                                                            Custom: {it.custom_label}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: isFree ? '#10b981' : '#64748b', whiteSpace: 'nowrap', fontWeight: isFree ? 700 : 400 }}>
                                                    {isFree ? (
                                                        <>Qty {it.quantity} × FREE</>
                                                    ) : (
                                                        <>Qty {it.quantity} × <CurrencyPrice amount={Number(it.price_at_purchase)} /></>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {!invoiceNumber.trim() && (
                                <div style={{ marginTop: 12, padding: '14px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', fontSize: 13, textAlign: 'center' }}>
                                    Enter an invoice number above to preview the invoice.
                                </div>
                            )}
                        </div>

                        {invoiceError && (
                            <div style={{ margin: '0 20px 10px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                                <span style={{ fontSize: '16px' }}>⚠️</span> {invoiceError}
                            </div>
                        )}

                        <div className={styles.invoiceModalFooter}>
                            <button
                                className={styles.invoiceCancelBtn}
                                onClick={() => setInvoiceModal({ isOpen: false, orderId: null, order: null })}
                                disabled={isSubmittingInvoice}
                            >
                                Cancel
                            </button>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className={styles.invoiceCancelBtn}
                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    onClick={previewInvoice}
                                    disabled={isSubmittingInvoice || !invoiceNumber.trim()}
                                >
                                    <Eye size={14} /> Preview
                                </button>
                                <button
                                    className={styles.invoiceSubmitBtn}
                                    onClick={submitDeliveredWithInvoice}
                                    disabled={isSubmittingInvoice || !invoiceNumber.trim()}
                                >
                                    {isSubmittingInvoice ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                            {invoiceSubmitStep || 'Processing...'}
                                        </span>
                                    ) : 'Confirm Delivery & Send Invoice'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
