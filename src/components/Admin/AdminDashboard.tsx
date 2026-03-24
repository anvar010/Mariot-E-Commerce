'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminDashboard.module.css';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    ArrowRight,
    Circle,
    CheckCircle2,
    Users,
    Filter,
    Edit3,
    Trash2,
    Search,
    Activity,
    Globe,
    AlertTriangle
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';
import { stripHtml } from '@/utils/formatters';

const AdminDashboard = () => {
    const { user, token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const router = useRouter();

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/stats`, {
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleDeleteReview = async (reviewId: number) => {
        if (!token) return;
        if (!window.confirm('Are you sure you want to delete this review?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
                method: 'DELETE',
                credentials: "include"
            });

            const data = await res.json();
            if (data.success) {
                fetchStats(); // Refresh dashboard
            } else {
                alert(data.message || 'Failed to delete review');
            }
        } catch (err) {
            console.error('Error deleting review:', err);
            alert('Something went wrong');
        }
    };

    if (loading) {
        return <div className={styles.dashboard}><div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div></div>;
    }

    return (
        <div className={styles.dashboard}>
            <motion.div
                className={styles.alertBanner}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className={styles.bannerContent}>
                    <h2>Welcome back, {user?.name || 'Admin'}!</h2>
                    <p>Your store is performing well today. We've seen a steady increase in orders and new user registrations over the last 24 hours.</p>
                </div>
                <button className={styles.bannerBtn} onClick={() => router.push('/admin/analytics')}>
                    View Data Insights
                </button>
            </motion.div>

            <div className={styles.statsGrid}>
                {/* Total Sales */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>Revenue</span>
                        <div className={`${styles.iconWrapper} ${styles.bgBlue}`}>
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>AED {Number(stats?.totalSales || 0).toLocaleString()}</h3>
                        <div className={styles.statFooter}>
                            <span className={styles.trendUp}>+12.5%</span> vs last month
                        </div>
                    </div>
                </motion.div>

                {/* Total Orders */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>Total Orders</span>
                        <div className={`${styles.iconWrapper} ${styles.bgGreen}`}>
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>{stats?.totalOrders || 0}</h3>
                        <div className={styles.statFooter}>
                            <span className={styles.trendUp}>+5.2%</span> daily average
                        </div>
                    </div>
                </motion.div>

                {/* Total Users */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>New Customers</span>
                        <div className={`${styles.iconWrapper} ${styles.bgPurple}`}>
                            <Users size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>{stats?.totalUsers || 0}</h3>
                        <div className={styles.statFooter}>
                            <span className={styles.trendNeutral}>Consistently growing</span>
                        </div>
                    </div>
                </motion.div>

                {/* Total Products */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>Total Inventory</span>
                        <div className={`${styles.iconWrapper} ${styles.bgOrange}`}>
                            <Globe size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>{stats?.totalProducts || 0}</h3>
                        <div className={styles.statFooter}>
                            <span className={styles.trendNeutral}>{stats?.activeProducts || 0} active SKU</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Top Products & Alerts */}
            <div className={styles.middleSection}>
                <motion.div
                    className={styles.chartArea}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className={styles.chartHeader}>
                        <h3>Top Selling Products</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>PRODUCT NAME</th>
                                    <th>UNITS SOLD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.topProducts?.map((p: any, i: number) => (
                                    <tr key={i}>
                                        <td>{stripHtml(p.name)}</td>
                                        <td><strong>{p.sold_count}</strong> {p.sold_count === 1 ? 'unit' : 'units'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                <motion.div
                    className={`${styles.chartArea} ${styles.inventoryAlert}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div className={`${styles.chartHeader} ${styles.inventoryHeader}`}>
                        <h3>Inventory Alerts</h3>
                    </div>
                    <div className={styles.actionList}>
                        {stats?.lowStockAlerts?.map((p: any, i: number) => (
                            <div key={i} className={styles.activityItem} style={{ background: 'rgba(255, 77, 79, 0.05)', border: '1px solid rgba(255, 77, 79, 0.1)' }}>
                                <AlertTriangle size={16} color="#ef4444" />
                                <div className={styles.activityText}>
                                    <p><strong>{stripHtml(p.name)}</strong> is low on stock</p>
                                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>{p.stock_quantity} remaining</span>
                                </div>
                            </div>
                        ))}
                        {stats?.lowStockAlerts?.length === 0 && (
                            <p style={{ color: '#94a3b8', fontSize: '12px' }}>All products are well stocked.</p>
                        )}
                    </div>
                </motion.div>
            </div>

            <div className={styles.middleSection}>
                <motion.div
                    className={styles.chartArea}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    <div className={styles.chartHeader}>
                        <h3>Sales Overview (Last 7 Days)</h3>
                    </div>
                    <div className={styles.chartContainer}>
                        {/* ... existing chart logic mapping omitted for brevity but preserved in full file ... */}
                        {(() => {
                            const last7Days = [...Array(7)].map((_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() - (6 - i));
                                return d.toISOString().split('T')[0];
                            });

                            const fullHistory = last7Days.map(date => {
                                const existing = stats?.salesHistory?.find((s: any) => s.date.startsWith(date));
                                return {
                                    date,
                                    amount: existing ? parseFloat(existing.amount) : 0
                                };
                            });

                            const maxAmount = Math.max(...fullHistory.map(d => d.amount)) || 1;

                            return fullHistory.map((day, i) => {
                                const heightPercentage = (day.amount / maxAmount) * 100;
                                return (
                                    <div key={i} className={styles.barWrapper}>
                                        <motion.div
                                            className={styles.bar}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max(heightPercentage, 2)}%` }}
                                            transition={{ duration: 0.8, delay: 0.8 + (i * 0.1) }}
                                        >
                                            {day.amount > 0 && (
                                                <span className={styles.barValue}>AED {day.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                            )}
                                        </motion.div>
                                        <span className={styles.barLabel}>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </motion.div>

                <motion.div
                    className={styles.chartArea}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <div className={styles.chartHeader}>
                        <h3>Revenue by Category</h3>
                    </div>
                    <div className={styles.categoryList}>
                        {stats?.categorySales?.slice(0, 4).map((cat: any, i: number) => (
                            <div key={i} className={styles.categoryItem}>
                                <div className={styles.categoryInfo}>
                                    <span className={styles.catName}>{cat.name}</span>
                                    <span className={styles.catRevenue}>Performance Index</span>
                                </div>
                                <span className={styles.revenueBadge}>AED {Number(cat.revenue).toLocaleString()}</span>
                            </div>
                        ))}
                        {(!stats?.categorySales || stats.categorySales.length === 0) && (
                            <p style={{ color: '#94a3b8', fontSize: '12px' }}>No category data available.</p>
                        )}
                    </div>
                </motion.div>
            </div>

            <div className={styles.latestOrders}>
                <div className={styles.tableHeader}>
                    <h3>Recent Product Reviews</h3>
                    <button className={styles.filterBtn}>View All Reviews</button>
                </div>
                <div className={styles.activityList}>
                    {stats?.recentReviews?.length > 0 ? (
                        stats.recentReviews.map((review: any) => (
                            <div key={review.id} className={styles.activityItem}>
                                <div className={styles.activityDot}></div>
                                <div className={styles.activityText}>
                                    <p>
                                        <strong>{review.user_name}</strong> reviewed <strong>{stripHtml(review.product_name)}</strong>
                                    </p>
                                    <span className={styles.activityRating}>
                                        {"⭐".repeat(review.rating)} - "{review.comment}"
                                    </span>
                                    <span className={styles.activityTime}>
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {user?.role === 'admin' && (
                                    <button
                                        className={styles.deleteBtn}
                                        style={{ marginInlineStart: 'auto', padding: '5px', color: '#ff4d4f' }}
                                        onClick={() => handleDeleteReview(review.id)}
                                        title="Delete review"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className={styles.emptyState}>No recent reviews found.</p>
                    )}
                </div>
            </div>

            <div className={styles.latestOrders}>
                <div className={styles.tableHeader}>
                    <h3>Latest Orders</h3>
                    <button className={styles.filterBtn}><Filter size={14} /> View All</button>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ORDER ID</th>
                                <th>DATE</th>
                                <th>CUSTOMER</th>
                                <th>TOTAL</th>
                                <th>STATUS</th>
                                <th>PAYMENT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentOrders?.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No recent orders found.</td></tr>
                            ) : (
                                stats?.recentOrders?.map((order: any) => (
                                    <tr key={order.id}>
                                        <td className={styles.id}>#{order.id}</td>
                                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td className={styles.client}>
                                            <div className={styles.avatarPlaceholder}>{order.user_name?.charAt(0) || 'U'}</div>
                                            {order.user_name || 'Unknown'}
                                        </td>
                                        <td>AED {Number(order.total_amount).toFixed(2)}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[order.status] || styles.pending}`}>
                                                {order.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`${styles.paymentBadge} ${styles[order.payment_status] || styles.pending}`}>
                                                {order.payment_status?.toUpperCase() || 'PENDING'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
