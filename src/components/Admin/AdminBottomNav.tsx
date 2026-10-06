'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Tag, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdminNav } from './AdminNavContext';
import styles from './AdminBottomNav.module.css';

/**
 * Bottom tab bar for the back office on phones.
 *
 * The four screens used most get a tab each; "Menu" opens the sidebar drawer for
 * everything else. Shown only under the phone breakpoint -- on wider screens the
 * sidebar (or the header's hamburger) is already within reach.
 */
const TABS = [
    { name: 'Dashboard', key: 'dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Orders', key: 'orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Products', key: 'products', path: '/admin/products', icon: Package },
    { name: 'Brands', key: 'brands', path: '/admin/brands', icon: Tag },
];

function getStaffPerms(user: any): string[] {
    const raw = user?.staff_permissions;
    if (!raw) return [];
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
}

const AdminBottomNav = () => {
    const pathname = usePathname();
    const { user } = useAuth();
    const { isOpen, toggle } = useAdminNav();

    const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';
    const locale = pathname.match(/^\/(en|ar)/)?.[1];
    // Staff see only the screens they may open, exactly as in the sidebar; a tab that
    // bounces them straight back out would be worse than no tab.
    const perms = user?.role === 'staff' ? getStaffPerms(user) : null;
    const tabs = perms ? TABS.filter(t => perms.includes(t.key)) : TABS;

    // Dashboard is the '/admin' prefix of every other screen, so it only counts as
    // active on its own page.
    const isActive = (path: string) =>
        path === '/admin' ? cleanPath === '/admin' : cleanPath === path || cleanPath.startsWith(path + '/');

    return (
        <nav
            className={styles.bottomNav}
            style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, 1fr)` }}
            aria-label="Admin navigation"
        >
            {tabs.map(({ name, path, icon: Icon }) => {
                const active = !isOpen && isActive(path);
                return (
                    <Link
                        key={path}
                        href={locale ? `/${locale}${path}` : path}
                        className={`${styles.navItem} ${active ? styles.active : ''}`}
                        aria-current={active ? 'page' : undefined}
                    >
                        <Icon size={21} />
                        <span>{name}</span>
                    </Link>
                );
            })}
            <button
                type="button"
                className={`${styles.navItem} ${isOpen ? styles.active : ''}`}
                onClick={toggle}
                aria-expanded={isOpen}
                aria-label="All menus"
            >
                <Menu size={21} />
                <span>Menu</span>
            </button>
        </nav>
    );
};

export default AdminBottomNav;
