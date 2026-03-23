'use client';

import React, { useState, useEffect } from 'react';
import { Package, ShoppingBag, DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import Loader from '@/components/shared/Loader/Loader';

const SellerOverview = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/seller/stats`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setStats(data.data);
                }
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading || !stats) {
        return <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>;
    }

    return (
        <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>Dashboard Overview</h2>
            
            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                {/* Stat Card 1 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ backgroundColor: '#eff6ff', color: '#3b82f6', padding: '16px', borderRadius: '12px' }}>
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</p>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                            AED {Number(stats.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>

                {/* Stat Card 2 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ backgroundColor: '#f0fdf4', color: '#22c55e', padding: '16px', borderRadius: '12px' }}>
                        <ShoppingBag size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</p>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                            {stats.totalOrders}
                        </h3>
                    </div>
                </div>

                {/* Stat Card 3 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ backgroundColor: '#fff7ed', color: '#f97316', padding: '16px', borderRadius: '12px' }}>
                        <Package size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Products</p>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                            {stats.activeProducts}
                        </h3>
                    </div>
                </div>

                {/* Stat Card 4 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6', padding: '16px', borderRadius: '12px' }}>
                        <Package size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Products</p>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                            {stats.totalProducts}
                        </h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* Top Products */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={18} color="#3b82f6" /> Top Selling Products
                        </h3>
                    </div>
                    <div style={{ padding: '0' }}>
                        {stats?.topProducts?.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No products sold yet.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Product Name</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Units Sold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.topProducts?.map((product: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontWeight: 500 }}>{product.name}</td>
                                            <td style={{ padding: '16px 24px', fontSize: '14px', color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{product.sold_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Recent Orders & Alerts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Inventory Alerts */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
                            <AlertTriangle size={18} color="#e11d48" />
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#be123c', margin: 0 }}>Inventory Alerts</h3>
                        </div>
                        <div style={{ padding: '16px 24px' }}>
                            {stats?.lowStockAlerts?.length === 0 ? (
                                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>All products are well stocked.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {stats?.lowStockAlerts?.map((item: any, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                            <span style={{ color: '#334155', fontWeight: 500 }}>{item.name}</span>
                                            <span style={{ color: '#e11d48', fontWeight: 700, backgroundColor: '#fff1f2', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>{item.stock_quantity} Left</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Orders */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={18} color="#8b5cf6" /> Recent Orders
                            </h3>
                        </div>
                        <div style={{ padding: '0' }}>
                            {stats?.recentOrders?.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No recent orders.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {stats?.recentOrders?.map((order: any, idx: number) => (
                                        <div key={idx} style={{ padding: '16px 24px', borderBottom: idx !== stats.recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Order #{order.id}</div>
                                                <div style={{ fontSize: '13px', color: '#64748b' }}>{order.customer_name} • {new Date(order.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>+ AED {Number(order.seller_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: order.status === 'delivered' ? '#16a34a' : order.status === 'cancelled' ? '#dc2626' : '#ea580c', textTransform: 'uppercase' }}>
                                                    {order.status}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SellerOverview;
