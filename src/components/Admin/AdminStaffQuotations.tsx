'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import styles from './AdminStaffQuotations.module.css';
import {
    FilePlus, Search, Trash2, Eye, X, Plus, Minus, Printer,
    Mail, Loader2, ArrowLeft, Package, Percent, Check, Ban, Clock, FileText, Pencil, AlertTriangle
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import { resolveUrl } from '@/utils/resolveUrl';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import DiscountLimitsModal from './DiscountLimitsModal';

type Line = {
    product_id: number | null;
    name: string;
    model?: string;
    brand?: string;
    image?: string;
    /** Full product description — the quotation PDF prints this under the model
        number. The short description is deliberately not used: the quotation is
        the document a customer decides from. */
    description?: string;
    description_ar?: string;
    unit_price: number;
    quantity: number;
    discount_pct: number;
    /** Admin-set ceiling for staff, null when the product is uncapped. */
    max_staff_discount_pct: number | null;
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const PRODUCTS_PER_PAGE = 20;

const effectivePrice = (p: any) => {
    const list = Number(p.price) > 0 ? Number(p.price) : (Number(p.min_variant_price) || 0);
    const now = Date.now();
    const inWindow =
        (!p.offer_start || new Date(p.offer_start).getTime() <= now) &&
        (!p.offer_end || new Date(p.offer_end).getTime() > now);
    const hasOffer = inWindow && Number(p.offer_price) > 0 && Number(p.offer_price) < list;
    const unit = hasOffer ? Number(p.offer_price) : list;
    const off = hasOffer && list > 0 ? Math.round(((list - unit) / list) * 100) : 0;
    return { unit, list, hasOffer, off };
};

const AdminStaffQuotations = () => {
    const { showNotification } = useNotification();
    const { user } = useAuth();
    // Admins are never capped; only staff are held to the per-product ceiling.
    const isStaff = user?.role === 'staff';

    const [view, setView] = useState<'list' | 'builder'>('list');
    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<any>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [confirm, setConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
    const [limitsOpen, setLimitsOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    // Admins see every quotation by default; this narrows the view to their own.
    // Staff are already scoped server-side, so the control is pointless for them.
    const [mineOnly, setMineOnly] = useState(false);
    const [reviewModal, setReviewModal] = useState<{ q: any; decision: 'approved' | 'rejected' } | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewSaving, setReviewSaving] = useState(false);

    // ── Builder state ──────────────────────────────────────────────────
    const [customer, setCustomer] = useState({ customer_name: '', customer_email: '', customer_phone: '', vat_number: '', notes: '' });
    const [lines, setLines] = useState<Line[]>([]);
    const [productQuery, setProductQuery] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [productPage, setProductPage] = useState(1);
    const [productTotal, setProductTotal] = useState(0);
    const [productPages, setProductPages] = useState(1);
    const [productResults, setProductResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    // Set while editing an existing quotation; null means a new one.
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingRef, setEditingRef] = useState('');
    const [editingStatus, setEditingStatus] = useState<string>('');
    // Admin's max discount, as a share of the subtotal. At or under it a staff
    // quotation is approved on submission; over it, an admin has to sign it off.
    const [thresholdPct, setThresholdPct] = useState<number>(20);
    const [customerMatches, setCustomerMatches] = useState<any[]>([]);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [pickedCustomerId, setPickedCustomerId] = useState<number | null>(null);

    const fetchQuotations = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/staff-quotations`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) setQuotations(data.data || []);
            else showNotification(data.message || 'Failed to load quotations', 'error');
        } catch (e) {
            showNotification('Failed to load quotations', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings`, { credentials: 'include' });
                const data = await res.json();
                const pct = data?.data?.staff_quotation_max_discount_pct;
                setThresholdPct(pct === undefined || pct === null || pct === '' ? 20 : Number(pct));
            } catch {
                setThresholdPct(20);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/categories`, {
                    credentials: 'include',
                    headers: getAuthHeaders(),
                });
                const data = await res.json();
                setCategories(data.success ? (data.data || []) : []);
            } catch {
                setCategories([]);
            }
        })();
    }, []);

    // Flatten the category tree into indented options so the hierarchy stays
    // readable in a plain <select>. Built from parent_id, so any depth works.
    const categoryOptions = useMemo(() => {
        const active = categories.filter((c: any) => c.is_active !== 0);
        const byParent = new Map<number | null, any[]>();
        active.forEach((c: any) => {
            const key = c.parent_id || null;
            if (!byParent.has(key)) byParent.set(key, []);
            byParent.get(key)!.push(c);
        });
        const out: { slug: string; label: string }[] = [];
        const walk = (parent: number | null, depth: number) => {
            const children = (byParent.get(parent) || [])
                .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
            children.forEach((c: any) => {
                out.push({ slug: c.slug || String(c.id), label: `${'\u00A0\u00A0'.repeat(depth)}${depth ? '\u2514 ' : ''}${c.name}` });
                walk(c.id, depth + 1);
            });
        };
        walk(null, 0);
        return out;
    }, [categories]);

    useEffect(() => { setProductPage(1); }, [productQuery, categoryFilter]);

    // Debounced product lookup. Staff type a name or model; the same /products
    // endpoint the storefront uses backs this, so pricing always matches the site.
    // The catalogue is listed from the outset — an empty panel gives staff nothing
    // to work from when they do not yet know what they are looking for.
    useEffect(() => {
        const q = productQuery.trim();
        let cancelled = false;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    limit: String(PRODUCTS_PER_PAGE),
                    page: String(productPage),
                });
                if (q.length >= 2) params.set('search', q);
                if (categoryFilter) params.set('category', categoryFilter);
                const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, {
                    credentials: 'include',
                    headers: getAuthHeaders(),
                });
                const data = await res.json();
                if (!cancelled) {
                    setProductResults(data.success ? (data.data || []) : []);
                    setProductTotal(Number(data.total) || 0);
                    setProductPages(Number(data.pagination?.totalPages) || 1);
                }
            } catch {
                if (!cancelled) { setProductResults([]); setProductTotal(0); setProductPages(1); }
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 300);
        return () => { cancelled = true; clearTimeout(t); };
    }, [productQuery, categoryFilter, productPage]);

    const addProduct = (p: any) => {
        // Variant products keep price 0 at product level; effectivePrice falls back to
        // the cheapest active variant so a line never starts at zero by accident, and
        // prefers a live offer price so the quote matches what the storefront shows.
        const price = effectivePrice(p).unit;
        setLines(prev => {
            const existing = prev.findIndex(l => l.product_id === p.id);
            if (existing !== -1) {
                const next = [...prev];
                next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
                return next;
            }
            return [...prev, {
                product_id: p.id,
                name: p.name || '',
                model: p.model || '',
                brand: p.brand_name || '',
                image: p.primary_image || p.image || '',
                description: p.description || '',
                description_ar: p.description_ar || '',
                unit_price: price,
                quantity: 1,
                discount_pct: 0,
                max_staff_discount_pct: p.max_staff_discount_pct === null || p.max_staff_discount_pct === undefined
                    ? null : Number(p.max_staff_discount_pct),
            }];
        });
        setProductQuery('');
    };

    const updateLine = (idx: number, patch: Partial<Line>) => {
        setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    };
    const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

    // Mirrors the server's priceItems() exactly so the staff member sees the same
    // numbers that will be stored. The server still recomputes — this is display only.
    const totalUnits = useMemo(
        () => lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0),
        [lines]
    );

    const totals = useMemo(() => {
        let subtotal = 0, discount = 0;
        lines.forEach(l => {
            const gross = round2(l.unit_price * l.quantity);
            subtotal += gross;
            discount += round2(gross * (Math.min(100, Math.max(0, l.discount_pct)) / 100));
        });
        subtotal = round2(subtotal);
        discount = round2(discount);
        const taxable = Math.max(0, round2(subtotal - discount));
        const vat = round2(taxable * 0.05);
        return { subtotal, discount, vat, total: round2(taxable + vat) };
    }, [lines]);

    const loadForEdit = (q: any) => {
        const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
        setCustomer({
            customer_name: q.customer_name || '',
            customer_email: q.customer_email || '',
            customer_phone: q.customer_phone || '',
            vat_number: q.vat_number || '',
            notes: q.notes || '',
        });
        setLines(items.map((i: any) => ({
            product_id: i.product_id ?? null,
            name: i.name || '',
            model: i.model || '',
            brand: i.brand || '',
            image: i.image || '',
            description: i.description || '',
            description_ar: i.description_ar || '',
            unit_price: Number(i.unit_price ?? i.price) || 0,
            quantity: Number(i.quantity) || 1,
            discount_pct: Number(i.discount_pct) || 0,
            max_staff_discount_pct: i.max_staff_discount_pct === null || i.max_staff_discount_pct === undefined
                ? null : Number(i.max_staff_discount_pct),
        })));
        setEditingId(q.id);
        setEditingRef(q.quotation_ref || '');
        setEditingStatus(q.status || 'pending');
        setView('builder');
    };

    const rejectionNote = quotations.find(q => q.id === editingId)?.review_note || '';

    useEffect(() => {
        const term = customer.customer_name.trim();
        // A name chosen from the list should not immediately re-open it.
        if (term.length < 2 || pickedCustomerId !== null) { setCustomerMatches([]); return; }
        let cancelled = false;
        const t = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/staff-quotations/customers?search=${encodeURIComponent(term)}`,
                    { credentials: 'include', headers: getAuthHeaders() }
                );
                const data = await res.json();
                if (!cancelled) {
                    setCustomerMatches(data.success ? (data.data || []) : []);
                    setCustomerOpen(true);
                }
            } catch {
                if (!cancelled) setCustomerMatches([]);
            }
        }, 300);
        return () => { cancelled = true; clearTimeout(t); };
    }, [customer.customer_name, pickedCustomerId]);

    const pickCustomer = (c: any) => {
        setCustomer(prev => ({
            ...prev,
            customer_name: c.name || '',
            // Only fill blanks — never overwrite something already typed for this quote.
            customer_email: prev.customer_email || c.email || '',
            customer_phone: prev.customer_phone || c.phone_number || '',
            vat_number: prev.vat_number || c.vat_number || '',
        }));
        setPickedCustomerId(c.id);
        setCustomerMatches([]);
        setCustomerOpen(false);
    };

    // Share of the subtotal, matching the server's rule exactly.
    const discountShare = totals.subtotal > 0 ? (totals.discount / totals.subtotal) * 100 : 0;
    const needsApproval = isStaff && discountShare > thresholdPct;

    const resetBuilder = () => {
        setCustomer({ customer_name: '', customer_email: '', customer_phone: '', vat_number: '', notes: '' });
        setLines([]);
        setProductQuery('');
        setProductResults([]);
        setEditingId(null);
        setEditingRef('');
        setEditingStatus('');
    };

    const saveQuotation = async () => {
        if (!customer.customer_name.trim()) { showNotification('Customer name is required', 'error'); return; }
        if (lines.length === 0) { showNotification('Add at least one product', 'error'); return; }

        setSaving(true);
        try {
            const res = await fetch(
                editingId ? `${API_BASE_URL}/staff-quotations/${editingId}` : `${API_BASE_URL}/staff-quotations`,
                {
                    method: editingId ? 'PUT' : 'POST',
                    credentials: 'include',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...customer, items: lines }),
                }
            );
            const data = await res.json();
            if (data.success) {
                const ref = data.data?.quotation_ref || editingRef;
                showNotification(
                    editingId
                        ? (isStaff ? `${ref} resubmitted for approval` : `${ref} updated`)
                        : (isStaff ? `${ref} submitted for approval` : `Quotation ${ref} created`)
                );
                resetBuilder();
                setView('list');
                setLoading(true);
                fetchQuotations();
            } else {
                showNotification(data.message || 'Failed to create quotation', 'error');
            }
        } catch {
            showNotification('Failed to create quotation', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Build the same branded PDF the cart flow produces, from a stored row.
    const buildPdf = async (q: any) => {
        const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
        return generateQuotationPDF({
            ...q,
            items: items.map((i: any) => ({ ...i, image: resolveUrl(i.image) })),
        }, true, false);
    };

    const printQuotation = async (q: any) => {
        setBusyId(q.id);
        try {
            await buildPdf(q);
        } catch {
            showNotification('Could not generate the PDF', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const emailQuotation = async (q: any) => {
        if (!q.customer_email) { showNotification('This quotation has no customer email', 'error'); return; }
        setBusyId(q.id);
        try {
            const pdfDataUri = await buildPdf(q);
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${q.id}/send-email`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdf_base64: pdfDataUri, locale: 'en' }),
            });
            const data = await res.json();
            showNotification(data.message || (data.success ? 'Email sent' : 'Failed to send'), data.success ? 'success' : 'error');
            if (data.success) fetchQuotations();
        } catch {
            showNotification('Failed to send the email', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const submitReview = async () => {
        if (!reviewModal) return;
        if (reviewModal.decision === 'rejected' && !reviewNote.trim()) {
            showNotification('Add a note explaining why it was not approved', 'error');
            return;
        }
        setReviewSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${reviewModal.q.id}/review`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: reviewModal.decision, review_note: reviewNote.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message);
                setReviewModal(null);
                setReviewNote('');
                fetchQuotations();
            } else {
                showNotification(data.message || 'Failed to save the decision', 'error');
            }
        } catch {
            showNotification('Failed to save the decision', 'error');
        } finally {
            setReviewSaving(false);
        }
    };

    const deleteQuotation = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                setQuotations(prev => prev.filter(q => q.id !== id));
                showNotification('Quotation deleted');
            } else showNotification(data.message || 'Failed to delete', 'error');
        } catch {
            showNotification('Failed to delete', 'error');
        } finally {
            setConfirm({ open: false, id: null });
        }
    };

    const statusCounts = quotations
        .filter(q => !mineOnly || Number(q.created_by) === Number(user?.id))
        .reduce((acc: Record<string, number>, q) => {
        const st = q.status || 'pending';
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, {});

    const mineCount = quotations.filter(q => Number(q.created_by) === Number(user?.id)).length;

    const scope = quotations.filter(q => !mineOnly || Number(q.created_by) === Number(user?.id));
    const approvedValue = scope
        .filter(q => (q.status || 'pending') === 'approved')
        .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
    const pendingValue = scope
        .filter(q => (q.status || 'pending') === 'pending')
        .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    const filtered = quotations.filter(q => {
        if (mineOnly && Number(q.created_by) !== Number(user?.id)) return false;
        if (statusFilter !== 'all' && (q.status || 'pending') !== statusFilter) return false;
        const s = searchTerm.toLowerCase();
        return !s
            || String(q.quotation_ref || '').toLowerCase().includes(s)
            || String(q.customer_name || '').toLowerCase().includes(s)
            || String(q.customer_email || '').toLowerCase().includes(s);
    });

    if (loading) return <AdminLoader />;

    // ── Builder ────────────────────────────────────────────────────────
    if (view === 'builder') {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => { resetBuilder(); setView('list'); }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div>
                        <h1 className={styles.title}>
                            {editingId ? `Edit ${editingRef}` : 'Create Quotation'}
                        </h1>
                        <p className={styles.subtitle}>Select products, set quantities and apply a discount per line.</p>
                    </div>
                </div>

                {editingId && editingStatus === 'rejected' && rejectionNote && (
                    <div className={styles.rejectBanner}>
                        <Ban size={16} />
                        <div>
                            <strong>Not approved</strong>
                            <div>{rejectionNote}</div>
                        </div>
                    </div>
                )}

                <div className={styles.builderGrid}>
                    <div className={styles.builderMain}>
                        {/* Product picker */}
                        <div className={styles.card}>
                            <div className={styles.cardLabelRow}>
                                <label className={styles.cardLabel}>Add products</label>
                                {lines.length > 0 && (
                                    <span className={styles.addedCount}>
                                        {lines.length} product{lines.length === 1 ? '' : 's'}
                                        {' \u00B7 '}
                                        {totalUnits} unit{totalUnits === 1 ? '' : 's'} added
                                    </span>
                                )}
                            </div>
                            <select
                                className={styles.categorySelect}
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                            >
                                <option value="">All categories</option>
                                {categoryOptions.map(c => (
                                    <option key={c.slug} value={c.slug}>{c.label}</option>
                                ))}
                            </select>
                            <div className={styles.searchBox}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by product name or model…"
                                    value={productQuery}
                                    onChange={e => setProductQuery(e.target.value)}
                                />
                                {searching && <Loader2 size={16} className={styles.spin} />}
                            </div>
                            {productResults.length === 0 && !searching && (
                                <div className={styles.empty}>No products match.</div>
                            )}
                            {productResults.length > 0 && (
                                <div className={styles.productGrid}>
                                    {productResults.map(p => {
                                        const { unit, list, hasOffer, off } = effectivePrice(p);
                                        const added = lines.some(l => l.product_id === p.id);
                                        const cap = p.max_staff_discount_pct;
                                        return (
                                            <button
                                                key={p.id}
                                                className={`${styles.productCard} ${added ? styles.productCardAdded : ''}`}
                                                onClick={() => addProduct(p)}
                                                title={added ? 'Already on the quotation — adds another unit' : 'Add to quotation'}
                                            >
                                                <div className={styles.cardThumb}>
                                                    {p.primary_image
                                                        ? <img src={resolveUrl(p.primary_image)} alt="" />
                                                        : <Package size={22} />}
                                                    {added && <span className={styles.addedTick}>Added</span>}
                                                    {hasOffer && off > 0 && (
                                                        <span className={styles.offerTick}>-{off}%</span>
                                                    )}
                                                </div>
                                                <div className={styles.cardBody}>
                                                    <div className={styles.cardName}>{p.name}</div>
                                                    <div className={styles.cardMeta}>{p.brand_name || '—'}{p.model ? ` · ${p.model}` : ''}</div>
                                                    <div className={styles.cardFooter}>
                                                        <span className={styles.cardPriceWrap}>
                                                            <span className={hasOffer ? styles.cardPriceOffer : styles.cardPrice}>
                                                                <CurrencyPrice amount={unit} />
                                                            </span>
                                                            {hasOffer && (
                                                                <span className={styles.cardPriceOld}><CurrencyPrice amount={list} /></span>
                                                            )}
                                                        </span>
                                                        <span className={styles.cardAdd}><Plus size={14} /></span>
                                                    </div>
                                                    {isStaff && cap !== null && cap !== undefined && (
                                                        <div className={styles.capHint}>max {cap}% discount</div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {productTotal > 0 && (
                                <div className={styles.pager}>
                                    <span>
                                        {(productPage - 1) * PRODUCTS_PER_PAGE + 1}
                                        –{Math.min(productPage * PRODUCTS_PER_PAGE, productTotal)} of {productTotal}
                                    </span>
                                    <div className={styles.pagerBtns}>
                                        <button
                                            onClick={() => setProductPage(n => Math.max(1, n - 1))}
                                            disabled={productPage <= 1 || searching}
                                        >Previous</button>
                                        <span className={styles.pagerPage}>{productPage} / {productPages}</span>
                                        <button
                                            onClick={() => setProductPage(n => Math.min(productPages, n + 1))}
                                            disabled={productPage >= productPages || searching}
                                        >Next</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Line items */}
                        <div className={styles.card}>
                            <div className={styles.cardLabelRow}>
                                <label className={styles.cardLabel}>Items ({lines.length})</label>
                                {totalUnits > 0 && (
                                    <span className={styles.addedCount}>{totalUnits} unit{totalUnits === 1 ? '' : 's'}</span>
                                )}
                            </div>
                            {lines.length === 0 ? (
                                <div className={styles.empty}>No products yet. Search above to add the first one.</div>
                            ) : (
                                <div className={styles.linesTableWrap}>
                                    <table className={styles.linesTable}>
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Unit price</th>
                                                <th>Qty</th>
                                                <th>Disc %</th>
                                                <th>Line total</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((l, idx) => {
                                                const gross = round2(l.unit_price * l.quantity);
                                                // Only staff see a ceiling; for an admin the field stays open to 100%.
                                                const lineCap = isStaff ? l.max_staff_discount_pct : null;
                                                const lineTotal = round2(gross - gross * (Math.min(100, Math.max(0, l.discount_pct)) / 100));
                                                return (
                                                    <tr key={`${l.product_id}-${idx}`}>
                                                        <td>
                                                            <div className={styles.lineName}>{l.name}</div>
                                                            <div className={styles.lineMeta}>{l.brand || '—'}{l.model ? ` · ${l.model}` : ''}</div>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number" min={0} step="0.01"
                                                                className={styles.numInput}
                                                                value={l.unit_price}
                                                                onChange={e => updateLine(idx, { unit_price: Number(e.target.value) })}
                                                            />
                                                        </td>
                                                        <td>
                                                            <div className={styles.qtyBox}>
                                                                <button onClick={() => updateLine(idx, { quantity: Math.max(1, l.quantity - 1) })}><Minus size={12} /></button>
                                                                <span>{l.quantity}</span>
                                                                <button onClick={() => updateLine(idx, { quantity: l.quantity + 1 })}><Plus size={12} /></button>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number" min={0} max={lineCap === null ? 100 : lineCap} step="0.5"
                                                                className={styles.numInput}
                                                                value={l.discount_pct}
                                                                onChange={e => updateLine(idx, {
                                                                    discount_pct: Math.min(lineCap === null ? 100 : lineCap, Math.max(0, Number(e.target.value)))
                                                                })}
                                                            />
                                                            {lineCap !== null && (
                                                                <div className={styles.capHint}>max {lineCap}%</div>
                                                            )}
                                                        </td>
                                                        <td className={styles.lineTotal}><CurrencyPrice amount={lineTotal} /></td>
                                                        <td>
                                                            <button className={styles.iconDanger} onClick={() => removeLine(idx)} title="Remove">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer + totals */}
                    <aside className={styles.builderSide}>
                        <div className={styles.card}>
                            <label className={styles.cardLabel}>Customer</label>
                            <div className={styles.customerField}>
                                <input
                                    className={styles.input}
                                    placeholder="Full name *"
                                    value={customer.customer_name}
                                    autoComplete="off"
                                    onChange={e => {
                                        setPickedCustomerId(null);
                                        setCustomer({ ...customer, customer_name: e.target.value });
                                    }}
                                    onFocus={() => customerMatches.length > 0 && setCustomerOpen(true)}
                                    onBlur={() => setTimeout(() => setCustomerOpen(false), 150)}
                                />
                                {pickedCustomerId !== null && (
                                    <span className={styles.existingTag}>Existing customer</span>
                                )}
                                {customerOpen && customerMatches.length > 0 && (
                                    <div className={styles.customerList}>
                                        {customerMatches.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className={styles.customerRow}
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={() => pickCustomer(c)}
                                            >
                                                <span className={styles.lineName}>{c.name}</span>
                                                <span className={styles.lineMeta}>
                                                    {c.email || '—'}{c.company_name ? ` · ${c.company_name}` : ''}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input className={styles.input} placeholder="Email" type="email" value={customer.customer_email}
                                onChange={e => setCustomer({ ...customer, customer_email: e.target.value })} />
                            <input className={styles.input} placeholder="Phone" value={customer.customer_phone}
                                onChange={e => setCustomer({ ...customer, customer_phone: e.target.value })} />
                            <input className={styles.input} placeholder="VAT / TRN" value={customer.vat_number}
                                onChange={e => setCustomer({ ...customer, vat_number: e.target.value })} />
                            <textarea className={styles.textarea} placeholder="Internal notes (not shown to the customer)" rows={3}
                                value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
                        </div>

                        <div className={styles.card}>
                            <label className={styles.cardLabel}>Totals</label>
                            <div className={styles.totalRow}><span>Subtotal</span><CurrencyPrice amount={totals.subtotal} /></div>
                            <div className={styles.totalRow}><span>Discount</span><span className={styles.negative}>− <CurrencyPrice amount={totals.discount} /></span></div>
                            <div className={styles.totalRow}><span>VAT (5%)</span><CurrencyPrice amount={totals.vat} /></div>
                            <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>Total</span><CurrencyPrice amount={totals.total} /></div>

                            {isStaff && lines.length > 0 && (
                                <div className={needsApproval ? styles.capWarn : styles.capOk}>
                                    {needsApproval ? <AlertTriangle size={14} /> : <Check size={14} />}
                                    <span>
                                        {needsApproval
                                            ? <>Discount is {discountShare.toFixed(1)}%, above the {thresholdPct}% limit — this needs an admin&apos;s approval before it can be downloaded.</>
                                            : <>Discount is {discountShare.toFixed(1)}%, within the {thresholdPct}% limit — approved on save, ready to download.</>}
                                    </span>
                                </div>
                            )}

                            <button className={styles.primaryBtn} onClick={saveQuotation} disabled={saving}>
                                {saving
                                    ? <><Loader2 size={16} className={styles.spin} /> Saving…</>
                                    : isStaff
                                        ? (needsApproval
                                            ? (editingId ? <>Resubmit for Approval</> : <>Submit for Approval</>)
                                            : (editingId ? <>Save Changes</> : <>Save Quotation</>))
                                        : (editingId ? <>Save Changes</> : <>Save Quotation</>)}
                            </button>
                            <p className={styles.hint}>
                                {isStaff
                                    ? (needsApproval
                                        ? 'Goes to an admin for approval. It cannot be downloaded or emailed until approved.'
                                        : 'Approved automatically, so you can download and email it right away.')
                                    : 'Saved as approved, since you are an admin. Emailing the customer is a separate action from the list.'}
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    // ── List ───────────────────────────────────────────────────────────
    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>{isStaff ? 'My Quotations' : 'Staff Quotations'}</h1>
                    <p className={styles.subtitle}>
                        {isStaff
                            ? 'Quotations you have raised, and whether an admin has approved them.'
                            : 'Quotations built by staff, with per-product discounts.'}
                    </p>
                </div>
                <div className={styles.headerActions}>
                    {!isStaff && (
                        <button className={styles.secondaryBtn} onClick={() => setLimitsOpen(true)}>
                            <Percent size={16} /> Discount Limits
                        </button>
                    )}
                    <button className={styles.primaryBtn} onClick={() => setView('builder')}>
                        <FilePlus size={16} /> Create Quotation
                    </button>
                </div>
            </div>

            <div className={styles.kpiRow}>
                <button
                    className={`${styles.kpi} ${statusFilter === 'all' ? styles.kpiActive : ''}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <span className={styles.kpiLabel}><FileText size={13} /> Total quotations</span>
                    <span className={styles.kpiValue}>{scope.length}</span>
                </button>
                <button
                    className={`${styles.kpi} ${statusFilter === 'pending' ? styles.kpiActive : ''}`}
                    onClick={() => setStatusFilter('pending')}
                >
                    <span className={styles.kpiLabel}>
                        <Clock size={13} className={styles.inkWarning} /> Awaiting approval
                    </span>
                    <span className={styles.kpiValue}>{statusCounts.pending || 0}</span>
                    <span className={styles.kpiSub}><CurrencyPrice amount={pendingValue} /> pending</span>
                </button>
                <button
                    className={`${styles.kpi} ${statusFilter === 'approved' ? styles.kpiActive : ''}`}
                    onClick={() => setStatusFilter('approved')}
                >
                    <span className={styles.kpiLabel}>
                        <Check size={13} className={styles.inkGood} /> Approved
                    </span>
                    <span className={styles.kpiValue}>{statusCounts.approved || 0}</span>
                    <span className={styles.kpiSub}><CurrencyPrice amount={approvedValue} /> approved value</span>
                </button>
                <button
                    className={`${styles.kpi} ${statusFilter === 'rejected' ? styles.kpiActive : ''}`}
                    onClick={() => setStatusFilter('rejected')}
                >
                    <span className={styles.kpiLabel}>
                        <Ban size={13} className={styles.inkCritical} /> Not approved
                    </span>
                    <span className={styles.kpiValue}>{statusCounts.rejected || 0}</span>
                </button>
            </div>

            <div className={styles.filterBar}>
                <div className={styles.searchBox}>
                <Search size={16} />
                <input type="text" placeholder="Search by reference, customer or email…"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                {!isStaff && (
                    <button
                        className={`${styles.mineToggle} ${mineOnly ? styles.mineToggleActive : ''}`}
                        onClick={() => setMineOnly(v => !v)}
                        title="Show only quotations you raised"
                    >
                        Created by me
                        <span className={styles.tabCount}>{mineCount}</span>
                    </button>
                )}
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>REFERENCE</th>
                            <th>CUSTOMER</th>
                            <th>CREATED BY</th>
                            <th>DATE</th>
                            <th>STATUS</th>
                            <th>DISCOUNT</th>
                            <th>TOTAL</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8} className={styles.emptyCell}>No quotations here.</td></tr>
                        ) : filtered.map(q => (
                            <tr key={q.id}>
                                <td className={styles.ref}>{q.quotation_ref}</td>
                                <td>
                                    <div className={styles.lineName}>{q.customer_name}</div>
                                    <div className={styles.lineMeta}>{q.customer_email || '—'}</div>
                                </td>
                                <td>
                                    <div className={styles.lineName}>{q.created_by_name || 'Unknown'}</div>
                                    {q.created_by_role && (
                                        <span className={`${styles.roleBadge} ${q.created_by_role === 'admin' ? styles.roleAdmin : styles.roleStaff}`}>
                                            {q.created_by_role}
                                        </span>
                                    )}
                                </td>
                                <td>{q.created_at ? new Date(q.created_at).toLocaleDateString() : '—'}</td>
                                <td>
                                    {(() => {
                                        const st = q.status || 'pending';
                                        const cls = st === 'approved' ? styles.stApproved
                                            : st === 'rejected' ? styles.stRejected : styles.stPending;
                                        const Icon = st === 'approved' ? Check : st === 'rejected' ? Ban : Clock;
                                        const label = st === 'approved' ? 'Approved'
                                            : st === 'rejected' ? 'Not approved' : 'Awaiting approval';
                                        return (
                                            <span className={`${styles.statusPill} ${cls}`} title={q.review_note || ''}>
                                                <Icon size={12} /> {label}
                                            </span>
                                        );
                                    })()}
                                    {q.review_note && <div className={styles.reviewNoteInline}>{q.review_note}</div>}
                                </td>
                                <td className={styles.negative}>{Number(q.discount_amount) > 0 ? <>− <CurrencyPrice amount={Number(q.discount_amount)} /></> : '—'}</td>
                                <td className={styles.lineTotal}><CurrencyPrice amount={Number(q.total_amount)} /></td>
                                <td>
                                    <div className={styles.actions}>
                                        <button onClick={() => setSelected(q)} title="View"><Eye size={15} /></button>
                                        {(!isStaff || (q.status || 'pending') !== 'approved') && (
                                            <button onClick={() => loadForEdit(q)} title="Edit"><Pencil size={15} /></button>
                                        )}
                                        {!isStaff && (q.status || 'pending') !== 'approved' && (
                                            <button className={styles.iconApprove}
                                                onClick={() => { setReviewNote(''); setReviewModal({ q, decision: 'approved' }); }}
                                                title="Approve"><Check size={15} /></button>
                                        )}
                                        {!isStaff && (q.status || 'pending') !== 'rejected' && (
                                            <button className={styles.iconReject}
                                                onClick={() => { setReviewNote(''); setReviewModal({ q, decision: 'rejected' }); }}
                                                title="Mark as not approved"><Ban size={15} /></button>
                                        )}
                                        <button onClick={() => printQuotation(q)}
                                            disabled={busyId === q.id || (isStaff && (q.status || 'pending') !== 'approved')}
                                            title={isStaff && (q.status || 'pending') !== 'approved'
                                                ? 'Available once the quotation is approved'
                                                : 'Download PDF'}>
                                            {busyId === q.id ? <Loader2 size={15} className={styles.spin} /> : <Printer size={15} />}
                                        </button>
                                        <button onClick={() => emailQuotation(q)}
                                            disabled={busyId === q.id || !q.customer_email || (q.status || 'pending') !== 'approved'}
                                            title={(q.status || 'pending') !== 'approved'
                                                ? 'Only approved quotations can be emailed'
                                                : (q.customer_email ? 'Email to customer' : 'No customer email')}>
                                            <Mail size={15} />
                                        </button>
                                        <button className={styles.iconDanger} onClick={() => setConfirm({ open: true, id: q.id })} title="Delete">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selected && (
                <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{selected.quotation_ref}</h2>
                            <button onClick={() => setSelected(null)}><X size={18} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.metaGrid}>
                                <div><span>Customer</span><strong>{selected.customer_name}</strong></div>
                                <div><span>Email</span><strong>{selected.customer_email || '—'}</strong></div>
                                <div><span>Phone</span><strong>{selected.customer_phone || '—'}</strong></div>
                                <div><span>VAT / TRN</span><strong>{selected.vat_number || '—'}</strong></div>
                                <div>
                                    <span>Created by</span>
                                    <strong>
                                        {selected.created_by_name || 'Unknown'}
                                        {selected.created_by_role ? ` (${selected.created_by_role})` : ''}
                                    </strong>
                                </div>
                                <div>
                                    <span>Created on</span>
                                    <strong>{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</strong>
                                </div>
                            </div>
                            {selected.review_note && (
                                <p className={`${styles.notes} ${(selected.status === 'rejected') ? styles.notesReject : ''}`}>
                                    <span>{selected.status === 'rejected' ? 'Not approved:' : 'Approval note:'}</span> {selected.review_note}
                                    {selected.reviewed_by_name ? ` — ${selected.reviewed_by_name}` : ''}
                                </p>
                            )}
                            {selected.notes && <p className={styles.notes}><span>Notes:</span> {selected.notes}</p>}
                            <table className={styles.table}>
                                <thead>
                                    <tr><th>PRODUCT</th><th>UNIT</th><th>QTY</th><th>DISC %</th><th>TOTAL</th></tr>
                                </thead>
                                <tbody>
                                    {(typeof selected.items === 'string' ? JSON.parse(selected.items) : (selected.items || [])).map((i: any, idx: number) => (
                                        <tr key={idx}>
                                            <td>{i.name}</td>
                                            <td><CurrencyPrice amount={Number(i.unit_price ?? i.price)} /></td>
                                            <td>{i.quantity}</td>
                                            <td>{Number(i.discount_pct) > 0 ? `${i.discount_pct}%` : '—'}</td>
                                            <td className={styles.lineTotal}><CurrencyPrice amount={Number(i.line_total)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className={styles.modalTotals}>
                                <div className={styles.totalRow}><span>Subtotal</span><CurrencyPrice amount={Number(selected.subtotal)} /></div>
                                <div className={styles.totalRow}><span>Discount</span><span className={styles.negative}>− <CurrencyPrice amount={Number(selected.discount_amount)} /></span></div>
                                <div className={styles.totalRow}><span>VAT (5%)</span><CurrencyPrice amount={Number(selected.tax_amount)} /></div>
                                <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>Total</span><CurrencyPrice amount={Number(selected.total_amount)} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reviewModal && (
                <div className={styles.modalOverlay} onClick={() => setReviewModal(null)}>
                    <div className={styles.modal} style={{ maxWidth: '470px' }} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{reviewModal.decision === 'approved' ? 'Approve quotation' : 'Not approved'}</h2>
                            <button onClick={() => setReviewModal(null)}><X size={18} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.hint} style={{ margin: '0 0 12px' }}>
                                {reviewModal.q.quotation_ref} · {reviewModal.q.customer_name}
                                {reviewModal.q.created_by_name ? ` · raised by ${reviewModal.q.created_by_name}` : ''}
                            </p>
                            <textarea
                                className={styles.textarea}
                                rows={4}
                                placeholder={reviewModal.decision === 'approved'
                                    ? 'Note for the author (optional)'
                                    : 'Why is it not approved? (required)'}
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                            />
                            <button
                                className={reviewModal.decision === 'approved' ? styles.primaryBtn : styles.dangerBtn}
                                onClick={submitReview}
                                disabled={reviewSaving}
                            >
                                {reviewSaving
                                    ? <><Loader2 size={16} className={styles.spin} /> Saving…</>
                                    : (reviewModal.decision === 'approved' ? <><Check size={16} /> Approve</> : <><Ban size={16} /> Mark not approved</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {limitsOpen && <DiscountLimitsModal onClose={() => setLimitsOpen(false)} />}

            <ConfirmModal
                isOpen={confirm.open}
                title="Delete quotation"
                message="This permanently removes the quotation. This cannot be undone."
                confirmLabel="Delete"
                type="danger"
                onConfirm={() => confirm.id && deleteQuotation(confirm.id)}
                onCancel={() => setConfirm({ open: false, id: null })}
            />
        </div>
    );
};

export default AdminStaffQuotations;
