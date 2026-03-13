'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import SellerProducts from './SellerProducts';
import SellerOrders from './SellerOrders';
import SellerOverview from './SellerOverview';

export default function SellerDashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Authentication Guard
    React.useEffect(() => {
        if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'products', label: 'Product Management', icon: <Package size={20} /> },
        { id: 'orders', label: 'Order Management', icon: <ShoppingCart size={20} /> },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                backgroundColor: '#ffffff',
                borderInlineEnd: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                insetInlineStart: 0,
                top: 0,
                zIndex: 50
            }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                    <Link href="/" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', textDecoration: 'none' }}>
                        MARIOT <span style={{ color: '#2563eb' }}>Seller</span>
                    </Link>
                </div>

                <div style={{ padding: '24px 16px', flex: 1 }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', paddingInlineStart: '8px' }}>
                        Menu
                    </p>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: activeTab === item.id ? '#eff6ff' : 'transparent',
                                    color: activeTab === item.id ? '#2563eb' : '#475569',
                                    fontWeight: activeTab === item.id ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'left',
                                    width: '100%'
                                }}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div style={{ padding: '24px 16px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '0 8px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569' }}>
                            {user.name.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>{user.role}</div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', width: '100%',
                            borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, marginInlineStart: '260px', padding: '32px' }}>
                <div style={{ width: '100%', maxWidth: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {navItems.find(i => i.id === activeTab)?.label}
                        </h1>
                        <Link href="/" style={{
                            padding: '10px 20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                            borderRadius: '6px', color: '#475569', fontWeight: 600, textDecoration: 'none', fontSize: '14px'
                        }}>
                            Back to Store
                        </Link>
                    </div>

                    {/* Tab Contents */}
                    <div style={{
                        minHeight: '600px',
                        minWidth: '100%'
                    }}>
                        {activeTab === 'dashboard' && (
                            <div style={{ width: '100%', height: '100%', padding: '0px' }}>
                                <SellerOverview />
                            </div>
                        )}

                        {activeTab === 'products' && (
                            <div style={{ width: '100%', height: '100%', padding: '0px' }}>
                                <SellerProducts />
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div style={{ width: '100%', height: '100%', padding: '0px' }}>
                                <SellerOrders />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
