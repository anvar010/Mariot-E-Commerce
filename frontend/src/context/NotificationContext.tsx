'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'cart';
    title?: string;
    image?: string;
    price?: number;
    oldPrice?: number;
    quantity?: number;
    cartCount?: number;
    cartTotal?: number;
}

interface NotificationContextType {
    showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'cart', options?: Partial<Omit<Notification, 'id' | 'message' | 'type'>>) => void;
}

const NotificationCtx = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const tNotifications = useTranslations('notifications');
    const tCart = useTranslations('cartToast');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'cart' = 'success', options?: Partial<Omit<Notification, 'id' | 'message' | 'type'>>) => {
        const id = Math.random().toString(36).substr(2, 9);

        setNotifications(prev => {
            if (type === 'cart') {
                return [{ id, message, type, ...options }];
            }
            return [...prev.filter(n => n.type !== 'cart'), { id, message, type, ...options }];
        });

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3500);
    }, []);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationCtx.Provider value={{ showNotification }}>
            {children}
            <div className="notification-container" style={{
                position: 'fixed',
                top: '50px',
                insetInlineEnd: '20px',
                zIndex: 999999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none'
            }}>
                {isMounted && (
                    <>
                        <style suppressHydrationWarning>{`
                            @keyframes notificationSlideIn {
                                0% { transform: translateX(100%); opacity: 0; }
                                100% { transform: translateX(0); opacity: 1; }
                            }
                            .notification-item {
                                animation: notificationSlideIn 0.3s ease-out forwards;
                                pointer-events: auto;
                            }
                            [dir='rtl'] .notification-item {
                                animation: notificationSlideInRTL 0.3s ease-out forwards;
                            }
                            @keyframes notificationSlideInRTL {
                                0% { transform: translateX(-100%); opacity: 0; }
                                100% { transform: translateX(0); opacity: 1; }
                            }
                            .cart-notif {
                                background: #fff;
                                width: 350px;
                                border-radius: 8px;
                                box-shadow: 0 15px 50px rgba(0,0,0,0.15);
                                padding: 16px;
                                border: 1px solid #e5e7eb;
                                color: #1f2937;
                                position: relative;
                                margin-top: 10px;
                            }
                            .cart-notif::before {
                                content: "";
                                position: absolute;
                                top: -8px;
                                inset-inline-end: 20px;
                                width: 16px;
                                height: 16px;
                                background: #fff;
                                border-left: 1px solid #e5e7eb;
                                border-top: 1px solid #e5e7eb;
                                transform: rotate(45deg);
                            }
                            .cart-header {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                margin-bottom: 12px;
                            }
                            .cart-header h3 {
                                color: #059669;
                                font-size: 15px;
                                font-weight: 600;
                                margin: 0;
                                flex: 1;
                            }
                            .cart-body {
                                display: flex;
                                gap: 12px;
                                margin-bottom: 12px;
                            }
                            .cart-img {
                                width: 70px;
                                height: 70px;
                                object-fit: contain;
                                background: #fff;
                                border: 1px solid #f3f4f6;
                                border-radius: 4px;
                            }
                            .cart-info {
                                flex: 1;
                            }
                            .cart-info h4 {
                                font-size: 13px;
                                font-weight: 500;
                                margin: 0 0 4px 0;
                                color: #374151;
                                line-height: 1.4;
                            }
                            .cart-price-line {
                                font-size: 12px;
                                color: #6b7280;
                            }
                            .cart-total-row {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 10px 0;
                                border-top: 1px solid #f3f4f6;
                                margin-bottom: 12px;
                            }
                            .cart-total-label {
                                font-size: 15px;
                                font-weight: 500;
                                color: #111827;
                            }
                            .cart-total-value {
                                font-size: 17px;
                                font-weight: 700;
                                color: #111827;
                            }
                            .cart-buttons {
                                display: flex;
                                gap: 10px;
                            }
                            .btn-view-cart {
                                flex: 1;
                                padding: 8px;
                                border: 1px solid #d1d5db;
                                background: #fff;
                                border-radius: 6px;
                                font-weight: 600;
                                font-size: 13px;
                                cursor: pointer;
                                color: #374151;
                                transition: all 0.2s;
                            }
                            .btn-view-cart:hover {
                                background: #f9fafb;
                            }
                            .btn-checkout {
                                flex: 1.2;
                                padding: 8px;
                                border: none;
                                background: #237073;
                                color: #fff;
                                border-radius: 6px;
                                font-weight: 600;
                                font-size: 13px;
                                cursor: pointer;
                                transition: all 0.2s;
                            }
                            .btn-checkout:hover {
                                background: #1a5658;
                            }
                            .cart-progress {
                                position: absolute;
                                bottom: 0;
                                inset-inline-start: 0;
                                height: 3px;
                                background: #059669;
                                width: 100%;
                                transform-origin: left;
                                animation: progress-drain 3.5s linear forwards;
                            }
                            [dir='rtl'] .cart-progress {
                                transform-origin: right;
                            }
                            @keyframes progress-drain {
                                from { transform: scaleX(1); }
                                to { transform: scaleX(0); }
                            }
                            @media (max-width: 576px) {
                                .notification-container {
                                    inset-inline-end: 10px !important;
                                    inset-inline-start: 10px !important;
                                    top: 10px !important;
                                }
                                .notification-item, .cart-notif {
                                    width: 100% !important;
                                    max-width: calc(100vw - 20px) !important;
                                }
                            }
                        `}</style>
                        {notifications.map(n => {
                            if (n.type === 'cart') {
                                return (
                                    <div key={n.id} className="notification-item cart-notif">
                                        <div className="cart-progress" />
                                        <div className="cart-header">
                                            <div style={{ backgroundColor: '#ecfdf5', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                                                <CheckCircle size={18} color="#10b981" />
                                            </div>
                                            <h3>{tCart('title')}</h3>
                                            <X size={18} style={{ cursor: 'pointer', color: '#9ca3af' }} onClick={() => removeNotification(n.id)} />
                                        </div>
                                        <div className="cart-body">
                                            <img src={n.image} alt="product" className="cart-img" />
                                            <div className="cart-info">
                                                <h4>{n.title}</h4>
                                                <div className="cart-price-line">
                                                    {tCart('qtyLabel')}: {n.quantity || 1} &nbsp; <b>AED {n.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                                                    {n.oldPrice && <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginInlineStart: '12px', fontSize: '13px' }}>AED {n.oldPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="cart-total-row">
                                            <span className="cart-total-label">{tCart('cartTotal', { count: n.cartCount || 0 })}</span>
                                            <span className="cart-total-value">AED {n.cartTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="cart-buttons">
                                            <button className="btn-view-cart" onClick={() => {
                                                removeNotification(n.id);
                                                window.dispatchEvent(new CustomEvent('OPEN_CART_DRAWER'));
                                            }}>{tCart('viewCart')}</button>
                                            <button className="btn-checkout" onClick={() => {
                                                removeNotification(n.id);
                                                router.push('/checkout');
                                            }}>{tCart('checkoutNow')}</button>
                                        </div>
                                    </div>
                                );
                            }

                            const statusColor = n.type === 'error' ? '#d0021b' :
                                n.type === 'info' ? '#007185' :
                                    '#067D62';

                            const statusBg = n.type === 'error' ? '#fcf4f4' :
                                n.type === 'info' ? '#f0f8f9' :
                                    '#f0f9f1';

                            return (
                                <div
                                    key={n.id}
                                    className="notification-item"
                                    style={{
                                        background: '#ffffff',
                                        color: '#0f1111',
                                        padding: '16px 20px',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
                                        display: 'flex',
                                        width: '400px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        border: `1px solid ${statusColor}44`,
                                        alignItems: 'flex-start',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: statusBg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {n.type === 'error' ? <AlertCircle size={22} color={statusColor} /> :
                                            n.type === 'info' ? <Info size={22} color={statusColor} /> :
                                                <CheckCircle size={22} color={statusColor} />}
                                    </div>

                                    <div style={{ flex: 1, paddingTop: '2px' }}>
                                        <div style={{
                                            fontWeight: '800',
                                            fontSize: '15px',
                                            color: statusColor,
                                            marginBottom: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <span>{n.title || (n.type === 'success' ? tNotifications('success') : n.type === 'error' ? tNotifications('error') : tNotifications('info'))}</span>
                                            <button
                                                onClick={() => removeNotification(n.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '0' }}
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                        <div
                                            style={{ color: '#333', fontSize: '14px', lineHeight: '1.5', fontWeight: '500' }}
                                        >
                                            {n.message}
                                        </div>
                                    </div>

                                    {/* Amazon-style bottom accent line */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        insetInlineStart: 0,
                                        insetInlineEnd: 0,
                                        height: '3px',
                                        background: statusColor,
                                        opacity: 0.8
                                    }} />
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </NotificationCtx.Provider >
    );
};

export const useNotification = () => {
    const context = useContext(NotificationCtx);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
