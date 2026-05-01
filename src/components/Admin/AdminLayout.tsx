'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import styles from './AdminLayout.module.css';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';

// Maps each admin path prefix to its permission key
const PATH_PERM_MAP: Record<string, string> = {
    '/admin/products': 'products',
    '/admin/categories': 'categories',
    '/admin/brands': 'brands',
    '/admin/orders': 'orders',
    '/admin/coupons': 'coupons',
    '/admin/users': 'users',
    '/admin/seo': 'seo',
    '/admin/analytics': 'analytics',
    '/admin/cms': 'cms',
    '/admin/settings': 'settings',
    '/admin/quotations': 'quotations',
    '/admin/reviews': 'reviews',
    '/admin': 'dashboard',
};

function getStaffPerms(user: any): string[] {
    const raw = user?.staff_permissions;
    if (!raw) return [];
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
}

function firstPermittedPath(perms: string[]): string {
    for (const [path, key] of Object.entries(PATH_PERM_MAP)) {
        if (perms.includes(key)) return path;
    }
    return '/';
}

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading, error } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading || error) return;

        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
            router.push('/');
            return;
        }

        if (user.role === 'staff') {
            const perms = getStaffPerms(user);
            const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';

            // Find which permission key governs this path (longest match wins)
            const matchedPerm = Object.entries(PATH_PERM_MAP)
                .sort((a, b) => b[0].length - a[0].length)
                .find(([path]) => cleanPath === path || cleanPath.startsWith(path + '/'))
                ?.[1];

            if (matchedPerm && !perms.includes(matchedPerm)) {
                router.push(firstPermittedPath(perms));
            }
        }
    }, [user, loading, error, router, pathname]);

    if (loading) return <AdminLoader fullPage={true} message="Authenticating..." />;

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
                <h2>Authentication Error</h2>
                <p>{error}</p>
                <p>Please check if the backend server is running.</p>
                <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: '10px' }}>Retry</button>
            </div>
        );
    }

    if (!user || (user.role !== 'admin' && user.role !== 'staff')) return null;

    return (
        <div className={styles.adminContainer} translate="no">
            <AdminSidebar />
            <div className={styles.mainContent}>
                <AdminHeader />
                <div className={styles.pageBody}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
