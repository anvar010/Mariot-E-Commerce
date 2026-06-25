'use client';

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';

// useLayoutEffect on the client (restore before paint → no empty-cart flash), useEffect on the
// server (avoids the SSR warning). Lets us restore the cart snapshot without a hydration mismatch.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { resolveUrl } from '@/utils/resolveUrl';
import { useTranslations, useLocale } from 'next-intl';

interface CartItem {
    id: string | number;
    variant_id?: number | null;
    variant_label?: string;
    variant_options?: any[] | null;
    name: string;
    name_ar?: string;
    model?: string;
    price: number;
    image: string;
    quantity: number;
    brand?: string;
    slug?: string;
    stock_quantity?: number;
    track_inventory?: number | boolean;
    custom_dimensions?: Record<string, number | string> | null;
    custom_signature?: string | null;
    is_free_gift?: boolean;
    bundle_parent_id?: number | null;
    original_price?: number | null;
    delivery_charge?: number;
}

// Build a stable signature from a custom-dimensions object. Used to treat
// each unique customization as its own line item in the cart.
const buildCustomSignature = (dims: any): string | null => {
    if (!dims || typeof dims !== 'object') return null;
    const keys = Object.keys(dims).sort();
    const parts = keys
        .map(k => {
            const v = dims[k];
            if (v === undefined || v === null || v === '') return null;
            return `${k}:${v}`;
        })
        .filter(Boolean);
    return parts.length > 0 ? parts.join('|') : null;
};

// Matches two cart items as "the same line"
const sameLine = (a: { id: any; variant_id?: any; custom_signature?: any; is_free_gift?: any }, b: { id: any; variant_id?: any; custom_signature?: any; is_free_gift?: any }) =>
    a.id === b.id &&
    (a.variant_id ?? null) === (b.variant_id ?? null) &&
    (a.custom_signature ?? null) === (b.custom_signature ?? null) &&
    Boolean(a.is_free_gift) === Boolean(b.is_free_gift);

// Actions are referentially stable for the life of the provider — splitting
// them into their own context lets action-only consumers (product cards, the
// "Add to cart" button, search results) avoid re-rendering when cart *state*
// (items, drawer, coupon, points) changes.
interface CartActions {
    addToCart: (product: any, options?: { silent?: boolean }) => Promise<boolean>;
    removeFromCart: (productId: string | number, variantId?: number | null, customSignature?: string | null, isFreeGift?: boolean) => void;
    updateQuantity: (productId: string | number, quantity: number, variantId?: number | null, customSignature?: string | null) => void;
    clearCart: () => void;
    applyDiscount: (code: string) => Promise<boolean>;
    removeDiscount: () => void;
    applyPoints: (points: number) => void;
    removePoints: () => void;
    setIsDrawerOpen: (isOpen: boolean) => void;
}

interface CartState {
    cartItems: CartItem[];
    cartCount: number;
    cartTotal: number;
    subtotal: number;
    deliveryTotal: number;
    discountAmount: number;
    appliedCoupon: any | null;
    isDrawerOpen: boolean;
    pointsToUse: number;
    pointsDiscountAmount: number;
    pointRate: number;
}

type CartContextType = CartState & CartActions;

const CartStateContext = createContext<CartState | undefined>(undefined);
const CartActionsContext = createContext<CartActions | undefined>(undefined);

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
    const locale = useLocale();

    const prevToken = useRef(token);
    const hasHydrated = useRef(false);
    const snapshotRestored = useRef(false);

    // Restore the last cart snapshot BEFORE paint on (re)mount. A locale switch remounts this
    // provider (it lives under /[locale]); guests reload instantly from localStorage but logged-in
    // users re-fetch from the server, so without this they'd see an empty cart (missing image/price)
    // for a moment. Runs after a render that matches SSR (empty), so there's no hydration mismatch.
    useIsomorphicLayoutEffect(() => {
        if (snapshotRestored.current) return;
        snapshotRestored.current = true;
        try {
            const snap = localStorage.getItem('cart_snapshot');
            if (snap) {
                const parsed = JSON.parse(snap);
                // Re-resolve images on restore so a stale/raw-format persisted path normalizes to
                // a current absolute URL instead of staying broken.
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setCartItems(parsed.map((it: any) => ({ ...it, image: resolveUrl(it.image) })));
                }
            }
        } catch { /* ignore */ }
    }, []);

    // Latest-value refs so the action callbacks can stay referentially stable
    // ([] deps) while still reading current state/props at call time.
    const cartItemsRef = useRef(cartItems);
    cartItemsRef.current = cartItems;
    const tokenRef = useRef(token);
    tokenRef.current = token;
    const userRef = useRef(user);
    userRef.current = user;
    const pointRateRef = useRef(pointRate);
    pointRateRef.current = pointRate;
    const localeRef = useRef(locale);
    localeRef.current = locale;
    const discountAmountRef = useRef(discountAmount);
    discountAmountRef.current = discountAmount;
    const tRef = useRef(t);
    tRef.current = t;

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

    const fetchUserCart = useCallback(async () => {
        if (!tokenRef.current) return;
        try {
            const res = await fetch(`${API_BASE_URL}/cart`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const items = data.data.map((item: any) => {
                    const variantOpts = item.variant_options || null;
                    const variantLabelFromOpts = Array.isArray(variantOpts) && variantOpts.length > 0
                        ? variantOpts.map((o: any) => `${o.name}: ${o.value}`).join(' / ')
                        : undefined;
                    return {
                        id: item.product_id || item.id,
                        variant_id: item.variant_id ?? null,
                        // Prefer the saved custom label (e.g. "Width: 60cm / ..."), fall back to variant options label
                        variant_label: item.custom_label || variantLabelFromOpts,
                        variant_options: variantOpts,
                        name: item.name || item.product?.name || 'Product',
                        name_ar: item.name_ar || item.product?.name_ar || undefined,
                        // Variant SKU (model number) when this line is a variant, else parent model
                        model: item.variant_sku || item.model || undefined,
                        slug: item.slug || item.product?.slug || '',
                        price: Number(item.offer_price) > 0 ? Number(item.offer_price) : Number(item.price || item.product?.price || 0),
                        image: resolveUrl(item.image || item.product?.image_url || ''),
                        quantity: Number(item.quantity),
                        brand: item.brand || item.brand_name || item.product?.brand?.name || '',
                        stock_quantity: item.stock_quantity !== undefined ? Number(item.stock_quantity) : undefined,
                        track_inventory: item.track_inventory,
                        custom_dimensions: item.custom_dimensions || null,
                        custom_signature: item.custom_signature || null,
                        is_free_gift: Boolean(item.is_free_gift),
                        bundle_parent_id: item.bundle_parent_id ?? null,
                        original_price: item.original_price != null ? Number(item.original_price) : null,
                        delivery_charge: Number(item.delivery_charge) || 0
                    };
                });
                setCartItems(items);
            }
        } catch (error) {
            console.error('Failed to fetch user cart', error);
        }
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
                                        quantity: item.quantity,
                                        variant_id: item.variant_id || null,
                                        is_free_gift: Boolean(item.is_free_gift),
                                        bundle_parent_id: item.bundle_parent_id ?? null
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
                hasHydrated.current = true;
            } else if (prevToken.current) {
                // User just logged out
                setCartItems([]);
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setPointsToUse(0);
                setPointsDiscountAmount(0);
                localStorage.removeItem('cart');
                localStorage.removeItem('cart_snapshot');
                hasHydrated.current = true;
            } else {
                // Initial guest load
                const savedCart = localStorage.getItem('cart');
                if (savedCart) {
                    try {
                        const guestItems = JSON.parse(savedCart);
                        setCartItems(Array.isArray(guestItems)
                            ? guestItems.map((it: any) => ({ ...it, image: resolveUrl(it.image) }))
                            : []);
                    } catch (error) {
                        console.error('Failed to parse cart from localStorage', error);
                        setCartItems([]);
                    }
                } else {
                    setCartItems([]);
                }
                hasHydrated.current = true;
            }
            prevToken.current = token;
        };

        // Defer until browser is idle so cart sync doesn't compete with LCP
        let handle: number;
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            handle = (window as any).requestIdleCallback(handleCartSync, { timeout: 3000 });
        } else {
            handle = setTimeout(handleCartSync, 2000) as unknown as number;
        }
        return () => {
            if ('requestIdleCallback' in window) (window as any).cancelIdleCallback(handle);
            else clearTimeout(handle);
        };
    }, [token, fetchUserCart]);

    // 2. Persistence loop for guests — skip until initial cart has been loaded from storage
    useEffect(() => {
        if (!hasHydrated.current) return;
        if (!token && !prevToken.current) {
            localStorage.setItem('cart', JSON.stringify(cartItems));
        }
    }, [cartItems, token]);

    // 2b. Snapshot of the full cart (guest OR logged-in) for instant restore on the next mount
    //     (e.g. locale switch). Keeps image/price/qty so nothing flashes missing.
    useEffect(() => {
        if (!hasHydrated.current) return;
        try { localStorage.setItem('cart_snapshot', JSON.stringify(cartItems)); } catch { /* quota */ }
    }, [cartItems]);

    // 2c. Re-sync from the server when the locale changes. In the App Router a locale switch
    //     (/en ↔ /ar) is a client navigation that does NOT remount this provider, so the cart
    //     would otherwise keep showing stale in-memory items (e.g. a line added without a
    //     resolved image). Re-fetching guarantees fresh, correctly-resolved image/price data.
    //     Skips the first run (initial sync already covers mount) and guests (no server cart).
    const didLocaleSync = useRef(false);
    useEffect(() => {
        if (!didLocaleSync.current) { didLocaleSync.current = true; return; }
        if (tokenRef.current) fetchUserCart();
    }, [locale, fetchUserCart]);

    // Prune orphan free-gift lines: a gift can only exist while its bundle parent is in the cart.
    useEffect(() => {
        const parentIds = new Set(cartItems.filter(i => !i.is_free_gift).map(i => Number(i.id)));
        const orphans = cartItems.filter(i => i.is_free_gift && !parentIds.has(Number(i.bundle_parent_id)));
        if (orphans.length === 0) return;
        setCartItems(prev => prev.filter(i => {
            if (!i.is_free_gift) return true;
            return parentIds.has(Number(i.bundle_parent_id));
        }));
    }, [cartItems]);

    const addToCart = useCallback(async (product: any, options?: { silent?: boolean }): Promise<boolean> => {
        const items = cartItemsRef.current;
        const tt = tRef.current;
        const productQuantity = Number(product.quantity || 1);
        const isFreeGift = Boolean(product.is_free_gift);
        const displayPrice = isFreeGift
            ? 0
            : (Number(product.offer_price) > 0 ? Number(product.offer_price) : Number(product.price || 0));
        const stockLimit = product.stock_quantity !== undefined ? Number(product.stock_quantity) : undefined;
        const variantId: number | null = product.variant_id ?? null;
        const customSignature = buildCustomSignature(product.custom_dimensions);
        const lineKey = { id: product.id, variant_id: variantId, custom_signature: customSignature, is_free_gift: isFreeGift };

        // Validation against current state
        const existingItem = items.find(item => sameLine(item, lineKey));
        const isInventoryTracked = !isFreeGift && (product.track_inventory === 1 || String(product.track_inventory) === '1' || product.track_inventory === true);

        let quantityToAdd = productQuantity;

        if (stockLimit !== undefined && isInventoryTracked) {
            const currentInCart = existingItem ? Number(existingItem.quantity) : 0;
            const remainingStock = stockLimit - currentInCart;

            if (remainingStock <= 0) {
                showNotification(tt('cartUpdateError', { count: stockLimit }), 'error');
                return false;
            }

            if (productQuantity > remainingStock) {
                quantityToAdd = remainingStock;
                showNotification(tt('cartUpdateLimit', { count: quantityToAdd, total: stockLimit }), 'info');
            }
        }

        // Optimistic UI Update
        setCartItems(prev => {
            const existing = prev.find(item => sameLine(item, lineKey));
            if (existing) {
                return prev.map(item =>
                    sameLine(item, lineKey)
                        ? { ...item, quantity: item.quantity + quantityToAdd }
                        : item
                );
            }
            return [...prev, {
                id: product.id,
                variant_id: variantId,
                variant_label: product.variant_label,
                name: product.name || product.model || 'Product',
                name_ar: product.name_ar || undefined,
                model: product.model || undefined,
                slug: product.slug || '',
                price: displayPrice,
                // Store an absolute, resolved URL so the cart image is consistent regardless of
                // source (guest add / server fetch / snapshot) and renders in the quotation PDF +
                // email, which can't resolve a relative /uploads path.
                image: resolveUrl(product.image),
                brand: product.brand || product.brand_name || '',
                quantity: quantityToAdd,
                stock_quantity: stockLimit,
                track_inventory: product.track_inventory,
                custom_dimensions: product.custom_dimensions || null,
                custom_signature: customSignature,
                is_free_gift: isFreeGift,
                delivery_charge: Number(product.delivery_charge) || 0,
                bundle_parent_id: product.bundle_parent_id ?? null,
                original_price: isFreeGift
                    ? (product.original_price != null
                        ? Number(product.original_price)
                        : (Number(product.offer_price) > 0 ? Number(product.offer_price) : Number(product.price || 0)))
                    : null
            }];
        });

        if (quantityToAdd < productQuantity) {
            // Notification already shown for partial add
        } else if (!options?.silent) {
            // Calculate new cart stats for notification
            const currentTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const currentCount = items.reduce((acc, item) => acc + item.quantity, 0);

            const newTotal = currentTotal + (displayPrice * quantityToAdd);
            const newCount = currentCount + quantityToAdd;

            showNotification(
                '',
                'cart',
                {
                    title: (localeRef.current === 'ar' && product.name_ar ? product.name_ar : (product.name || product.model)) || 'Product',
                    image: resolveUrl(product.image),
                    price: displayPrice,
                    oldPrice: product.old_price || product.price_old || product.oldPrice,
                    quantity: quantityToAdd,
                    cartCount: newCount,
                    cartTotal: newTotal,
                    custom_dimensions: product.custom_dimensions || null
                }
            );
        }

        // Backend Sync if logged in
        if (tokenRef.current) {
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
                        quantity: quantityToAdd,
                        variant_id: variantId,
                        custom_dimensions: product.custom_dimensions || null,
                        custom_label: product.variant_label || null,
                        is_free_gift: isFreeGift,
                        bundle_parent_id: product.bundle_parent_id ?? null
                    })
                });
            } catch (error) {
                console.error('Failed to add to cart backend', error);
            }
        }
        return true;
    }, [showNotification]);

    const removeFromCart = useCallback(async (productId: string | number, variantId: number | null = null, customSignature: string | null = null, isFreeGift: boolean = false) => {
        const items = cartItemsRef.current;
        const tt = tRef.current;
        // is_free_gift is part of the line identity (a parent and its bundled gift can share id+variant).
        // Callers removing a free-gift line must pass isFreeGift=true; otherwise sameLine will miss it.
        const lineKey = { id: productId, variant_id: variantId, custom_signature: customSignature, is_free_gift: isFreeGift };
        const itemToRemove = items.find(i => sameLine(i, lineKey));
        // Cascade: removing a bundle parent also removes its free-gift children.
        const isParent = itemToRemove && !itemToRemove.is_free_gift;
        const childGifts = isParent
            ? items.filter(i => i.is_free_gift && Number(i.bundle_parent_id) === Number(productId))
            : [];
        setCartItems(prevItems => prevItems.filter(item => {
            if (sameLine(item, lineKey)) return false;
            if (isParent && item.is_free_gift && Number(item.bundle_parent_id) === Number(productId)) return false;
            return true;
        }));

        if (itemToRemove) {
            // Use the Arabic product name when the site is in Arabic (matches addToCart).
            const removedName = (localeRef.current === 'ar' && itemToRemove.name_ar)
                ? itemToRemove.name_ar
                : (itemToRemove.name || (itemToRemove as any).model || 'Product');
            showNotification(tt('cartRemove', { name: removedName }), 'error', { title: tt('itemRemoved') });
        }

        if (tokenRef.current) {
            try {
                const qsParts: string[] = [];
                if (variantId != null) qsParts.push(`variant_id=${variantId}`);
                if (customSignature) qsParts.push(`custom_signature=${encodeURIComponent(customSignature)}`);
                const qs = qsParts.length > 0 ? `?${qsParts.join('&')}` : '';
                await fetch(`${API_BASE_URL}/cart/${productId}${qs}`, {
                    method: 'DELETE',
                    credentials: "include",
                    headers: getAuthHeaders()
                });
                // Also delete cascaded gift children server-side
                for (const g of childGifts) {
                    await fetch(`${API_BASE_URL}/cart/${g.id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                }
            } catch (error) {
                console.error('Failed to remove from cart backend', error);
            }
        }
    }, [showNotification]);

    const updateQuantity = useCallback(async (productId: string | number, quantity: number, variantId: number | null = null, customSignature: string | null = null) => {
        if (quantity < 1) return;
        const items = cartItemsRef.current;
        const tt = tRef.current;

        const lineKey = { id: productId, variant_id: variantId, custom_signature: customSignature };

        // Validation against current state
        const item = items.find(i => sameLine(i, lineKey));
        let validQuantity = quantity;

        const isInventoryTracked = item && (item.track_inventory === 1 || String(item.track_inventory) === '1' || item.track_inventory === true);

        if (item && item.stock_quantity !== undefined && isInventoryTracked && quantity > item.stock_quantity) {
            showNotification(tt('cartUpdateError', { count: item.stock_quantity }), 'error');
            validQuantity = item.stock_quantity;
        }

        setCartItems(prevItems => {
            return prevItems.map(it =>
                sameLine(it, lineKey)
                    ? { ...it, quantity: validQuantity }
                    : it
            );
        });

        if (tokenRef.current) {
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
                        quantity: validQuantity,
                        variant_id: variantId,
                        custom_signature: customSignature
                    })
                });
            } catch (error) {
                console.error('Failed to update cart quantity backend', error);
            }
        }
    }, [showNotification]);

    const clearCart = useCallback(async () => {
        setCartItems([]);
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setPointsToUse(0);
        setPointsDiscountAmount(0);
        localStorage.removeItem('cart');

        if (tokenRef.current) {
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
    }, []);

    // Single pass over the items, memoized so it only recomputes when the cart
    // actually changes (not on every unrelated provider re-render).
    const { cartCount, subtotal, deliveryTotal } = useMemo(() => {
        let count = 0;
        let sub = 0;
        let delivery = 0;
        for (const item of cartItems) {
            count += item.quantity;
            sub += item.price * item.quantity;
            if (!item.is_free_gift) delivery += (Number(item.delivery_charge) || 0) * item.quantity;
        }
        return { cartCount: count, subtotal: sub, deliveryTotal: delivery };
    }, [cartItems]);
    const cartTotal = Math.max(0, subtotal - discountAmount - pointsDiscountAmount);

    const applyDiscount = useCallback(async (code: string): Promise<boolean> => {
        const tt = tRef.current;
        if (!tokenRef.current) {
            showNotification(tt('couponAuth'), 'error');
            return false;
        }

        const items = cartItemsRef.current;
        const sub = items.reduce((total, item) => total + (item.price * item.quantity), 0);

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
                    cart_total: sub,
                    items: items.map(i => ({ id: i.id, brand: i.brand, price: i.price, quantity: i.quantity }))
                })
            });

            const data = await res.json();
            if (data.success) {
                setAppliedCoupon(data.data);
                setDiscountAmount(data.data.discount_amount);
                showNotification(data.message || tt('couponApply'));
                return true;
            } else {
                showNotification(data.message || tt('couponInvalid'), 'error');
                return false;
            }
        } catch (error) {
            console.error('Coupon validation error:', error);
            showNotification(tt('couponError'), 'error');
            return false;
        }
    }, [showNotification]);

    const removeDiscount = useCallback((silent = false) => {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        if (!silent) {
            showNotification(tRef.current('couponRemoved'));
        }
    }, [showNotification]);

    const applyPoints = useCallback((points: number) => {
        const tt = tRef.current;
        const currentUser = userRef.current;
        if (!currentUser) {
            showNotification(tt('pointsAuth'), 'error');
            return;
        }

        const availablePoints = currentUser.reward_points || 0;
        if (points > availablePoints) {
            showNotification(tt('pointsLimit', { count: availablePoints }), 'error');
            return;
        }

        const rate = pointRateRef.current;
        // Use dynamic pointRate instead of hardcoded 100
        const maxAEDFromPoints = points * rate;
        const sub = cartItemsRef.current.reduce((total, item) => total + (item.price * item.quantity), 0);
        const currentTotal = sub - discountAmountRef.current;

        const finalAEDFromPoints = Math.min(maxAEDFromPoints, currentTotal);
        // Round points to use to nearest whole number to avoid floating point display errors
        const actualPointsToUse = Math.round(finalAEDFromPoints / rate);

        setPointsToUse(actualPointsToUse);
        setPointsDiscountAmount(finalAEDFromPoints);

        if (actualPointsToUse > 0) {
            showNotification(tt('pointsApplied', { amount: finalAEDFromPoints.toFixed(2) }));
        }
    }, [showNotification]);

    const removePoints = useCallback((silent = false) => {
        setPointsToUse(0);
        setPointsDiscountAmount(0);
        if (!silent) {
            showNotification(tRef.current('pointsRemoved'));
        }
    }, [showNotification]);

    // Re-calculate discount when the cart changes. Debounced + abortable so a
    // burst of quantity changes (rapid +/- taps) collapses into a single
    // /coupons/validate request instead of one per change — critical for
    // backend load under traffic.
    useEffect(() => {
        if (!appliedCoupon || cartItems.length === 0) return;

        const controller = new AbortController();
        const handle = setTimeout(async () => {
            const current_subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

            // Min-order check first — cheaper than a round-trip.
            if (current_subtotal < appliedCoupon.min_order_amount) {
                removeDiscount();
                showNotification(t('couponMinOrder', { amount: appliedCoupon.min_order_amount }), 'info');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
                    credentials: "include",
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: appliedCoupon.code,
                        cart_total: current_subtotal,
                        items: cartItems.map(i => ({ id: i.id, brand: i.brand, price: i.price, quantity: i.quantity }))
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setDiscountAmount(data.data.discount_amount);
                } else {
                    removeDiscount();
                    showNotification(data.message || t('couponNotApplicable'), 'info');
                }
            } catch (e) {
                if ((e as any)?.name !== 'AbortError') console.error('Re-validation error', e);
            }
        }, 400);

        return () => {
            clearTimeout(handle);
            controller.abort();
        };
    }, [cartItems, appliedCoupon, removeDiscount, showNotification, t]);

    // Stable actions: identity never changes, so action-only consumers never
    // re-render from cart-state updates.
    const actions = useMemo<CartActions>(() => ({
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyDiscount,
        removeDiscount,
        applyPoints,
        removePoints,
        setIsDrawerOpen
    }), [addToCart, removeFromCart, updateQuantity, clearCart, applyDiscount, removeDiscount, applyPoints, removePoints]);

    const state = useMemo<CartState>(() => ({
        cartItems,
        cartCount,
        cartTotal,
        subtotal,
        deliveryTotal,
        discountAmount,
        appliedCoupon,
        isDrawerOpen,
        pointsToUse,
        pointsDiscountAmount,
        pointRate
    }), [cartItems, cartCount, cartTotal, subtotal, deliveryTotal, discountAmount, appliedCoupon, isDrawerOpen, pointsToUse, pointsDiscountAmount, pointRate]);

    return (
        <CartActionsContext.Provider value={actions}>
            <CartStateContext.Provider value={state}>
                {children}
            </CartStateContext.Provider>
        </CartActionsContext.Provider>
    );
};

export const useCartState = () => {
    const context = useContext(CartStateContext);
    if (context === undefined) {
        throw new Error('useCartState must be used within a CartProvider');
    }
    return context;
};

export const useCartActions = () => {
    const context = useContext(CartActionsContext);
    if (context === undefined) {
        throw new Error('useCartActions must be used within a CartProvider');
    }
    return context;
};

// Backward-compatible combined hook. Components that need both state and
// actions keep working unchanged. Prefer useCartActions() for action-only
// consumers (e.g. product cards) so they don't re-render on cart-state changes.
export const useCart = (): CartContextType => {
    const state = useCartState();
    const actions = useCartActions();
    return { ...state, ...actions };
};
