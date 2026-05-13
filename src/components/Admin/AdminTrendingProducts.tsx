'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { useNotification } from '@/context/NotificationContext';
import { Search, Plus, Trash2, ArrowUp, ArrowDown, Save, TrendingUp, ChevronLeft, RefreshCw } from 'lucide-react';

interface ProductLite {
    id: number;
    name: string;
    name_ar?: string | null;
    slug: string;
    price?: number | string | null;
    offer_price?: number | string | null;
    primary_image?: string | null;
    category_name?: string | null;
    position?: number;
}

const resolveImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${MEDIA_BASE_URL}${url}`;
    return `${MEDIA_BASE_URL}/${url}`;
};

const AdminTrendingProducts: React.FC = () => {
    const { showNotification } = useNotification();
    const [trending, setTrending] = useState<ProductLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Product picker
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<ProductLite[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchTrending = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/trending-products`, {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            const json = await res.json();
            if (json.success) {
                setTrending(Array.isArray(json.data) ? json.data : []);
                setDirty(false);
            } else {
                showNotification(json.message || 'Failed to load trending products', 'error');
            }
        } catch (err: any) {
            showNotification(err.message || 'Failed to load trending products', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchTrending();
    }, [fetchTrending]);

    // Debounced product search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const term = searchTerm.trim();
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `${API_BASE_URL}/products?search=${encodeURIComponent(term)}&limit=8&status=active`,
                    { credentials: 'include' }
                );
                const json = await res.json();
                const list: ProductLite[] = Array.isArray(json?.data?.products)
                    ? json.data.products
                    : Array.isArray(json?.data)
                        ? json.data
                        : [];
                setSearchResults(list);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 250);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchTerm]);

    const addProduct = (p: ProductLite) => {
        if (trending.some(t => t.id === p.id)) {
            showNotification('Product already in trending list', 'info');
            return;
        }
        setTrending(prev => [...prev, { ...p, position: prev.length }]);
        setDirty(true);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeProduct = (id: number) => {
        setTrending(prev => prev.filter(t => t.id !== id));
        setDirty(true);
    };

    const moveProduct = (index: number, direction: -1 | 1) => {
        setTrending(prev => {
            const next = [...prev];
            const target = index + direction;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        setDirty(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            const items = trending.map((t, idx) => ({ product_id: t.id, position: idx }));
            const res = await fetch(`${API_BASE_URL}/admin/trending-products`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ items }),
                credentials: 'include'
            });
            const json = await res.json();
            if (json.success) {
                setTrending(Array.isArray(json.data) ? json.data : trending);
                setDirty(false);
                showNotification('Trending products saved', 'success');
            } else {
                showNotification(json.message || 'Failed to save', 'error');
            }
        } catch (err: any) {
            showNotification(err.message || 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: 20, background: '#f5f7fa', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                border: '1px solid #edf2f7',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link
                        href="/admin/cms"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#4a5568',
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600
                        }}
                    >
                        <ChevronLeft size={16} /> Back to CMS
                    </Link>
                    <div style={{ height: 24, width: 1, background: '#e2e8f0' }} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp size={20} color="#10b981" /> Trending Products
                        </h1>
                        <p style={{ color: '#718096', margin: '2px 0 0 0', fontSize: 13, fontWeight: 500 }}>
                            Pick which products appear in the header search dropdown
                        </p>
                    </div>
                </div>

                <button
                    onClick={save}
                    disabled={!dirty || saving}
                    style={{
                        padding: '10px 20px',
                        borderRadius: 10,
                        background: dirty ? '#10b981' : '#cbd5e0',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: dirty && !saving ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
                </button>
            </div>

            {/* Product picker */}
            <div style={{
                background: '#fff',
                borderRadius: 12,
                padding: 20,
                border: '1px solid #edf2f7',
                marginBottom: 20
            }}>
                <h2 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 700, color: '#2d3748' }}>Add a product</h2>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search products by name, model, brand…"
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 38px',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            fontSize: 14,
                            outline: 'none'
                        }}
                    />
                </div>

                {searchTerm.trim().length >= 2 && (
                    <div style={{
                        marginTop: 10,
                        border: '1px solid #edf2f7',
                        borderRadius: 10,
                        maxHeight: 320,
                        overflowY: 'auto',
                        background: '#fff'
                    }}>
                        {searching && (
                            <div style={{ padding: 14, color: '#718096', fontSize: 13 }}>Searching…</div>
                        )}
                        {!searching && searchResults.length === 0 && (
                            <div style={{ padding: 14, color: '#a0aec0', fontSize: 13 }}>No products found.</div>
                        )}
                        {!searching && searchResults.map(p => {
                            const already = trending.some(t => t.id === p.id);
                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 12px',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}
                                >
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 8, background: '#f7fafc',
                                        flexShrink: 0, overflow: 'hidden', position: 'relative'
                                    }}>
                                        {p.primary_image && (
                                            <Image
                                                src={resolveImageUrl(p.primary_image)}
                                                alt={p.name}
                                                fill
                                                sizes="44px"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a202c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.name}
                                        </div>
                                        {p.category_name && (
                                            <div style={{ fontSize: 11, color: '#718096' }}>{p.category_name}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => addProduct(p)}
                                        disabled={already}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            background: already ? '#e2e8f0' : '#10b981',
                                            color: already ? '#718096' : '#fff',
                                            border: 'none',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: already ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                    >
                                        {already ? 'Added' : <><Plus size={12} /> Add</>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Current list */}
            <div style={{
                background: '#fff',
                borderRadius: 12,
                padding: 20,
                border: '1px solid #edf2f7'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2d3748' }}>
                        Current Trending Products ({trending.length})
                    </h2>
                </div>

                {loading ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ marginBottom: 8 }} />
                        <div>Loading…</div>
                    </div>
                ) : trending.length === 0 ? (
                    <div style={{
                        padding: 40,
                        textAlign: 'center',
                        color: '#a0aec0',
                        background: '#f7fafc',
                        borderRadius: 10,
                        border: '1px dashed #e2e8f0'
                    }}>
                        <TrendingUp size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>No trending products yet</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>Use the search above to add products</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {trending.map((p, idx) => (
                            <div
                                key={p.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: 10,
                                    border: '1px solid #edf2f7',
                                    borderRadius: 10,
                                    background: '#fff'
                                }}
                            >
                                <div style={{
                                    width: 28, height: 28, borderRadius: 6, background: '#f0f4ff',
                                    color: '#4c6ef5', fontWeight: 800, fontSize: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 8, background: '#f7fafc',
                                    flexShrink: 0, overflow: 'hidden', position: 'relative'
                                }}>
                                    {p.primary_image && (
                                        <Image
                                            src={resolveImageUrl(p.primary_image)}
                                            alt={p.name}
                                            fill
                                            sizes="48px"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a202c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.name}
                                    </div>
                                    {p.category_name && (
                                        <div style={{ fontSize: 11, color: '#718096' }}>{p.category_name}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                        onClick={() => moveProduct(idx, -1)}
                                        disabled={idx === 0}
                                        title="Move up"
                                        style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            border: '1px solid #e2e8f0', background: '#fff',
                                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                            color: idx === 0 ? '#cbd5e0' : '#4a5568',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <ArrowUp size={14} />
                                    </button>
                                    <button
                                        onClick={() => moveProduct(idx, 1)}
                                        disabled={idx === trending.length - 1}
                                        title="Move down"
                                        style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            border: '1px solid #e2e8f0', background: '#fff',
                                            cursor: idx === trending.length - 1 ? 'not-allowed' : 'pointer',
                                            color: idx === trending.length - 1 ? '#cbd5e0' : '#4a5568',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <ArrowDown size={14} />
                                    </button>
                                    <button
                                        onClick={() => removeProduct(p.id)}
                                        title="Remove"
                                        style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            border: '1px solid #fee2e2', background: '#fff5f5',
                                            color: '#ef4444', cursor: 'pointer',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTrendingProducts;
