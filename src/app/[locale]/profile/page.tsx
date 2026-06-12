'use client';

import React, { useEffect } from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import UserDashboard from '@/components/User/UserDashboard';
import NotSignedIn from '@/components/User/NotSignedIn';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const [isMobile, setIsMobile] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const router = useRouter();

    React.useEffect(() => {
        setMounted(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    React.useEffect(() => {
        if (mounted && !loading && !user) {
            // Deep link (e.g. from an order/statement email) → send to sign-in, return here after login.
            const params = new URLSearchParams(window.location.search);
            if (params.get('orderId') || params.get('tab')) {
                // Strip the locale prefix so the post-login (next-intl) router doesn't add a second one (/en/en).
                const pathNoLocale = window.location.pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
                const target = pathNoLocale + window.location.search;
                router.push(`/signin?redirectTo=${encodeURIComponent(target)}`);
            } else if (!isMobile) {
                router.push('/');
            }
        }
    }, [user, loading, isMobile, router, mounted]);

    if (loading || !mounted) return null;

    return (
        <>
            <Header />
            <main style={{ minHeight: user ? '80vh' : 'auto', backgroundColor: '#fdfdfd', paddingTop: '1px' }}>
                {user ? <UserDashboard /> : (isMobile ? <NotSignedIn /> : null)}
            </main>
            <Footer />
        </>
    );
}
