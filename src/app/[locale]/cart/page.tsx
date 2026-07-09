'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCartActions } from '@/context/CartContext';

// The cart is a slide-out drawer, not a standalone page (see CartDrawer). This
// route exists so links that point at /cart — the reminder email button,
// the sitemap entry — have somewhere real to land: it opens the drawer over
// the homepage, sending guests through sign-in first (returning here after).
export default function CartPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { setIsDrawerOpen } = useCartActions();

    useEffect(() => {
        if (loading) return;
        if (user) {
            setIsDrawerOpen(true);
            router.replace('/');
        } else {
            router.replace('/signin?redirectTo=/cart&reason=purchase');
        }
    }, [user, loading, router, setIsDrawerOpen]);

    return null;
}
