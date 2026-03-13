'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import styles from './AdminLayout.module.css';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading, error } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !error && (!user || user.role !== 'admin')) {
            router.push('/');
        }
    }, [user, loading, error, router]);

    if (loading) return <div>Loading...</div>;

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

    if (!user || user.role !== 'admin') return null;

    return (
        <div className={styles.adminContainer}>
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
