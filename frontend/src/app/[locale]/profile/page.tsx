'use client';

import React, { useEffect } from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import UserDashboard from '@/components/User/UserDashboard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) return null; // Or a loader

    return (
        <>
            <Header />
            <main style={{ minHeight: '80vh', backgroundColor: '#fdfdfd', paddingTop: '1px' }}>
                <UserDashboard />
            </main>
            <Footer />
        </>
    );
}
