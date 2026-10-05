'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Search, ImagePlus, Package } from 'lucide-react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { resolveUrl } from '@/utils/resolveUrl';
import styles from './StaffCustomProducts.module.css';

export type CustomProduct = {
    id: number;
    name: string;
    model: string | null;
    brand: string | null;
    description: string | null;
    image: string | null;
    unit_price: number;
    is_fabrication: boolean;
    specs: Record<string, string> | null;
    created_by: number | null;
    created_by_name: string | null;
};

const ENDPOINT = `${API_BASE_URL}/staff-quotations/custom-products`;

/**
 * Spec keys the fabrication fields write to. The measurements are lowercase because the
 * quotation PDF appends "cm" to exactly those; everything else is printed as typed.
 */
const DIMENSION_KEYS = ['width', 'depth', 'height'] as const;
const FAB_KEYS = ['Material', 'Thickness', 'Finish'] as const;

const MATERIALS = ['AISI 304 (18/10)', 'AISI 316', 'AISI 201', 'AISI 430', 'Galvanised steel'];
const THICKNESSES = ['0.8 mm', '1.0 mm', '1.2 mm', '1.5 mm', '2.0 mm'];
const FINISHES = ['Scotch-Brite', 'Satin', 'Mirror', 'Hairline', 'Powder coated'];

/** The saved custom products, shared by the management tab and the quotation builder. */
export const useCustomProducts = () => {
    const [items, setItems] = useState<CustomProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const reload = useCallback(async () => {
        try {
            const res = await fetch(ENDPOINT, { credentials: 'include', headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) setItems(data.data || []);
        } catch { /* the list simply stays as it was */ }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { reload(); }, [reload]);
    return { items, loading, reload };
};

type FormState = {
    name: string; model: string; brand: string; description: string; image: string;
    unit_price: string; is_fabrication: boolean;
    dims: Record<string, string>;
    fab: Record<string, string>;
    extras: { key: string; value: string }[];
};

const toForm = (p?: CustomProduct | null): FormState => {
    const specs = { ...(p?.specs || {}) };
    const dims: Record<string, string> = {};
    const fab: Record<string, string> = {};
    // Known keys go back into their own fields; anything else is an extra spec row.
    DIMENSION_KEYS.forEach(k => { if (specs[k] !== undefined) { dims[k] = specs[k]; delete specs[k]; } });
    FAB_KEYS.forEach(k => { if (specs[k] !== undefined) { fab[k] = specs[k]; delete specs[k]; } });
    return {
        name: p?.name || '',
        model: p?.model || '',
        brand: p?.brand || '',
        description: p?.description || '',
        image: p?.image || '',
        unit_price: p ? String(p.unit_price ?? '') : '',
        is_fabrication: !!p?.is_fabrication,
        dims, fab,
        extras: Object.entries(specs).map(([key, value]) => ({ key, value })),
    };
};

const buildSpecs = (f: FormState): Record<string, string> | null => {
    const out: Record<string, string> = {};
    if (f.is_fabrication) {
        DIMENSION_KEYS.forEach(k => { if (f.dims[k]?.trim()) out[k] = f.dims[k].trim(); });
        FAB_KEYS.forEach(k => { if (f.fab[k]?.trim()) out[k] = f.fab[k].trim(); });
    }
    f.extras.forEach(({ key, value }) => { if (key.trim() && value.trim()) out[key.trim()] = value.trim(); });
    return Object.keys(out).length ? out : null;
};

/** Specs as one readable line, for cards and tables. */
export const specsSummary = (specs: Record<string, string> | null | undefined) => {
    if (!specs) return '';
    return Object.entries(specs)
        .map(([k, v]) => (DIMENSION_KEYS as readonly string[]).includes(k)
            ? `${k.charAt(0).toUpperCase()}${k.slice(1)} ${v}cm`
            : `${k}: ${v}`)
        .join(' · ');
};

export const CustomProductFormModal = ({ product, onClose, onSaved }: {
    product: CustomProduct | null;
    onClose: () => void;
    onSaved: (p: CustomProduct) => void;
}) => {
    const { showNotification } = useNotification();
    const [f, setF] = useState<FormState>(() => toForm(product));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }));

    const uploadImage = async (file: File) => {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await fetch(`${ENDPOINT}/image`, {
                method: 'POST', credentials: 'include', headers: getAuthHeaders(), body: fd,
            });
            const data = await res.json();
            if (data.success) set({ image: data.data });
            else showNotification(data.message || 'Image upload failed', 'error');
        } catch {
            showNotification('Image upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const save = async () => {
        if (!f.name.trim()) { showNotification('Product name is required', 'error'); return; }
        setSaving(true);
        try {
            const res = await fetch(product ? `${ENDPOINT}/${product.id}` : ENDPOINT, {
                method: product ? 'PUT' : 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: f.name, model: f.model, brand: f.brand, description: f.description,
                    image: f.image, unit_price: Number(f.unit_price) || 0,
                    is_fabrication: f.is_fabrication, specs: buildSpecs(f),
                }),
            });
            const data = await res.json();
            if (data.success) {
                showNotification(product ? 'Custom product updated' : 'Custom product saved');
                onSaved(data.data);
            } else {
                showNotification(data.message || 'Could not save the product', 'error');
            }
        } catch {
            showNotification('Could not save the product', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{product ? 'Edit custom product' : 'New custom product'}</h2>
                    <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>
                <div className={styles.modalBody}>
                    <p className={styles.note}>
                        Used on staff quotations only. Custom products are never shown on the website.
                    </p>

                    <div className={styles.topRow}>
                        <label className={styles.imageBox}>
                            {f.image
                                ? <img src={resolveUrl(f.image)} alt="" />
                                : uploading
                                    ? <Loader2 size={22} className={styles.spin} />
                                    : <><ImagePlus size={22} /><span>Add photo</span></>}
                            <input
                                type="file" accept="image/*" hidden
                                onChange={e => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ''; }}
                            />
                        </label>
                        {f.image && (
                            <button type="button" className={styles.linkBtn} onClick={() => set({ image: '' })}>Remove photo</button>
                        )}
                        <div className={styles.topFields}>
                            <input className={styles.input} placeholder="Product name *" value={f.name}
                                onChange={e => set({ name: e.target.value })} />
                            <div className={styles.row2}>
                                <input className={styles.input} placeholder="Brand" value={f.brand}
                                    onChange={e => set({ brand: e.target.value })} />
                                <input className={styles.input} placeholder="Model" value={f.model}
                                    onChange={e => set({ model: e.target.value })} />
                            </div>
                            <div className={styles.field}>
                                <span>Unit price (AED, excl. VAT)</span>
                                <input className={styles.input} type="number" min={0} step="0.01" placeholder="0.00"
                                    value={f.unit_price} onChange={e => set({ unit_price: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <textarea className={styles.input} rows={3} placeholder="Description (printed on the quotation)"
                        value={f.description} onChange={e => set({ description: e.target.value })} />

                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={f.is_fabrication}
                            onChange={e => set({
                                is_fabrication: e.target.checked,
                                // The house brand for anything fabricated in-house, unless one is set.
                                brand: e.target.checked && !f.brand.trim() ? 'MARIOT FABRICATION' : f.brand,
                            })}
                        />
                        Stainless steel / fabricated product
                    </label>

                    {f.is_fabrication && (
                        <div className={styles.fabBox}>
                            <div className={styles.sectionLabel}>Custom size</div>
                            <div className={styles.row3}>
                                {DIMENSION_KEYS.map(k => (
                                    <div key={k} className={styles.field}>
                                        <span>{k.charAt(0).toUpperCase() + k.slice(1)} (cm)</span>
                                        <input className={styles.input} type="number" min={0} step="0.1"
                                            value={f.dims[k] || ''}
                                            onChange={e => set({ dims: { ...f.dims, [k]: e.target.value } })} />
                                    </div>
                                ))}
                            </div>
                            <div className={styles.sectionLabel}>Construction</div>
                            <div className={styles.row3}>
                                {([['Material', MATERIALS], ['Thickness', THICKNESSES], ['Finish', FINISHES]] as const).map(([k, opts]) => (
                                    <div key={k} className={styles.field}>
                                        <span>{k}</span>
                                        {/* A suggestion list, not a closed set: one-off jobs use
                                            grades and finishes nobody thought to list. */}
                                        <input className={styles.input} list={`scp-${k}`} value={f.fab[k] || ''}
                                            onChange={e => set({ fab: { ...f.fab, [k]: e.target.value } })} />
                                        <datalist id={`scp-${k}`}>
                                            {opts.map(o => <option key={o} value={o} />)}
                                        </datalist>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.sectionLabel}>Other specifications</div>
                    {f.extras.map((x, i) => (
                        <div key={i} className={styles.extraRow}>
                            <input className={styles.input} placeholder="e.g. Shelves" value={x.key}
                                onChange={e => set({ extras: f.extras.map((r, j) => j === i ? { ...r, key: e.target.value } : r) })} />
                            <input className={styles.input} placeholder="e.g. 4 levels" value={x.value}
                                onChange={e => set({ extras: f.extras.map((r, j) => j === i ? { ...r, value: e.target.value } : r) })} />
                            <button type="button" className={styles.iconDanger} title="Remove"
                                onClick={() => set({ extras: f.extras.filter((_, j) => j !== i) })}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))}
                    <button type="button" className={styles.linkBtn}
                        onClick={() => set({ extras: [...f.extras, { key: '', value: '' }] })}>
                        <Plus size={14} /> Add specification
                    </button>
                </div>
                <div className={styles.modalFooter}>
                    <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                    <button type="button" className={styles.primaryBtn} onClick={save} disabled={saving || uploading}>
                        {saving ? <><Loader2 size={16} className={styles.spin} /> Saving…</> : (product ? 'Save changes' : 'Save product')}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * The custom products as a searchable grid.
 *
 * Used twice: as its own tab for managing them, and inside the quotation builder, where
 * `onAdd` puts a product on the quotation. Edit and delete are offered in both, limited
 * to products the viewer may change.
 */
export const CustomProductsGrid = ({ items, loading, reload, onAdd, addedIds, canModify }: {
    items: CustomProduct[];
    loading: boolean;
    reload: () => void;
    onAdd?: (p: CustomProduct) => void;
    addedIds?: Set<number>;
    canModify: (p: CustomProduct) => boolean;
}) => {
    const { showNotification } = useNotification();
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState<CustomProduct | null | 'new'>(null);
    const [deleting, setDeleting] = useState<CustomProduct | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(p => [p.name, p.model, p.brand, p.description, specsSummary(p.specs)]
            .some(v => String(v || '').toLowerCase().includes(q)));
    }, [items, query]);

    const remove = async (p: CustomProduct) => {
        try {
            const res = await fetch(`${ENDPOINT}/${p.id}`, {
                method: 'DELETE', credentials: 'include', headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) { showNotification('Custom product deleted'); reload(); }
            else showNotification(data.message || 'Could not delete', 'error');
        } catch {
            showNotification('Could not delete', 'error');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div>
            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={16} />
                    <input placeholder="Search custom products…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <button type="button" className={styles.primaryBtn} onClick={() => setEditing('new')}>
                    <Plus size={16} /> New custom product
                </button>
            </div>

            {loading ? (
                <div className={styles.empty}><Loader2 size={18} className={styles.spin} /></div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    {items.length === 0
                        ? 'No custom products yet. Create one for items that are not in the catalogue.'
                        : 'No custom products match.'}
                </div>
            ) : (
                <div className={styles.grid}>
                    {filtered.map(p => {
                        const added = addedIds?.has(p.id);
                        const mine = canModify(p);
                        return (
                            <div key={p.id} className={`${styles.card} ${added ? styles.cardAdded : ''}`}>
                                <div className={styles.thumb}>
                                    {p.image
                                        ? <img src={resolveUrl(p.image)} alt="" loading="lazy" />
                                        : <Package size={28} />}
                                    {p.is_fabrication && <span className={styles.badge}>Fabrication</span>}
                                    {added && <span className={styles.addedBadge}>Added</span>}
                                    {mine && (
                                        <div className={styles.cardTools}>
                                            <button type="button" title="Edit" onClick={() => setEditing(p)}><Pencil size={13} /></button>
                                            <button type="button" title="Delete" className={styles.danger} onClick={() => setDeleting(p)}><Trash2 size={13} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.cardName}>{p.name}</div>
                                    <div className={styles.cardMeta}>{p.brand || '—'}{p.model ? ` · ${p.model}` : ''}</div>
                                    {p.specs && <div className={styles.cardSpecs}>{specsSummary(p.specs)}</div>}
                                    <div className={styles.cardFooter}>
                                        <strong><CurrencyPrice amount={p.unit_price} /></strong>
                                        {onAdd && (
                                            <button type="button" className={styles.addBtn} onClick={() => onAdd(p)}
                                                title={added ? 'Already on the quotation — adds another unit' : 'Add to quotation'}>
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {p.created_by_name && <div className={styles.cardBy}>by {p.created_by_name}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing && (
                <CustomProductFormModal
                    product={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); reload(); }}
                />
            )}
            <ConfirmModal
                isOpen={!!deleting}
                title="Delete custom product"
                message={`Remove "${deleting?.name || ''}"? Quotations that already include it are not affected.`}
                confirmLabel="Delete"
                type="danger"
                onConfirm={() => deleting && remove(deleting)}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
};
