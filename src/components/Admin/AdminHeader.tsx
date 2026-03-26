'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminHeader.module.css';
import {
    Search,
    Bell,
    Mail,
    ChevronDown,
    Grid,
    Calendar,
    Wallet
} from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';

const AdminHeader = () => {
    const [counts, setCounts] = useState({ notifications: 0, messages: 0 });
    const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, activeProducts: 0 });
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCountsAndNotifications = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/stats`, {
                    credentials: "include",
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    const recentReviews = data.data.recentReviews || [];
                    const lowStockAlerts = data.data.lowStockAlerts || [];

                    // Combine into notifications array
                    const newNotifications = [
                        ...lowStockAlerts.map((item: any) => ({
                            id: `stock-${item.name}`,
                            title: `Low Stock: ${item.name}`,
                            type: 'stock',
                            time: 'Just now',
                            isRead: false
                        })),
                        ...recentReviews.map((review: any) => ({
                            id: `review-${review.id}`,
                            title: `New review on ${review.product_name}`,
                            type: 'review',
                            time: new Date(review.created_at).toLocaleDateString(),
                            isRead: false
                        }))
                    ];

                    setNotifications(newNotifications);
                    setCounts({
                        notifications: newNotifications.length,
                        messages: 0
                    });
                    setStats({
                        totalSales: data.data.totalSales || 0,
                        totalOrders: data.data.totalOrders || 0,
                        activeProducts: data.data.activeProducts || 0
                    });
                }
            } catch (error) {
                console.error('Failed to fetch header counts', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCountsAndNotifications();

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(`.${styles.actions}`)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const markAllAsRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
        setNotifications(updatedNotifications);
        setCounts({ ...counts, notifications: 0 });
    };

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <div className={styles.stats}>
                    <div className={styles.statItem} title="Total Revenue">
                        <Wallet size={16} color="#20c997" />
                        <span className={styles.statValue}>AED {Number(stats.totalSales).toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem} title="Total Orders">
                        <Calendar size={16} color="#4c6ef5" />
                        <span className={styles.statValue}>{stats.totalOrders} Orders</span>
                    </div>
                </div>
            </div>

            <div className={styles.right}>
                <div className={styles.actions}>
                    <div className={styles.actionItem}>
                        <Mail size={20} />
                        {counts.messages > 0 && <span className={styles.badge}>{counts.messages}</span>}
                    </div>

                    <div className={styles.actionItem} onClick={toggleNotifications}>
                        <Bell size={20} />
                        {counts.notifications > 0 && <span className={styles.badge}>{counts.notifications}</span>}

                        {showNotifications && (
                            <div className={styles.dropdown}>
                                <div className={styles.dropdownHeader}>
                                    <span className={styles.dropdownTitle}>Notifications</span>
                                    <div className={styles.headerActions}>
                                        <span className={styles.actionLink} onClick={markAllAsRead}>Read All</span>
                                        <span className={styles.actionLink} onClick={(e) => { e.stopPropagation(); setNotifications([]); setCounts({ ...counts, notifications: 0 }); }}>Clear All</span>
                                    </div>
                                </div>
                                <div className={styles.dropdownList}>
                                    {notifications.length > 0 ? (
                                        notifications.map((notif, index) => (
                                            <div
                                                key={index}
                                                className={`${styles.notificationItem} ${notif.isRead ? styles.isRead : ''}`}
                                            >
                                                <div className={styles.notificationIcon} style={{
                                                    backgroundColor: notif.isRead ? '#dee2e6' : (notif.type === 'stock' ? '#fa5252' : '#4c6ef5')
                                                }} />
                                                <div className={styles.notificationContent}>
                                                    <div className={styles.notificationTitle} dangerouslySetInnerHTML={{ __html: notif.title }} />
                                                    <div className={styles.notificationTime}>{notif.time}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.emptyState}>No new notifications</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.actionItem}>
                        <Grid size={20} />
                    </div>
                </div>

                <div className={styles.userSection}>
                    <span className={styles.currentView}>Dashboard</span>
                    <img src="https://ui-avatars.com/api/?name=Admin+User&background=random" alt="Admin" className={styles.avatar} />
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
