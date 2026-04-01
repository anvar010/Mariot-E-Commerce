'use client';

import React from 'react';
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
    Menu,
    ChevronDown,
    PlusCircle,
    Ticket,
    FolderTree,
    Tag,
    FileText,
    Layout
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AdminSidebar = () => {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admin' },
        { name: 'Products', icon: <Package size={18} />, path: '/admin/products' },
        { name: 'Brands', icon: <Tag size={18} />, path: '/admin/brands' },
        { name: 'Orders', icon: <ShoppingCart size={18} />, path: '/admin/orders' },
        { name: 'Coupons', icon: <Ticket size={18} />, path: '/admin/coupons' },
        { name: 'Users', icon: <Users size={18} />, path: '/admin/users' },
        { name: 'SEO', icon: <BarChart3 size={18} />, path: '/admin/seo' },
        { name: 'Analytics', icon: <BarChart3 size={18} />, path: '/admin/analytics' },
        { name: 'CMS Manager', icon: <Layout size={18} />, path: '/admin/cms' },
        { name: 'Settings', icon: <Settings size={18} />, path: '/admin/settings' },
    ];

    // Normalize path by removing locale for comparison
    const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoSection}>
                <div className={styles.logoDots}>
                    <span className={styles.dotBlue}></span>
                    <span className={styles.dotTeal}></span>
                    <span className={styles.dotGreen}></span>
                </div>
            </div>

            <div className={styles.userProfile}>
                <div className={styles.avatar}>
                    {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'AU'}
                </div>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>{user?.name || 'Admin Users'}</span>
                    <span className={styles.userRole}>Site Manager</span>
                </div>
            </div>

            <nav className={styles.nav}>
                <div className={styles.navLabel}>Menu</div>
                <ul className={styles.menuList}>
                    {menuItems.map((item) => {
                        const isActive = cleanPath === item.path || (item.path !== '/admin' && cleanPath.startsWith(item.path));
                        return (
                            <li key={item.path}>
                                <Link
                                    href={item.path}
                                    className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                                >
                                    <span className={styles.icon}>{item.icon}</span>
                                    <span className={styles.name}>{item.name}</span>
                                    {isActive && <div className={styles.activeIndicator} />}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <div className={styles.navLabel}>Activity</div>
                <ul className={styles.activityList}>
                    <li>
                        <Link
                            href="/admin/quotations"
                            className={`${styles.menuItem} ${cleanPath.startsWith('/admin/quotations') ? styles.active : ''}`}
                        >
                            <span className={styles.icon}><FileText size={20} /></span>
                            <span className={styles.name}>Quotations</span>
                            {cleanPath.startsWith('/admin/quotations') && <div className={styles.activeIndicator} />}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/admin/reviews"
                            className={`${styles.menuItem} ${cleanPath.startsWith('/admin/reviews') ? styles.active : ''}`}
                        >
                            <span className={styles.icon}><Layout size={20} /></span>
                            <span className={styles.name}>Reviews</span>
                            {cleanPath.startsWith('/admin/reviews') && <div className={styles.activeIndicator} />}
                        </Link>
                    </li>
                </ul>
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
