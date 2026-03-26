'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminAnalytics.module.css';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import {
    TrendingUp,
    Users,
    ShoppingCart,
    DollarSign,
    BarChart3,
    PieChart,
    ArrowUpRight,
    Calendar
} from 'lucide-react';

const AdminAnalytics = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/stats?timeRange=${timeRange}`, {
                    credentials: "include",
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    setStats(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch analytics', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [timeRange]);

    if (loading) return (
        <div className={styles.loading}>
            <BarChart3 size={40} style={{ opacity: 0.2, animation: 'pulse 1.5s infinite' }} />
            <p>Gathering store intelligence...</p>
        </div>
    );

    // Process category percentages
    const totalRevenue = stats?.categorySales?.reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0) || 1;
    const processedCategories = stats?.categorySales?.map((cat: any) => ({
        ...cat,
        percentage: ((Number(cat.revenue) / totalRevenue) * 100).toFixed(1)
    })) || [];

    // Colors for categories
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    return (
        <div className={styles.analyticsContainer}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Store Insights</h1>
                    <p>Track your business growth and customer engagement metrics.</p>
                </div>
                <div className={styles.controls}>
                    <div className={styles.datePicker}>
                        <Calendar size={14} />
                        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                            <option value="7d">Last 7 Days</option>
                            <option value="14d">Last 14 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="3m">Last 3 Months</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="1y">Last Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className={styles.mainMetrics}>
                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <div className={`${styles.iconBox} ${styles.green}`}>
                            <DollarSign size={22} />
                        </div>
                        <span className={styles.trend}>
                            <ArrowUpRight size={12} /> Live
                        </span>
                    </div>
                    <div className={styles.metricBody}>
                        <h3>AED {Number(stats?.totalSales || 0).toLocaleString()}</h3>
                        <p>Total Revenue Generated</p>
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <div className={`${styles.iconBox} ${styles.blue}`}>
                            <ShoppingCart size={22} />
                        </div>
                    </div>
                    <div className={styles.metricBody}>
                        <h3>{stats?.totalOrders || 0}</h3>
                        <p>Completed Orders</p>
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <div className={`${styles.iconBox} ${styles.purple}`}>
                            <Users size={22} />
                        </div>
                    </div>
                    <div className={styles.metricBody}>
                        <h3>{stats?.totalUsers || 0}</h3>
                        <p>Registered Customers</p>
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                        <div className={`${styles.iconBox} ${styles.orange}`}>
                            <TrendingUp size={22} />
                        </div>
                    </div>
                    <div className={styles.metricBody}>
                        <h3>{processedCategories[0]?.name || 'N/A'}</h3>
                        <p>Top Performing Category</p>
                    </div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={styles.chartCardLarge}>
                    <div className={styles.cardHeader}>
                        <h3>Revenue Distribution</h3>
                        <BarChart3 size={18} color="#94a3b8" />
                    </div>
                    <div className={styles.chartPlaceholder}>
                        <div className={styles.barChart}>
                            {stats?.salesHistory?.length > 0 ? (
                                stats.salesHistory.map((day: any, i: number) => {
                                    const maxVal = Math.max(...stats.salesHistory.map((d: any) => Number(d.amount))) || 1;
                                    const height = (Number(day.amount) / maxVal) * 90;
                                    return (
                                        <div key={i} className={styles.barContainer}>
                                            <div className={styles.bar} style={{ height: `${height}%` }}>
                                                <div className={styles.barTooltip}>AED {Number(day.amount).toLocaleString()}</div>
                                            </div>
                                            <span className={styles.barLabel}>
                                                {timeRange === '7d' || timeRange === '14d'
                                                    ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })
                                                    : new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                }
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                    No historical data collected for this period.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.chartCardSmall}>
                    <div className={styles.cardHeader}>
                        <h3>Category Breakdown</h3>
                        <PieChart size={18} color="#64748b" />
                    </div>
                    <div className={styles.categoryStats}>
                        {processedCategories.length > 0 ? (
                            processedCategories.slice(0, 5).map((cat: any, i: number) => (
                                <div key={i} className={styles.catItem}>
                                    <div className={styles.catInfo}>
                                        <span>{cat.name}</span>
                                        <span>{cat.percentage}%</span>
                                    </div>
                                    <div className={styles.progressBase}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${cat.percentage}%`, background: colors[i % colors.length] }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#adb5bd', textAlign: 'center' }}>No category data yet</p>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.bottomSection}>
                <div className={styles.cardFull}>
                    <div className={styles.cardHeader}>
                        <h3>High Velocity Products</h3>
                        <TrendingUp size={18} color="#94a3b8" />
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product Identity</th>
                                    <th>Volume Sold</th>
                                    <th>Market Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.topProducts?.map((p: any, i: number) => (
                                    <tr key={i}>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '4px', height: '16px', background: '#3b82f6', borderRadius: '2px' }}></div>
                                                <strong>{p.sold_count}</strong>
                                                <span style={{ color: '#64748b', fontSize: '12px' }}>units</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                color: '#059669',
                                                background: '#ecfdf5',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: 700
                                            }}>
                                                TOP SELLER
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
