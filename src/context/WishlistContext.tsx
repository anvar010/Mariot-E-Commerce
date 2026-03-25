'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { useTranslations } from 'next-intl';

interface WishlistItem {
    id: string | number;
    name: string;
    price: number;
    image: string;
    brand?: string;
    stock_quantity?: number;
}

interface WishlistContextType {
    wishlistItems: WishlistItem[];
    addToWishlist: (product: any) => Promise<void>;
    removeFromWishlist: (productId: string | number) => Promise<void>;
    isInWishlist: (productId: string | number) => boolean;
    loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { token, user } = useAuth();
    const { showNotification } = useNotification();
    const t = useTranslations('notifications');

    // 1. Initial Load & Sync Logic (Same pattern as CartContext)
    useEffect(() => {
        const handleWishlistSync = async () => {
            if (token) {
                // Merge guest wishlist to server
                const guestWishlist = localStorage.getItem('wishlist');
                if (guestWishlist) {
                    try {
                        const items = JSON.parse(guestWishlist);
                        if (items.length > 0) {
                            // Sync guest wishlist to server in parallel
                            await Promise.all(items.map((item: any) =>
                                fetch(`${API_BASE_URL}/wishlist`, {
                                    credentials: "include",
                                    method: 'POST',
                                    headers: {
                                        ...getAuthHeaders(),
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ product_id: item.id })
                                })
                            ));
                            localStorage.removeItem('wishlist');
                        }
                    } catch (e) {
                        console.error('Failed to merge guest wishlist', e);
                    }
                }
                fetchWishlist();
            } else {
                // Guest mode
                const savedWishlist = localStorage.getItem('wishlist');
                if (savedWishlist) {
                    try {
                        setWishlistItems(JSON.parse(savedWishlist));
                    } catch (error) {
                        setWishlistItems([]);
                    }
                } else {
                    setWishlistItems([]);
                }
            }
        };

        const timeoutId = setTimeout(handleWishlistSync, 2000);
        return () => clearTimeout(timeoutId);
    }, [token]);

    // 2. Persistence loop for guests
    useEffect(() => {
        if (!token) {
            localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
        }
    }, [wishlistItems, token]);

    const fetchWishlist = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/wishlist`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                // IMPORTANT: Use product_id as the id in our state
                setWishlistItems(data.data.map((item: any) => ({
                    id: item.product_id,
                    name: item.name,
                    price: Number(item.offer_price) > 0 ? Number(item.offer_price) : Number(item.price || 0),
                    image: item.image || item.primary_image || '',
                    brand: item.brand_name,
                    stock_quantity: item.stock_quantity
                })));
            }
        } catch (error) {
            console.error('Failed to fetch wishlist', error);
        } finally {
            setLoading(false);
        }
    };

    const addToWishlist = async (product: any) => {
        // Optimistic Update
        const newItem = {
            id: product.id,
            name: product.name || product.model,
            price: Number(product.price),
            image: product.image,
            brand: product.brand,
            stock_quantity: product.stock_quantity
        };

        setWishlistItems(prev => {
            if (prev.some(item => item.id === product.id)) return prev;
            return [...prev, newItem];
        });

        showNotification(
            t('wishlistAdd', { name: product.name || product.model }),
            'success',
            { title: t('wishlistTitleAdd'), image: product.image }
        );

        // Backend Sync
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/wishlist`, {
                    credentials: "include",
                    method: 'POST',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ product_id: product.id })
                });
            } catch (error) {
                console.error('Add to wishlist failed backend', error);
            }
        }
    };

    const removeFromWishlist = async (productId: string | number) => {
        setWishlistItems(prev => prev.filter(item => item.id !== productId));
        showNotification(t('wishlistRemove'), 'error', { title: t('wishlistTitleRemove') });

        if (token) {
            try {
                await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
                    method: 'DELETE',
                    credentials: "include",
                    headers: getAuthHeaders()
                });
            } catch (error) {
                console.error('Remove from wishlist failed backend', error);
            }
        }
    };

    const isInWishlist = (productId: string | number) => {
        return wishlistItems.some(item => item.id == productId);
    };

    return (
        <WishlistContext.Provider value={{
            wishlistItems,
            addToWishlist,
            removeFromWishlist,
            isInWishlist,
            loading
        }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};
