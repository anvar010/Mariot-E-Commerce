'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminDashboard.module.css';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
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
    AlertTriangle,
    Calendar,
    ChevronDown,
    LayoutDashboard,
    Clock,
    Check,
    RefreshCw
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';
import { stripHtml } from '@/utils/formatters';
import { getAuthHeaders } from '@/utils/authHeaders';
import { useTranslations } from 'next-intl';

const AdminDashboard = () => {
    const { user, token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { showNotification } = useNotification();
    const router = useRouter();
    const t = useTranslations('admin');

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
        type: 'danger'
    });
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isDropdownOpen && !(event.target as HTMLElement).closest(`.${styles.dropdownWrapper}`)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const fetchStats = async (range = timeRange) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/stats?timeRange=${range}&_t=${new Date().getTime()}`, {
                credentials: "include",
                headers: getAuthHeaders(),
                cache: 'no-store'
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
            showNotification(t('dashboard.notifications.fetchStatsError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    const handleDeleteReview = (reviewId: number) => {
        if (!token) return;

        setConfirmModal({
            isOpen: true,
            title: t('dashboard.modals.deleteReview.title'),
            message: t('dashboard.modals.deleteReview.message'),
            type: 'danger',
            confirmLabel: t('dashboard.modals.deleteReview.confirm'),
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });

                    const data = await res.json();
                    if (data.success) {
                        showNotification(t('dashboard.notifications.deleteReviewSuccess'));
                        fetchStats(); // Refresh dashboard
                    } else {
                        showNotification(data.message || t('dashboard.notifications.deleteReviewError'), 'error');
                    }
                } catch (err) {
                    console.error('Error deleting review:', err);
                    showNotification(t('dashboard.notifications.genericError'), 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const timeOptions = [
        { label: t('dashboard.timeRanges.7d'), value: '7d' },
        { label: t('dashboard.timeRanges.14d'), value: '14d' },
        { label: t('dashboard.timeRanges.30d'), value: '30d' },
        { label: t('dashboard.timeRanges.3m'), value: '3m' },
        { label: t('dashboard.timeRanges.6m'), value: '6m' },
        { label: t('dashboard.timeRanges.1y'), value: '1y' },
        { label: t('dashboard.timeRanges.all'), value: 'all' },
    ];

    if (loading && !stats) {
        return <div className={styles.dashboard}><div style={{ padding: '80px', textAlign: 'center' }}><AdminLoader message={t('dashboard.loader')} /></div></div>;
    }

    return (
        <div className={styles.dashboard}>
            <header className={styles.dashboardHeader}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.pageTitle}>{t('dashboard.title')}</h1>
                    <p className={styles.pageSub}>{t('dashboard.subtitle')}</p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.dropdownWrapper}>
                        <div
                            className={`${styles.rangeSelector} ${isDropdownOpen ? styles.active : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Clock size={16} className={styles.icon} />
                            <span className={styles.currentRangeLabel}>
                                {timeOptions.find(opt => opt.value === timeRange)?.label}
                            </span>
                            <ChevronDown size={14} className={`${styles.chevron} ${isDropdownOpen ? styles.rotate : ''}`} />
                        </div>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    className={styles.dropdownMenu}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                >
                                    {timeOptions.map((opt) => (
                                        <div
                                            key={opt.value}
                                            className={`${styles.dropdownItem} ${timeRange === opt.value ? styles.selected : ''}`}
                                            onClick={() => {
                                                setTimeRange(opt.value);
                                                setIsDropdownOpen(false);
                                            }}
                                        >
                                            <span className={styles.itemLabel}>{opt.label}</span>
                                            {timeRange === opt.value && (
                                                <Check size={12} className={styles.checkIcon} />
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button className={styles.refreshBtn} onClick={() => fetchStats()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={14} className={loading ? styles.spin : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
                        {loading ? t('dashboard.refreshing') : t('dashboard.refresh')}
                    </button>
                </div>
            </header>

            <motion.div
                className={styles.alertBanner}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className={styles.bannerContent}>
                    <h2>{t('dashboard.welcome', { name: user?.name?.split(' ')[0] || 'Admin' })}</h2>
                    <p dangerouslySetInnerHTML={{ __html: t('dashboard.revenueNote', { amount: Number(stats?.totalSales || 0).toLocaleString() }) }} />
                </div>
                <div className={styles.bannerButtons}>
                    <button className={styles.bannerBtnSecondary} onClick={() => router.push('/admin/products?action=add')}>
                        {t('dashboard.actions.addProduct')}
                    </button>
                    <button className={styles.bannerBtn} onClick={() => router.push('/admin/analytics')}>
                        {t('dashboard.actions.advancedAnalytics')}
                    </button>
                </div>
            </motion.div>

            <div className={styles.statsGrid}>
                {/* Total Sales */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>{t('dashboard.stats.revenue')}</span>
                        <div className={`${styles.iconWrapper} ${styles.bgBlue}`}>
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>AED {Number(stats?.totalSales || 0).toLocaleString()}</h3>
                        <div className={styles.statFooter}>
                            <span className={(stats?.salesGrowth ?? 0) >= 0 ? styles.trendUp : styles.trendDown}>
                                {(stats?.salesGrowth ?? 0) >= 0 ? '+' : ''}{stats?.salesGrowth ?? 0}%
                            </span> {t('dashboard.stats.vsPrev')}
                        </div>
                    </div>
                </motion.div>

                {/* Total Orders */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>{t('dashboard.stats.orders')}</span>
                        <div className={`${styles.iconWrapper} ${styles.bgGreen}`}>
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>{stats?.totalOrders || 0}</h3>
                        <div className={styles.statFooter}>
                            <span className={(stats?.ordersGrowth ?? 0) >= 0 ? styles.trendUp : styles.trendDown}>
                                {(stats?.ordersGrowth ?? 0) >= 0 ? '+' : ''}{stats?.ordersGrowth ?? 0}%
                            </span> {t('dashboard.stats.vsPrev')}
                        </div>
                    </div>
                </motion.div>

                {/* Total Users */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>{t('dashboard.stats.customers')}</span>
                        <div className={`${styles.iconWrapper} ${styles.bgPurple}`}>
                            <Users size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>{stats?.totalUsers || 0}</h3>
                        <div className={styles.statFooter}>
                            <span className={(stats?.userGrowth ?? 0) >= 0 ? styles.trendUp : styles.trendDown}>
                                {(stats?.userGrowth ?? 0) >= 0 ? '+' : ''}{stats?.userGrowth ?? 0}%
                            </span> {t('dashboard.stats.vsPrev')}
                        </div>
                    </div>
                </motion.div>

                {/* Total Products */}
                <motion.div
                    className={styles.statCard}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className={styles.statHeader}>
                        <span className={styles.statTitle}>{t('dashboard.stats.catalog')}</span>
                        <div className={`${styles.iconWrapper} ${styles.bgOrange}`}>
                            <LayoutDashboard size={18} />
                        </div>
                    </div>
                    <div className={styles.statBody}>
                        <h3 className={styles.statValue}>{stats?.totalProducts || 0}</h3>
                        <div className={styles.statFooter}>
                            <span className={styles.trendNeutral}>{stats?.activeProducts || 0} {t('dashboard.stats.active')}</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Analytics Row */}
            <div className={styles.middleSection}>
                <motion.div
                    className={styles.chartArea}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className={styles.chartHeader}>
                        <div className={styles.chartTitleBox}>
                            <Activity size={16} />
                            <h3>{t('dashboard.charts.salesTrend', { range: timeOptions.find(o => o.value === timeRange)?.label || '' })}</h3>
                        </div>
                    </div>
                    <div className={styles.chartContainer}>
                        {(() => {
                            let data = [...(stats?.salesHistory || [])];

                            // For short-term ranges (7, 14, 30 days), fill in missing dates with 0 values
                            const rangeDaysMap: { [key: string]: number } = { '7d': 7, '14d': 14, '30d': 30 };
                            if (rangeDaysMap[timeRange]) {
                                const daysToFill = rangeDaysMap[timeRange];
                                const filledData = [];
                                const now = new Date();

                                for (let i = daysToFill - 1; i >= 0; i--) {
                                    const date = new Date(now);
                                    date.setDate(date.getDate() - i);
                                    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD

                                    const existing = data.find(h => {
                                        const hDate = new Date(h.date).toLocaleDateString('en-CA');
                                        return hDate === dateStr;
                                    });

                                    filledData.push({
                                        date: dateStr,
                                        amount: existing ? existing.amount : 0
                                    });
                                }
                                data = filledData;
                            }

                            if (data.length === 0) {
                                return <div className={styles.emptyChart}>{t('dashboard.charts.noData')}</div>;
                            }

                            const maxAmount = Math.max(...data.map((d: any) => parseFloat(d.amount))) || 1;

                            return data.map((day: any, i: number) => {
                                const heightPercentage = (parseFloat(day.amount) / maxAmount) * 100;
                                return (
                                    <div key={i} className={styles.barWrapper}>
                                        <motion.div
                                            className={styles.bar}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max(heightPercentage, 4)}%` }}
                                            transition={{ duration: 0.8, delay: 0.6 + (i * 0.05) }}
                                        >
                                            {day.amount > 0 && (
                                                <div className={styles.barTooltip}>
                                                    AED {Number(day.amount).toLocaleString()}
                                                </div>
                                            )}
                                        </motion.div>
                                        <span className={styles.barLabel}>
                                            {new Date(day.date).toLocaleDateString(undefined, {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </motion.div>

                <motion.div
                    className={`${styles.chartArea} ${styles.inventoryAlert}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div className={`${styles.chartHeader} ${styles.inventoryHeader}`}>
                        <div className={styles.chartTitleBox}>
                            <AlertTriangle size={16} />
                            <h3>{t('dashboard.alerts.inventory')}</h3>
                        </div>
                        <button className={styles.smallActionBtn} onClick={() => router.push('/admin/products')}>{t('dashboard.actions.manage')}</button>
                    </div>
                    <div className={styles.actionList}>
                        {stats?.lowStockAlerts?.map((p: any, i: number) => (
                            <div key={i} className={styles.activityItem} style={{ background: '#fff' }}>
                                <div className={styles.stockIndicator} />
                                <div className={styles.activityText}>
                                    <p><strong>{stripHtml(p.name)}</strong></p>
                                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>{t('dashboard.alerts.remaining', { count: p.stock_quantity })}</span>
                                </div>
                                <button className={styles.quickRestockBtn} onClick={() => router.push(`/admin/products?edit=${p.id}`)}>
                                    <Edit3 size={14} />
                                </button>
                            </div>
                        ))}
                        {(!stats?.lowStockAlerts || stats.lowStockAlerts.length === 0) && (
                            <div className={styles.allClear}>
                                <CheckCircle2 size={24} color="#10b981" />
                                <p>{t('dashboard.alerts.allClear')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <div className={styles.middleSection}>
                <motion.div
                    className={styles.chartArea}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <div className={styles.chartHeader}>
                        <div className={styles.chartTitleBox}>
                            <Filter size={16} />
                            <h3>{t('dashboard.charts.revenueByCategory')}</h3>
                        </div>
                    </div>
                    <div className={styles.categoryList}>
                        {stats?.categorySales?.slice(0, 5).map((cat: any, i: number) => {
                            const totalRev = stats.categorySales.reduce((acc: number, curr: any) => acc + parseFloat(curr.revenue), 0) || 1;
                            const share = ((parseFloat(cat.revenue) / totalRev) * 100).toFixed(1);

                            return (
                                <div key={i} className={styles.categoryItemV2}>
                                    <div className={styles.catInfoV2}>
                                        <div className={styles.catLabels}>
                                            <span className={styles.catName}>{cat.name}</span>
                                            <span className={styles.catShare}>{t('dashboard.charts.shareOfTotal', { percent: share })}</span>
                                        </div>
                                        <div className={styles.catProgressWrap}>
                                            <motion.div
                                                className={styles.catProgressBar}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${share}%` }}
                                                transition={{ duration: 1, delay: 0.8 + (i * 0.1) }}
                                            />
                                        </div>
                                    </div>
                                    <span className={styles.revenueBadgeV2}>AED {Number(cat.revenue).toLocaleString()}</span>
                                </div>
                            );
                        })}
                        {(!stats?.categorySales || stats.categorySales.length === 0) && (
                            <p className={styles.emptyState}>{t('dashboard.charts.noCategoryData')}</p>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    className={styles.chartArea}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <div className={styles.chartHeader}>
                        <div className={styles.chartTitleBox}>
                            <TrendingUp size={16} />
                            <h3>{t('dashboard.charts.topProducts')}</h3>
                        </div>
                    </div>
                    <div className={styles.topProductsSimple}>
                        {stats?.topProducts?.map((p: any, i: number) => (
                            <div key={i} className={styles.productSimpleItem}>
                                <div className={styles.productRank}>{i + 1}</div>
                                <div className={styles.productInfoSimple}>
                                    <p className={styles.productNameSimple}>{stripHtml(p.name)}</p>
                                    <span className={styles.productCountSimple}>{t('dashboard.charts.unitsSold', { count: p.sold_count })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <div className={styles.latestOrders}>
                <div className={styles.tableHeader}>
                    <div className={styles.chartTitleBox}>
                        <Activity size={16} />
                        <h3>{t('dashboard.reviews.recent')}</h3>
                    </div>
                    <button className={styles.filterBtn} onClick={() => router.push('/admin/reviews')}>{t('dashboard.reviews.all')}</button>
                </div>
                <div className={styles.activityList}>
                    {stats?.recentReviews?.length > 0 ? (
                        stats.recentReviews.map((review: any) => (
                            <div key={review.id} className={styles.activityItem}>
                                <div className={styles.avatarMini}>{review.user_name?.charAt(0) || 'U'}</div>
                                <div className={styles.activityText}>
                                    <p>
                                        <strong>{review.user_name}</strong> {t('dashboard.reviews.reviewed')} <strong>{stripHtml(review.product_name)}</strong>
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
                                        title={t('dashboard.reviews.delete')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className={styles.emptyState}>{t('dashboard.reviews.empty')}</p>
                    )}
                </div>
            </div>

            <div className={styles.latestOrders}>
                <div className={styles.tableHeader}>
                    <div className={styles.chartTitleBox}>
                        <Clock size={16} />
                        <h3>{t('dashboard.orders.recent')}</h3>
                    </div>
                    <button className={styles.filterBtn} onClick={() => router.push('/admin/orders')}><Filter size={14} /> {t('dashboard.orders.all')}</button>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('dashboard.orders.table.id')}</th>
                                <th>{t('dashboard.orders.table.date')}</th>
                                <th>{t('dashboard.orders.table.customer')}</th>
                                <th>{t('dashboard.orders.table.total')}</th>
                                <th>{t('dashboard.orders.table.status')}</th>
                                <th>{t('dashboard.orders.table.payment')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentOrders?.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>{t('dashboard.orders.empty')}</td></tr>
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

export default AdminDashboard;
