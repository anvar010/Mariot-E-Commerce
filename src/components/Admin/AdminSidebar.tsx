'use client';

import React, { useState, useEffect } from 'react';
import { fetchActivityCounts, markSeen, ensureSeenInitialised } from '@/utils/adminActivity';
import styles from './AdminSidebar.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    BarChart3,
    Settings,
    LogOut,
    Ticket,
    FolderTree,
    Tag,
    FileText,
    Receipt,
    Layout,
    FilePlus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MenuItem {
    name: string;
    key: string;
    icon: React.ReactNode;
    path: string;
}

function getStaffPerms(user: any): string[] {
    const raw = user?.staff_permissions;
    if (!raw) return [];
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
}

const AdminSidebar = () => {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    
    // Badge counts, refreshed on a slow poll. 60s is deliberately unhurried: this is a
    // "something arrived" hint, not a live feed, and the sidebar is mounted on every admin
    // page, so anything faster multiplies into constant background traffic.
    const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        ensureSeenInitialised();
        let cancelled = false;
        const load = async () => {
            const counts = await fetchActivityCounts();
            if (!cancelled) setActivityCounts(counts);
        };
        load();
        const id = setInterval(load, 60000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    // Opening a section is what marks it read, so the badge clears where it was answered.
    const handleSectionOpen = (key: string) => {
        if (activityCounts[key]) {
            markSeen(key);
            setActivityCounts((prev: Record<string, number>) => ({ ...prev, [key]: 0 }));
        }
    };

const menuItems: MenuItem[] = [
        { name: 'Dashboard', key: 'dashboard', icon: <LayoutDashboard size={18} />, path: '/admin' },
        { name: 'Products', key: 'products', icon: <Package size={18} />, path: '/admin/products' },
        { name: 'Categories', key: 'categories', icon: <FolderTree size={18} />, path: '/admin/categories' },
        { name: 'Brands', key: 'brands', icon: <Tag size={18} />, path: '/admin/brands' },
        { name: 'Orders', key: 'orders', icon: <ShoppingCart size={18} />, path: '/admin/orders' },
        { name: 'Coupons', key: 'coupons', icon: <Ticket size={18} />, path: '/admin/coupons' },
        { name: 'Users', key: 'users', icon: <Users size={18} />, path: '/admin/users' },
        { name: 'SEO', key: 'seo', icon: <BarChart3 size={18} />, path: '/admin/seo' },
        { name: 'Analytics', key: 'analytics', icon: <BarChart3 size={18} />, path: '/admin/analytics' },
        { name: 'CMS Manager', key: 'cms', icon: <Layout size={18} />, path: '/admin/cms' },
        { name: 'Settings', key: 'settings', icon: <Settings size={18} />, path: '/admin/settings' },
    ];

    const activityItems: MenuItem[] = [
        { name: 'Quotations', key: 'quotations', icon: <FileText size={20} />, path: '/admin/quotations' },
        { name: 'Staff Quotations', key: 'staff_quotations', icon: <FilePlus size={20} />, path: '/admin/staff-quotations' },
        { name: 'Invoices', key: 'invoices', icon: <Receipt size={20} />, path: '/admin/invoices' },
        { name: 'Reviews', key: 'reviews', icon: <Layout size={20} />, path: '/admin/reviews' },
    ];

    const isStaff = user?.role === 'staff';
    const staffPerms = isStaff ? getStaffPerms(user) : [];

    const visibleMenuItems = isStaff ? menuItems.filter(i => staffPerms.includes(i.key)) : menuItems;
    const visibleActivityItems = isStaff ? activityItems.filter(i => staffPerms.includes(i.key)) : activityItems;

    // Normalize path by removing locale for comparison
    const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';

    const roleLabel = user?.role === 'admin' ? 'Site Manager' : 'Staff';

    return (
        <aside className={styles.sidebar}>


            <div className={styles.userProfile}>
                <div className={styles.avatar}>
                    {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'AU'}
                </div>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>{user?.name || 'Admin User'}</span>
                    <span className={styles.userRole}>{roleLabel}</span>
                </div>
            </div>

            <nav className={styles.nav}>
                {visibleMenuItems.length > 0 && (
                    <>
                        <div className={styles.navLabel}>Menu</div>
                        <ul className={styles.menuList}>
                            {visibleMenuItems.map((item) => {
                                const isActive = cleanPath === item.path || (item.path !== '/admin' && cleanPath.startsWith(item.path));
                                return (
                                    <li key={item.path}>
                                        <Link
                                            href={item.path}
                                            className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                                            onClick={() => handleSectionOpen(item.key)}
                                        >
                                            <span className={styles.icon}>{item.icon}</span>
                                            <span className={styles.name}>{item.name}</span>
                                            {activityCounts[item.key] > 0 && (
                                                <span className={styles.badge} aria-label={`${activityCounts[item.key]} new`}>
                                                    {activityCounts[item.key] > 99 ? '99+' : activityCounts[item.key]}
                                                </span>
                                            )}
                                            {isActive && <div className={styles.activeIndicator} />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}

                {visibleActivityItems.length > 0 && (
                    <>
                        <div className={styles.navLabel}>Activity</div>
                        <ul className={styles.activityList}>
                            {visibleActivityItems.map((item) => {
                                const isActive = cleanPath.startsWith(item.path);
                                return (
                                    <li key={item.path}>
                                        <Link
                                            href={item.path}
                                            className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                                            onClick={() => handleSectionOpen(item.key)}
                                        >
                                            <span className={styles.icon}>{item.icon}</span>
                                            <span className={styles.name}>{item.name}</span>
                                            {activityCounts[item.key] > 0 && (
                                                <span className={styles.badge} aria-label={`${activityCounts[item.key]} new`}>
                                                    {activityCounts[item.key] > 99 ? '99+' : activityCounts[item.key]}
                                                </span>
                                            )}
                                            {isActive && <div className={styles.activeIndicator} />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </nav>

            <div className={styles.sidebarFooter}>
                <button onClick={logout} className={styles.logoutBtn}>
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
