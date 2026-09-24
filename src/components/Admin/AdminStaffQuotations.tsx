'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import styles from './AdminStaffQuotations.module.css';
import StaffQuotationProductModal from './StaffQuotationProductModal';
import {
    FilePlus, Search, Trash2, Eye, X, Plus, Minus, Printer,
    Mail, Loader2, ArrowLeft, Package, Percent, Check, Ban, Clock, FileText, Pencil, AlertTriangle, Download} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import { resolveUrl, PRODUCT_IMAGE_FALLBACK } from '@/utils/resolveUrl';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import DiscountLimitsModal from './DiscountLimitsModal';
import CustomerHistoryPanel, { CustomerProfile } from './CustomerHistoryPanel';
import PhoneNumberInput from './PhoneNumberInput';
import QuotationLineProduct from './QuotationLineProduct';
import { matchDialCountry } from '@/data/dialCountries';
import { useRouter } from '@/i18n/navigation';

type Line = {
    product_id: number | null;
    /** Needed by the quotation PDF to link "more…" back to the product page. */
    slug?: string;
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
    /** Set when the line was configured in the modal rather than added from its card. */
    variant_id?: number | null;
    variant_label?: string | null;
    custom_dimensions?: Record<string, string> | null;
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
    // Narrows the list to one branch. '' is every branch; 'none' is the quotations raised
    // before branch numbering existed, which belong to no branch and would otherwise be
    // unreachable once any branch is chosen.
    const [branchFilter, setBranchFilter] = useState('');
    const [reviewModal, setReviewModal] = useState<{ q: any; decision: 'approved' | 'rejected' } | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewSaving, setReviewSaving] = useState(false);

    // ── Builder state ──────────────────────────────────────────────────
    const [customer, setCustomer] = useState({ customer_name: '', customer_email: '', customer_phone: '', vat_number: '', notes: '' });
    const [lines, setLines] = useState<Line[]>([]);
    const [productQuery, setProductQuery] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [brandOptions, setBrandOptions] = useState<any[]>([]);
    /**
     * The product open in the detail modal. A product whose price depends on a choice --
     * a custom size, or a variant -- cannot be added straight from its card, because the
     * card has no way to make that choice and the list endpoint does not even return the
     * options. Those go through the modal; everything else still adds in one click.
     */
    const [modalProduct, setModalProduct] = useState<any>(null);
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
    // The phone value that produced the current match. A match made by detection is only
    // valid for the number it was found from -- changing the country code makes it a
    // different person -- so this is what tells the two apart. Null when the customer was
    // chosen by hand from the search list, which no phone edit should undo.
    const [matchedFromPhone, setMatchedFromPhone] = useState<string | null>(null);
    // The matched customer's full history. Loaded when staff pick someone from the
    // search list, or when the phone/email they type identifies an existing record --
    // so the history appears before the quotation is raised, not after.
    const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    // The history row whose quotation is being fetched for the detail modal.
    const [viewingHistoryId, setViewingHistoryId] = useState<number | null>(null);
    // Set while resolving which customer a row belongs to, for rows that predate
    // customer_id and have to be matched on phone or email first.
    const [openingCustomerFor, setOpeningCustomerFor] = useState<number | null>(null);
    const router = useRouter();
    // Branches, for the admin's "issued from" selector and the list filter. Staff never
    // choose -- their own branch is applied server-side.
    const [branches, setBranches] = useState<any[]>([]);
    const [adminBranchId, setAdminBranchId] = useState('');

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
                const res = await fetch(`${API_BASE_URL}/staff-quotations/branches`,
                    { credentials: 'include', headers: getAuthHeaders() });
                const data = await res.json();
                if (data.success) setBranches(data.data || []);
            } catch { /* silent — the selector simply stays empty */ }
        })();
    }, []);

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

    // Brands, for the picker's brand filter. Fetched once; the list is small.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/brands?all=1`, {
                    credentials: 'include',
                    headers: getAuthHeaders(),
                });
                const data = await res.json();
                const rows = data.success ? (data.data || []) : [];
                setBrandOptions(
                    rows
                        .filter((b: any) => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1')
                        .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name))),
                );
            } catch {
                setBrandOptions([]);
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

    useEffect(() => { setProductPage(1); }, [productQuery, categoryFilter, brandFilter]);

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
                if (brandFilter) params.set('brand', brandFilter);
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
    }, [productQuery, categoryFilter, brandFilter, productPage]);

    /**
     * A product needs the modal when its price is not a single number on the card: a
     * customizable product is priced from the size chosen, and a variant product from the
     * variant chosen. Clicking such a card straight onto the quotation would quote whatever
     * the parent row happens to hold, which for variant products is routinely zero or a
     * placeholder.
     */
    const needsChoice = (p: any): boolean =>
        Number(p?.is_customizable) === 1
        || Number(p?.has_variants) === 1
        || (Array.isArray(p?.variants) && p.variants.length > 0);

    /** Card click: add directly when there is nothing to choose, else open the modal. */
    const handleCardAdd = (p: any) => {
        if (needsChoice(p)) { setModalProduct(p); return; }
        addProduct(p);
    };

    /** The modal resolved a price; put that on the quotation. */
    const addFromModal = ({ product, unitPrice, variantId, variantLabel, customDimensions }: any) => {
        setLines(prev => {
            // A configured line is its own line: the same product at two sizes is two
            // entries, so matching on product_id alone would merge them wrongly.
            const key = (l: any) =>
                `${l.product_id}|${l.variant_id ?? ''}|${JSON.stringify(l.custom_dimensions ?? null)}`;
            const candidate = {
                product_id: product.id,
                variant_id: variantId ?? null,
                custom_dimensions: customDimensions ?? null,
            };
            const existing = prev.findIndex(l => key(l) === key(candidate));
            if (existing !== -1) {
                const next = [...prev];
                next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
                return next;
            }
            return [...prev, {
                product_id: product.id,
                slug: product.slug || '',
                name: product.name || '',
                model: product.model || '',
                brand: product.brand_name || '',
                // The modal's product came from the single-product endpoint, which returns an
                // images array and no primary_image -- so reading only that saved an empty
                // string and the quotation PDF fell back to the Mariot logo.
                image: product.primary_image
                    || product.image
                    || (Array.isArray(product.images) && product.images.length
                        ? (product.images.find((i: any) => Number(i.is_primary) === 1) || product.images[0])?.image_url
                        : '')
                    || '',
                description: product.description || '',
                description_ar: product.description_ar || '',
                unit_price: Number(unitPrice) || 0,
                quantity: 1,
                discount_pct: 0,
                variant_id: variantId ?? null,
                variant_label: variantLabel ?? null,
                custom_dimensions: customDimensions ?? null,
                max_staff_discount_pct: product.max_staff_discount_pct === null || product.max_staff_discount_pct === undefined
                    ? null : Number(product.max_staff_discount_pct),
            }];
        });
        setModalProduct(null);
    };

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
                slug: p.slug || '',
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
            slug: i.slug || '',
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

    // Phone and email are the strong identifiers, so typing either is enough to
    // recognise a returning customer -- staff do not have to search by name first, and
    // the history appears before anything is saved. Names are deliberately NOT used:
    // two people called the same thing are not the same customer.
    useEffect(() => {
        const phone = customer.customer_phone.trim();

        // A customer chosen by hand from the search list stands until the name is edited.
        // matchedFromPhone is null for those, which is what tells them apart from a match
        // this effect made.
        if (pickedCustomerId !== null && matchedFromPhone === null) return;

        // Everything below is derived from the phone alone. The number decides who this
        // is, so the panel must never outlive the number that produced it.
        const dialCountry = matchDialCountry(phone);
        const subscriberDigits = (dialCountry
            ? phone.slice(dialCountry.dial.length)
            : phone).replace(/\D/g, '');
        // Counted without the dialling code: the field always carries one, so a bare
        // "+971" is already 3 digits and must not look like a number worth looking up.
        const usablePhone = subscriberDigits.length >= 7 ? phone : '';

        // Nothing identifiable in the field. Anything shown from a previous number is
        // now wrong, so it goes -- including a half-typed number mid-edit.
        if (!usablePhone) {
            if (pickedCustomerId !== null || customerProfile !== null) {
                setPickedCustomerId(null);
                setMatchedFromPhone(null);
                setCustomerProfile(null);
            }
            return;
        }

        // The number that produced the current match is unchanged, so the match still
        // stands and there is nothing to redo.
        if (matchedFromPhone === usablePhone) return;

        // The number has changed -- including by swapping only the dialling code, which
        // makes it a different person. Clear FIRST, so nothing stale is on screen while
        // the new lookup runs, then ask again. Clearing and fetching used to be split
        // across two passes of this effect, and the intermediate render left the previous
        // customer showing beside the new number.
        if (pickedCustomerId !== null || customerProfile !== null) {
            setPickedCustomerId(null);
            setCustomerProfile(null);
        }

        let cancelled = false;
        const t = setTimeout(async () => {
            try {
                const qs = new URLSearchParams();
                qs.set('phone', usablePhone);
                const res = await fetch(
                    `${API_BASE_URL}/staff-quotations/customers/match?${qs.toString()}`,
                    { credentials: 'include', headers: getAuthHeaders() }
                );
                const data = await res.json();
                if (cancelled) return;
                if (data.success && data.data) {
                    setCustomerProfile(data.data);
                    setPickedCustomerId(data.data.customer.id);
                    setMatchedFromPhone(usablePhone);
                    // Fill only what is still blank, so a correction typed for this quote
                    // is never overwritten by the stored record.
                    //
                    // customer_phone is deliberately NOT filled. It is the input this
                    // effect keys on, and writing to it here re-entered the effect with a
                    // value the effect itself had produced -- which is how a stale panel
                    // survived a country-code change.
                    setCustomer(prev => ({
                        ...prev,
                        customer_name: prev.customer_name || data.data.customer.name || '',
                        customer_email: prev.customer_email || data.data.customer.email || '',
                        vat_number: prev.vat_number || data.data.customer.vat_number || '',
                    }));
                } else {
                    // No match: this is a new customer, and the panel must say so rather
                    // than keep showing whoever was found last.
                    setCustomerProfile(null);
                    setPickedCustomerId(null);
                    setMatchedFromPhone(null);
                }
            } catch {
                if (!cancelled) {
                    setCustomerProfile(null);
                    setPickedCustomerId(null);
                    setMatchedFromPhone(null);
                }
            }
        }, 450);
        return () => { cancelled = true; clearTimeout(t); };
        // customerProfile is read only to avoid redundant clears; it is set by this
        // effect, so listing it as a dependency would re-enter on its own writes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer.customer_phone, pickedCustomerId, matchedFromPhone]);

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
        // Null, not the phone: this was a deliberate choice, so editing the number must
        // not silently swap the customer underneath it.
        setMatchedFromPhone(null);
        setCustomerMatches([]);
        setCustomerOpen(false);
        // A 'user' result is a storefront account that has never been quoted, so it has
        // no customer record and therefore no history to show yet. Only a 'customer'
        // result has a profile to load.
        if (c.source === 'customer') {
            loadCustomerProfile(c.id);
        } else {
            setCustomerProfile(null);
        }
    };

    const loadCustomerProfile = async (customerId: number) => {
        setProfileLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/staff-quotations/customers/${customerId}/profile`,
                { credentials: 'include', headers: getAuthHeaders() }
            );
            const data = await res.json();
            setCustomerProfile(data.success ? data.data : null);
        } catch {
            setCustomerProfile(null);
        } finally {
            setProfileLoading(false);
        }
    };

    // Share of the subtotal, matching the server's rule exactly.
    const discountShare = totals.subtotal > 0 ? (totals.discount / totals.subtotal) * 100 : 0;
    const needsApproval = isStaff && discountShare > thresholdPct;

    const resetBuilder = () => {
        setCustomer({ customer_name: '', customer_email: '', customer_phone: '', vat_number: '', notes: '' });
        setLines([]);
        setProductQuery('');
        // Deliberately NOT clearing productResults. The fetch that fills it is keyed on the
        // query, the filters and the page -- none of which change when the builder is reset,
        // so emptying it here left the picker showing "No products match" beside a pager
        // reading "1-20 of 72" until the page was reloaded.
        setEditingId(null);
        setEditingRef('');
        setEditingStatus('');
        setPickedCustomerId(null);
        setMatchedFromPhone(null);
        setCustomerProfile(null);
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
                    body: JSON.stringify({
                        ...customer,
                        items: lines,
                        // Links the quote to the matched customer instead of creating a
                        // second record for someone the system already knows.
                        customer_id: pickedCustomerId,
                        // Staff quote under their own branch and the server ignores this;
                        // an admin has no branch of their own, so they must state one.
                        branch_id: isStaff ? undefined : (adminBranchId || undefined),
                    }),
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
    /**
     * @param download true saves a file; false opens the PDF in a tab, which is where the
     *        browser's own print dialog lives. Email passes false and uses the returned
     *        data URI, so nothing is saved or opened for it.
     */
    const buildPdf = async (q: any, mode: 'download' | 'open' | 'silent' = 'download') => {
        const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
        return generateQuotationPDF({
            ...q,
            items: items.map((i: any) => ({ ...i, image: resolveUrl(i.image) })),
        }, mode, false);
    };

    const downloadQuotation = async (q: any) => {
        setBusyId(q.id);
        try {
            await buildPdf(q, 'download');
        } catch {
            showNotification('Could not generate the PDF', 'error');
        } finally {
            setBusyId(null);
        }
    };

    /** Opens the PDF in a new tab, where the browser's print dialog can take over. */
    const printQuotation = async (q: any) => {
        setBusyId(q.id);
        try {
            await buildPdf(q, 'open');
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
            // false: email wants the data URI only — nothing saved, nothing opened.
            const pdfDataUri = await buildPdf(q, 'silent');
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

    /**
     * Opens a quotation from the customer's history in the same detail modal the list
     * uses.
     *
     * The history rows come from the customer profile endpoint, which returns summary
     * columns only -- no line items -- so the full record is fetched first. Reusing
     * `selected` means the products, totals and approval note are presented exactly as
     * they are everywhere else, rather than in a second, diverging modal.
     *
     * Staff may only open their own quotations; the server enforces that and answers 404
     * for anyone else's, which is surfaced here rather than failing silently.
     */
    const viewHistoryQuotation = async (id: number) => {
        setViewingHistoryId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${id}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success && data.data) setSelected(data.data);
            else showNotification(data.message || 'Could not open that quotation', 'error');
        } catch {
            showNotification('Could not open that quotation', 'error');
        } finally {
            setViewingHistoryId(null);
        }
    };

    /**
     * Opens the customer profile page for a quotation's customer.
     *
     * Quotations raised before customer records existed carry no customer_id, so those
     * fall back to the same phone/email match the builder uses to recognise a returning
     * customer. If that finds nobody there is no profile to show -- the quotation holds a
     * typed-in name and nothing else -- and saying so beats navigating to an empty page.
     */
    const openCustomer = async (q: any) => {
        if (q.customer_id) {
            router.push(`/admin/staff-quotations/customer/${q.customer_id}`);
            return;
        }
        const phone = String(q.customer_phone || '').trim();
        const email = String(q.customer_email || '').trim();
        if (!phone && !email) {
            showNotification('This quotation is not linked to a customer record', 'error');
            return;
        }
        setOpeningCustomerFor(q.id);
        try {
            const qs = new URLSearchParams();
            if (phone) qs.set('phone', phone);
            if (email) qs.set('email', email);
            const res = await fetch(`${API_BASE_URL}/staff-quotations/customers/match?${qs.toString()}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            const id = data?.data?.customer?.id;
            if (id) router.push(`/admin/staff-quotations/customer/${id}`);
            else showNotification('No customer record found for this quotation', 'error');
        } catch {
            showNotification('Could not open that customer', 'error');
        } finally {
            setOpeningCustomerFor(null);
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

    // One predicate for "is this row in view", used by the tiles and the table alike. The
    // counts above the list have to describe the list below it; computing them from a
    // different subset is how a tile ends up reading 12 over a table showing 3.
    const inScope = (q: any) => {
        if (mineOnly && Number(q.created_by) !== Number(user?.id)) return false;
        if (branchFilter === 'none') return !q.branch_id;
        if (branchFilter && Number(q.branch_id) !== Number(branchFilter)) return false;
        return true;
    };

    const statusCounts = quotations
        .filter(inScope)
        .reduce((acc: Record<string, number>, q) => {
        const st = q.status || 'pending';
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, {});

    const mineCount = quotations.filter(q => Number(q.created_by) === Number(user?.id)).length;

    const scope = quotations.filter(inScope);
    const approvedValue = scope
        .filter(q => (q.status || 'pending') === 'approved')
        .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
    const pendingValue = scope
        .filter(q => (q.status || 'pending') === 'pending')
        .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    const filtered = quotations.filter(q => {
        if (!inScope(q)) return false;
        if (statusFilter !== 'all' && (q.status || 'pending') !== statusFilter) return false;
        const s = searchTerm.toLowerCase();
        return !s
            || String(q.quotation_ref || '').toLowerCase().includes(s)
            || String(q.customer_name || '').toLowerCase().includes(s)
            || String(q.customer_email || '').toLowerCase().includes(s);
    });

    if (loading) return <AdminLoader />;

    // ── Builder ────────────────────────────────────────────────────────
    /**
     * A saved quotation, opened in full.
     *
     * Held in a variable and rendered by BOTH views rather than written once inside the
     * list. The builder returns early, so a modal living only in the list markup could
     * never appear while the builder was open -- which is exactly what happened to the eye
     * button on the customer history panel: it set the state and nothing was there to
     * render it.
     */
    const quotationModal = selected ? (
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
                                    <td>
                                        <QuotationLineProduct item={i} />
                                    </td>
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
    ) : null;

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
                            <select
                                className={styles.categorySelect}
                                value={brandFilter}
                                onChange={e => setBrandFilter(e.target.value)}
                            >
                                <option value="">All brands</option>
                                {brandOptions.map((b: any) => (
                                    <option key={b.id} value={b.slug || b.name}>{b.name}</option>
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
                                            // A div, not a button: the card holds two controls
                                            // now -- add, and view -- and a button inside a
                                            // button is invalid and unreachable by keyboard.
                                            <div
                                                key={p.id}
                                                className={`${styles.productCard} ${added ? styles.productCardAdded : ''}`}
                                            >
                                                <button
                                                    type="button"
                                                    className={styles.cardEye}
                                                    onClick={() => setModalProduct(p)}
                                                    title="View full details"
                                                    aria-label={`View details for ${p.name}`}
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.cardMain}
                                                    onClick={() => handleCardAdd(p)}
                                                    title={needsChoice(p)
                                                        ? 'Choose options before adding'
                                                        : added ? 'Already on the quotation — adds another unit' : 'Add to quotation'}
                                                >
                                                <div className={styles.cardThumb}>
                                                    {p.primary_image
                                                        ? <img
                                                            src={resolveUrl(p.primary_image)}
                                                            alt=""
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PRODUCT_IMAGE_FALLBACK; }}
                                                        />
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
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {/* Opens for a product whose price depends on a choice, and for
                                any product whose details are asked for by the eye icon. */}
                            {modalProduct && (
                                <StaffQuotationProductModal
                                    // Keyed: opening a different product remounts rather than
                                    // reusing the last one's size and variant state.
                                    key={modalProduct.id}
                                    productId={modalProduct.id}
                                    preview={modalProduct}
                                    onClose={() => setModalProduct(null)}
                                    onAdd={addFromModal}
                                />
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
                        {/* Where the quotation number comes from. Staff cannot change it -- it is
                            their account's branch and the server enforces that -- so it is shown
                            as a fact rather than a control. Admins have no branch and must pick. */}
                        <div className={styles.card}>
                            <label className={styles.cardLabel}>Issued from</label>
                            {isStaff ? (
                                user?.branch_name ? (
                                    <div className={styles.branchFixed}>
                                        {user.branch_name} <span>({user.branch_code})</span>
                                        <small>Quotation numbers are issued from this branch.</small>
                                    </div>
                                ) : (
                                    <div className={styles.branchWarning}>
                                        <AlertTriangle size={14} />
                                        Your account has no branch. Ask an administrator to assign one
                                        before raising a quotation.
                                    </div>
                                )
                            ) : (
                                <select
                                    className={styles.input}
                                    value={adminBranchId}
                                    onChange={e => setAdminBranchId(e.target.value)}
                                >
                                    <option value="">Select branch…</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                    ))}
                                </select>
                            )}
                        </div>

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
                                        setMatchedFromPhone(null);
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
                                                // The list merges two sources, so an id alone is not unique --
                                                // customer 5 and user 5 are different people.
                                                key={`${c.source || 'customer'}-${c.id}`}
                                                type="button"
                                                className={styles.customerRow}
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={() => pickCustomer(c)}
                                            >
                                                <span className={styles.lineName}>
                                                    {c.name}
                                                    {Number(c.quotation_count) > 0 && (
                                                        <span className={styles.quoteCount}>
                                                            {c.quotation_count} quotation{Number(c.quotation_count) === 1 ? '' : 's'}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className={styles.lineMeta}>
                                                    {c.email || c.phone_number || '—'}{c.company_name ? ` · ${c.company_name}` : ''}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input className={styles.input} placeholder="Email" type="email" value={customer.customer_email}
                                onChange={e => setCustomer({ ...customer, customer_email: e.target.value })} />
                            <PhoneNumberInput
                                placeholder="Phone"
                                value={customer.customer_phone}
                                onChange={v => setCustomer({ ...customer, customer_phone: v })}
                            />
                            <input className={styles.input} placeholder="VAT / TRN" value={customer.vat_number}
                                onChange={e => setCustomer({ ...customer, vat_number: e.target.value })} />
                            <textarea className={styles.textarea} placeholder="Internal notes (not shown to the customer)" rows={3}
                                value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
                        </div>

                        {/* Sits directly under the customer card so the history is read before the
                            quote is priced, which is the whole point of showing it. */}
                        {profileLoading && (
                            <div className={styles.card}>
                                <span className={styles.profileLoading}>
                                    <Loader2 size={14} className={styles.spin} /> Loading customer history…
                                </span>
                            </div>
                        )}
                        {!profileLoading && customerProfile && (
                            <CustomerHistoryPanel
                                profile={customerProfile}
                                onClose={() => { setCustomerProfile(null); setPickedCustomerId(null); setMatchedFromPhone(null); }}
                                onView={viewHistoryQuotation}
                                viewingId={viewingHistoryId}
                            />
                        )}

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
                {/* The eye button on the customer history panel lives in this view, so the
                    modal it opens has to be rendered here too. */}
                {quotationModal}
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
                {/* Offered whenever there is more than one branch to choose between. Staff
                    see it too: their own quotations can span branches if they have moved,
                    and the server already limits them to their own rows. */}
                {branches.length > 1 && (
                    <select
                        className={styles.branchFilter}
                        value={branchFilter}
                        onChange={e => setBranchFilter(e.target.value)}
                        aria-label="Filter by branch"
                    >
                        <option value="">All branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name}{b.code ? ` (${b.code})` : ''}
                            </option>
                        ))}
                        {/* Only offered when such rows exist, so the option does not
                            advertise an empty result. */}
                        {quotations.some(q => !q.branch_id) && (
                            <option value="none">No branch</option>
                        )}
                    </select>
                )}
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
                                    {/* The whole name/email block opens the customer, not just the
                                        name: it is one target, and a two-line cell where only the
                                        first line responds is a guessing game. */}
                                    <button
                                        type="button"
                                        className={styles.customerBtn}
                                        onClick={() => openCustomer(q)}
                                        disabled={openingCustomerFor === q.id}
                                        title={`View ${q.customer_name}`}
                                    >
                                        <span className={styles.lineName}>{q.customer_name}</span>
                                        <span className={styles.lineMeta}>{q.customer_email || '—'}</span>
                                    </button>
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
                                          <button onClick={() => downloadQuotation(q)}
                                              disabled={busyId === q.id || (isStaff && (q.status || 'pending') !== 'approved')}
                                              title={isStaff && (q.status || 'pending') !== 'approved'
                                                  ? 'Available once the quotation is approved'
                                                  : 'Download PDF'}>
                                              {busyId === q.id ? <Loader2 size={15} className={styles.spin} /> : <Download size={15} />}
                                          </button>
                                          <button onClick={() => printQuotation(q)}
                                              disabled={busyId === q.id || (isStaff && (q.status || 'pending') !== 'approved')}
                                              title={isStaff && (q.status || 'pending') !== 'approved'
                                                  ? 'Available once the quotation is approved'
                                                  : 'Open in a new tab to print'}>
                                              <Printer size={15} />
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


            {quotationModal}

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
