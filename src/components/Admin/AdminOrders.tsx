'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminOrders.module.css';
import { Search, Eye, Truck, Check, Package, XCircle, Clock, Download } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';

const AdminOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const { showNotification } = useNotification();

    const handleExport = async () => {
        try {
            setExporting(true);
            const response = await fetch(`${API_BASE_URL}/admin/export/orders`, {
                credentials: "include"
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
                credentials: "include"
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

    const handleStatusChange = async (orderId: number, newStatus: string) => {
        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                credentials: "include",
                method: 'PUT',
                headers: {
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
        }
    };

    const handlePaymentStatusChange = async (orderId: number, newStatus: string) => {
        if (!confirm(`Are you sure you want to change payment status to ${newStatus}?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                credentials: "include",
                method: 'PUT',
                headers: {
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
        }
    };

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
                    <input type="text" placeholder="Search orders by ID or customer name..." />
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
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No orders found.</td></tr>
                        ) : (
                            orders.map((order) => (
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
                                        <select
                                            className={styles.actionSelect}
                                            style={{ minWidth: '100px', fontWeight: 'bold', color: order.payment_status === 'paid' ? '#16a34a' : order.payment_status === 'failed' ? '#dc2626' : '#ea580c' }}
                                            value={order.payment_status}
                                            onChange={(e) => handlePaymentStatusChange(order.id, e.target.value)}
                                        >
                                            <option value="pending">PENDING</option>
                                            <option value="paid">PAID</option>
                                            <option value="failed">FAILED</option>
                                            <option value="refunded">REFUNDED</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            className={styles.actionSelect}
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="processing">Processing</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
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

export default AdminOrders;
