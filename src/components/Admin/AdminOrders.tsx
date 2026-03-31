'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminOrders.module.css';
import { Search, Package, Download } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';

const AdminOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const { showNotification } = useNotification();

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

    const handleStatusChange = (orderId: number, newStatus: string) => {
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

    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();
        return (
            order.id.toString().includes(term) ||
            (order.user_name && order.user_name.toLowerCase().includes(term)) ||
            (order.user_email && order.user_email.toLowerCase().includes(term))
        );
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
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading orders...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No orders found matching your search.</td></tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id}>
                                    <td className={styles.id}>#{order.id}</td>
                                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className={styles.clientInfo}>
                                            <span className={styles.customerName}>{order.user_name}</span>
                                            <span className={styles.customerEmail}>{order.user_email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.amount}>AED {Number(order.final_amount).toFixed(2)}</div>
                                        {(Number(order.points_used) > 0 || Number(order.discount_amount) > 0) && (
                                            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
                                                {Number(order.points_used) > 0 && <div>• {order.points_used} Pts Redeemed</div>}
                                                {Number(order.discount_amount) > 0 && <div>• Coupon: -AED {Number(order.discount_amount).toFixed(2)}</div>}
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
                                                className={`${styles.dropdownHeader} ${
                                                    order.payment_status === 'paid' ? styles.paymentPaid :
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
                                        <div className={styles.customDropdown}>
                                            <div 
                                                className={`${styles.dropdownHeader} ${
                                                    order.status === 'delivered' ? styles.orderDelivered :
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
                                                            handleStatusChange(order.id, status);
                                                            setActiveDropdown(null);
                                                        }}
                                                    >
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
        </div>
    );
};

export default AdminOrders;
