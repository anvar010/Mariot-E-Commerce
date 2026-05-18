'use client';

import dynamic from 'next/dynamic';
import CompleteProfilePrompt from '@/components/shared/CompleteProfilePrompt/CompleteProfilePrompt';

const CartDrawer = dynamic(() => import('@/components/Layout/CartDrawer/CartDrawer'), { ssr: false });
const MobileBottomNav = dynamic(() => import('@/components/Layout/MobileBottomNav/MobileBottomNav'), { ssr: false });
const FloatingActions = dynamic(() => import('@/components/shared/FloatingActions/FloatingActions'), { ssr: false });
const Promotions = dynamic(() => import('@/components/shared/Promotions/Promotions'), { ssr: false });

export default function DeferredChrome() {
    return (
        <>
            <Promotions />
            <CartDrawer />
            <MobileBottomNav />
            <FloatingActions />
            <CompleteProfilePrompt />
        </>
    );
}
