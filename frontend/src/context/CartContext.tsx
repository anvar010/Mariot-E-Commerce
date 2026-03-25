'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { API_BASE_URL } from '@/config';
import { useTranslations } from 'next-intl';
import { getAuthHeaders } from '@/utils/authHeaders';
import { resolveUrl } from '@/utils/urlHelper';

interface CartItem {
    id: string | number;
    name: string;
    price: number;
    image: string;
    quantity: number;
    brand?: string;
    slug?: string;
    stock_quantity?: number;
    track_inventory?: number | boolean;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: any) => Promise<boolean>;
    removeFromCart: (productId: string | number) => void;
    updateQuantity: (productId: string | number, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
    subtotal: number;
    discountAmount: number;
    appliedCoupon: any | null;
    applyDiscount: (code: string) => Promise<boolean>;
    removeDiscount: () => void;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (isOpen: boolean) => void;
    pointsToUse: number;
    pointsDiscountAmount: number;
    pointRate: number;
    applyPoints: (points: number) => void;
    removePoints: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);
    const [pointRate, setPointRate] = useState(0.01); // Default: 100 points = 1 AED
    const { user, token } = useAuth();
    const { showNotification } = useNotification();
    const t = useTranslations('notifications');

    const prevToken = React.useRef(token);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings`);
                const data = await res.json();
                if (data.success && data.data) {
                    // Backend returns an object: { aed_per_point: '0.01', ... }
                    const rate = data.data.aed_per_point;
                    if (rate) setPointRate(parseFloat(rate));
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            }
        };
        fetchSettings();
    }, []);

    // 1. Initial Load & Sync Logic
    useEffect(() => {
        const handleCartSync = async () => {
            if (token) {
                // 1. If we have temporary guest items, merge them to server first
                const guestCart = localStorage.getItem('cart');
                if (guestCart) {
                    try {
                        const items = JSON.parse(guestCart);
                        if (items.length > 0) {
                            // Push guest items to server in parallel
                            await Promise.all(items.map((item: any) =>
                                fetch(`${API_BASE_URL}/cart`, {
                                    credentials: "include",
                                    method: 'POST',
                                    headers: {
                                        ...getAuthHeaders(),
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        product_id: item.id,
                                        quantity: item.quantity
                                    })
                                })
                            ));
                            // Clear guest cart once merged
                            localStorage.removeItem('cart');
                        }
                    } catch (e) {
                        console.error('Failed to merge guest cart', e);
                    }
                }

                // 2. Fetch the final consolidated cart from server
                fetchUserCart();
            } else if (prevToken.current) {
                // User just logged out
                setCartItems([]);
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setPointsToUse(0);
                setPointsDiscountAmount(0);
                localStorage.removeItem('cart');
            } else {
                // Initial guest load
                const savedCart = localStorage.getItem('cart');
                if (savedCart) {
                    try {
                        setCartItems(JSON.parse(savedCart));
                    } catch (error) {
                        console.error('Failed to parse cart from localStorage', error);
                        setCartItems([]);
                    }
                } else {
                    setCartItems([]);
                }
            }
            prevToken.current = token;
        };

        handleCartSync();
    }, [token]);

    // 2. Persistence loop for guests
    useEffect(() => {
        if (!token && !prevToken.current) {
            localStorage.setItem('cart', JSON.stringify(cartItems));
        }
    }, [cartItems, token]);

    const fetchUserCart = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/cart`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const items = data.data.map((item: any) => ({
                    id: item.product_id || item.id,
                    name: item.name || item.product?.name || 'Product',
                    slug: item.slug || item.product?.slug || '',
                    price: Number(item.offer_price) > 0 ? Number(item.offer_price) : Number(item.price || item.product?.price || 0),
                    image: resolveUrl(item.image || item.product?.image_url || ''),
                    quantity: Number(item.quantity),
                    brand: item.brand || item.brand_name || item.product?.brand?.name || '',
                    stock_quantity: item.stock_quantity !== undefined ? Number(item.stock_quantity) : undefined,
                    track_inventory: item.track_inventory
                }));
                setCartItems(items);
            }
        } catch (error) {
            console.error('Failed to fetch user cart', error);
        }
    };

    const addToCart = async (product: any): Promise<boolean> => {
        const productQuantity = Number(product.quantity || 1);
        const displayPrice = Number(product.offer_price) > 0 ? Number(product.offer_price) : Number(product.price || 0);
        const stockLimit = product.stock_quantity !== undefined ? Number(product.stock_quantity) : undefined;

        // Validation against current state
        const existingItem = cartItems.find(item => item.id === product.id);
        const isInventoryTracked = product.track_inventory === 1 || String(product.track_inventory) === '1' || product.track_inventory === true;

        let quantityToAdd = productQuantity;

        if (stockLimit !== undefined && isInventoryTracked) {
            const currentInCart = existingItem ? Number(existingItem.quantity) : 0;
            const remainingStock = stockLimit - currentInCart;

            if (remainingStock <= 0) {
                showNotification(t('cartUpdateError', { count: stockLimit }), 'error');
                return false;
            }

            if (productQuantity > remainingStock) {
                quantityToAdd = remainingStock;
                showNotification(t('cartUpdateLimit', { count: quantityToAdd, total: stockLimit }), 'info');
            }
        }

        // Optimistic UI Update
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantityToAdd } : item
                );
            }
            return [...prev, {
                id: product.id,
                name: product.name || product.model || 'Product',
                slug: product.slug || '',
                price: displayPrice,
                image: product.image,
                brand: product.brand || product.brand_name || '',
                quantity: quantityToAdd,
                stock_quantity: stockLimit,
                track_inventory: product.track_inventory
            }];
        });

        if (quantityToAdd < productQuantity) {
            // Notification already shown for partial add
        } else {
            // Calculate new cart stats for notification
            const currentTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const currentCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

            const isNewItem = !cartItems.some(item => item.id === product.id);
            const newTotal = currentTotal + (displayPrice * quantityToAdd);
            const newCount = currentCount + quantityToAdd;

            showNotification(
                '',
                'cart',
                {
                    title: product.name || product.model || 'Product',
                    image: product.image,
                    price: displayPrice,
                    oldPrice: product.old_price || product.price_old || product.oldPrice,
                    quantity: quantityToAdd,
                    cartCount: newCount,
                    cartTotal: newTotal
                }
            );
        }

        // Backend Sync if logged in
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/cart`, {
                    credentials: "include",
                    method: 'POST',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        product_id: product.id,
                        quantity: quantityToAdd
                    })
                });
            } catch (error) {
                console.error('Failed to add to cart backend', error);
            }
        }
        return true;
    };

    const removeFromCart = async (productId: string | number) => {
        const itemToRemove = cartItems.find(i => i.id === productId);
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));

        if (itemToRemove) {
            showNotification(t('cartRemove', { name: itemToRemove.name }), 'error', { title: t('itemRemoved') });
        }

        if (token) {
            try {
                await fetch(`${API_BASE_URL}/cart/${productId}`, {
                    method: 'DELETE',
                    credentials: "include",
                    headers: getAuthHeaders()
                });
            } catch (error) {
                console.error('Failed to remove from cart backend', error);
            }
        }
    };

    const updateQuantity = async (productId: string | number, quantity: number) => {
        if (quantity < 1) return;

        // Validation against current state
        const item = cartItems.find(i => i.id === productId);
        let validQuantity = quantity;

        const isInventoryTracked = item && (item.track_inventory === 1 || String(item.track_inventory) === '1' || item.track_inventory === true);

        if (item && item.stock_quantity !== undefined && isInventoryTracked && quantity > item.stock_quantity) {
            showNotification(t('cartUpdateError', { count: item.stock_quantity }), 'error');
            validQuantity = item.stock_quantity;
        }

        setCartItems(prevItems => {
            return prevItems.map(item =>
                item.id === productId ? { ...item, quantity: validQuantity } : item
            );
        });

        if (token) {
            try {
                await fetch(`${API_BASE_URL}/cart/update`, {
                    credentials: "include",
                    method: 'PUT',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        quantity: validQuantity
                    })
                });
            } catch (error) {
                console.error('Failed to update cart quantity backend', error);
            }
        }
    };

    const clearCart = async () => {
        setCartItems([]);
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setPointsToUse(0);
        setPointsDiscountAmount(0);
        localStorage.removeItem('cart');

        if (token) {
            try {
                await fetch(`${API_BASE_URL}/cart`, {
                    method: 'DELETE',
                    credentials: "include",
                    headers: getAuthHeaders()
                });
            } catch (error) {
                console.error('Failed to clear cart backend', error);
            }
        }
    };

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartTotal = Math.max(0, subtotal - discountAmount - pointsDiscountAmount);

    const applyDiscount = async (code: string): Promise<boolean> => {
        if (!token) {
            showNotification(t('couponAuth'), 'error');
            return false;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
                credentials: "include",
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    cart_total: subtotal,
                    items: cartItems.map(i => ({ id: i.id, brand: i.brand, price: i.price, quantity: i.quantity }))
                })
            });

            const data = await res.json();
            if (data.success) {
                setAppliedCoupon(data.data);
                setDiscountAmount(data.data.discount_amount);
                showNotification(data.message || t('couponApply'));
                return true;
            } else {
                showNotification(data.message || t('couponInvalid'), 'error');
                return false;
            }
        } catch (error) {
            console.error('Coupon validation error:', error);
            showNotification(t('couponError'), 'error');
            return false;
        }
    };

    const removeDiscount = (silent = false) => {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        if (!silent) {
            showNotification(t('couponRemoved'));
        }
    };

    const applyPoints = (points: number) => {
        if (!user) {
            showNotification(t('pointsAuth'), 'error');
            return;
        }

        const availablePoints = user.reward_points || 0;
        if (points > availablePoints) {
            showNotification(t('pointsLimit', { count: availablePoints }), 'error');
            return;
        }

        // Use dynamic pointRate instead of hardcoded 100
        const maxAEDFromPoints = points * pointRate;
        const currentTotal = subtotal - discountAmount;

        const finalAEDFromPoints = Math.min(maxAEDFromPoints, currentTotal);
        // Round points to use to nearest whole number to avoid floating point display errors
        const actualPointsToUse = Math.round(finalAEDFromPoints / pointRate);

        setPointsToUse(actualPointsToUse);
        setPointsDiscountAmount(finalAEDFromPoints);

        if (actualPointsToUse > 0) {
            showNotification(t('pointsApplied', { amount: finalAEDFromPoints.toFixed(2) }));
        }
    };

    const removePoints = (silent = false) => {
        setPointsToUse(0);
        setPointsDiscountAmount(0);
        if (!silent) {
            showNotification(t('pointsRemoved'));
        }
    };

    // Re-calculate discount if cart items change
    useEffect(() => {
        if (appliedCoupon) {
            // Re-validate with items to ensure brands are still valid/calculated correctly
            const calculateNewDiscount = async () => {
                if (cartItems.length === 0) return;
                try {
                    const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
                        credentials: "include",
                        method: 'POST',
                        headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            code: appliedCoupon.code,
                            cart_total: cartItems.reduce((total, item) => total + (item.price * item.quantity), 0),
                            items: cartItems.map(i => ({ id: i.id, brand: i.brand, price: i.price, quantity: i.quantity }))
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        setDiscountAmount(data.data.discount_amount);
                    } else if (cartItems.length > 0) {
                        removeDiscount();
                        showNotification(data.message || t('couponNotApplicable'), 'info');
                    }
                } catch (e) {
                    console.error('Re-validation error', e);
                }
            };
            calculateNewDiscount();

            // Check min order again
            const current_subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            if (cartItems.length > 0 && current_subtotal < appliedCoupon.min_order_amount) {
                removeDiscount();
                showNotification(t('couponMinOrder', { amount: appliedCoupon.min_order_amount }), 'info');
            }
        }
    }, [cartItems]);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartCount,
            cartTotal,
            subtotal,
            discountAmount,
            appliedCoupon,
            applyDiscount,
            removeDiscount,
            isDrawerOpen,
            setIsDrawerOpen,
            pointsToUse,
            pointsDiscountAmount,
            pointRate,
            applyPoints,
            removePoints
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
