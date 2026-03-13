'use client';

import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { WishlistProvider } from '@/context/WishlistContext';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NotificationProvider>
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
                <AuthProvider>
                    <CartProvider>
                        <WishlistProvider>
                            {children}
                        </WishlistProvider>
                    </CartProvider>
                </AuthProvider>
            </GoogleOAuthProvider>
        </NotificationProvider>
    );
}
