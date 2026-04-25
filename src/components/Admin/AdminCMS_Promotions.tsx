'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { useNotification } from '@/context/NotificationContext';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import { Plus, Trash2, Save, Tag } from 'lucide-react';

type DisplayType = 'banner_top' | 'popup_modal';
type TargetMode = 'all' | 'include' | 'exclude';
type PopupTrigger = 'on_load' | 'delay_seconds' | 'scroll_percent' | 'exit_intent';
type PopupFrequency = 'every_visit' | 'once_per_session' | 'once_per_days';

interface Promotion {
    id?: number;
    display_type: DisplayType;
    title: string;
    title_ar?: string;
    description?: string;
    description_ar?: string;
    image_url?: string;
    coupon_code?: string;
    cta_text?: string;
    cta_text_ar?: string;
    cta_link?: string;
    bg_color?: string;
    text_color?: string;
    target_mode: TargetMode;
    target_pages: string[];
    popup_trigger: PopupTrigger;
    popup_trigger_value: number;
    popup_frequency: PopupFrequency;
    popup_frequency_value: number;
    start_date?: string;
    end_date?: string;
    priority: number;
    is_active: boolean | number;
}

const PAGE_KEYS = [
    { key: 'home', label: 'Homepage' },
    { key: 'shop', label: 'Shop' },
    { key: 'category', label: 'Category pages' },
    { key: 'product', label: 'Product detail' },
    { key: 'today_offers', label: "Today's Offers" },
    { key: 'all_categories', label: 'All Categories' },
    { key: 'shop_by_brands', label: 'Shop by Brands' },
    { key: 'cart_checkout', label: 'Cart / Checkout' },
    { key: 'about_contact', label: 'About / Contact' }
];

const blank = (): Promotion => ({
    display_type: 'banner_top',
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    image_url: '',
    coupon_code: '',
    cta_text: '',
    cta_text_ar: '',
    cta_link: '',
    bg_color: '#ff3b30',
    text_color: '#ffffff',
    target_mode: 'all',
    target_pages: [],
    popup_trigger: 'delay_seconds',
    popup_trigger_value: 5,
    popup_frequency: 'once_per_session',
    popup_frequency_value: 7,
    start_date: '',
    end_date: '',
    priority: 0,
    is_active: true
});

const toDateInputValue = (raw?: string): string => {
    if (!raw) return '';
    try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return '';
        const tz = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tz).toISOString().slice(0, 16);
    } catch { return ''; }
};

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelText: React.CSSProperties = { fontSize: '11px', color: '#666', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' };

const AdminCMS_Promotions: React.FC = () => {
    const { showNotification } = useNotification();
    const [items, setItems] = useState<Promotion[]>([]);
    const [activeIdx, setActiveIdx] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirmDel, setConfirmDel] = useState<{ open: boolean; id?: number; idx?: number }>({ open: false });

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/cms/promotions`, {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            const json = await res.json();
            if (json.success) {
                const normalised: Promotion[] = (json.data || []).map((row: any) => ({
                    ...blank(),
                    ...row,
                    target_pages: (() => {
                        try { return row.target_pages ? JSON.parse(row.target_pages) : []; }
                        catch { return []; }
                    })(),
                    is_active: row.is_active ? true : false,
                    start_date: toDateInputValue(row.start_date),
                    end_date: toDateInputValue(row.end_date)
                }));
                setItems(normalised);
                if (normalised.length === 0) setActiveIdx(0);
                else if (activeIdx >= normalised.length) setActiveIdx(normalised.length - 1);
            }
        } catch (e: any) {
            showNotification('Failed to load promotions: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const update = (field: keyof Promotion, value: any) => {
        setItems(prev => {
            const next = [...prev];
            next[activeIdx] = { ...next[activeIdx], [field]: value } as Promotion;
            return next;
        });
    };

    const togglePage = (key: string) => {
        const current = items[activeIdx]?.target_pages || [];
        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
        update('target_pages', next);
    };

    const addNew = () => {
        setItems(prev => [...prev, blank()]);
        setActiveIdx(items.length);
    };

    const handleImageUpload = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`${API_BASE_URL}/upload/image`, {
                method: 'POST',
                headers: { ...getAuthHeaders() },
                body: formData,
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success && result.data) {
                update('image_url', result.data);
                showNotification('Image uploaded — click Save to apply.', 'success');
            } else {
                showNotification('Upload error: ' + (result.message || 'Unknown'), 'error');
            }
        } catch (e: any) {
            showNotification('Upload error: ' + e.message, 'error');
        }
    };

    const handleSave = async () => {
        const promo = items[activeIdx];
        if (!promo) return;
        if (!promo.title || !promo.title.trim()) {
            showNotification('Title is required.', 'error');
            return;
        }
        setSaving(true);
        try {
            const isNew = !promo.id;
            const url = isNew
                ? `${API_BASE_URL}/admin/cms/promotions`
                : `${API_BASE_URL}/admin/cms/promotions/${promo.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const payload: any = {
                ...promo,
                target_pages: promo.target_pages || [],
                is_active: promo.is_active ? 1 : 0,
                start_date: promo.start_date || null,
                end_date: promo.end_date || null,
                bg_color: promo.bg_color || '#ff3b30',
                text_color: promo.text_color || '#ffffff'
            };
            delete payload.id;
            delete payload.created_at;
            delete payload.updated_at;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success) {
                showNotification(isNew ? 'Promotion created' : 'Promotion saved', 'success');
                await fetchAll();
            } else {
                showNotification('Save failed: ' + (result.message || 'Unknown'), 'error');
            }
        } catch (e: any) {
            showNotification('Save error: ' + e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const requestDelete = (idx: number) => {
        const promo = items[idx];
        if (!promo) return;
        if (!promo.id) {
            setItems(prev => prev.filter((_, i) => i !== idx));
            setActiveIdx(Math.max(0, idx - 1));
            return;
        }
        setConfirmDel({ open: true, id: promo.id, idx });
    };

    const doDelete = async () => {
        if (!confirmDel.id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/cms/promotions/${confirmDel.id}`, {
                method: 'DELETE',
                headers: { ...getAuthHeaders() },
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success) {
                showNotification('Promotion deleted', 'success');
                setActiveIdx(Math.max(0, (confirmDel.idx ?? 0) - 1));
                await fetchAll();
            }
        } catch (e: any) {
            showNotification('Delete error: ' + e.message, 'error');
        } finally {
            setConfirmDel({ open: false });
        }
    };

    const current = items[activeIdx];
    const isPopup = current?.display_type === 'popup_modal';

    return (
        <div id="promotions-section" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #eee', scrollMarginTop: '100px' }}>
            <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Tag size={20} color="#10b981" />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Promotions — Banners & Popups</h2>
                </div>
                <button onClick={addNew} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                    <Plus size={16} /> Add Promotion
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', padding: '14px 20px', borderBottom: '1px solid #eee', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {items.length === 0 && !loading && (
                    <div style={{ color: '#888', fontSize: '13px' }}>No promotions yet — click &quot;Add Promotion&quot;.</div>
                )}
                {items.map((p, i) => {
                    const isActive = i === activeIdx;
                    const live = !!p.is_active;
                    return (
                        <div key={p.id ?? `new-${i}`} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button
                                onClick={() => setActiveIdx(i)}
                                style={{
                                    padding: '10px 16px', borderRadius: '8px',
                                    border: '2px solid', borderColor: isActive ? '#10b981' : '#eee',
                                    background: isActive ? '#ecfdf5' : '#fff',
                                    color: isActive ? '#10b981' : '#333',
                                    fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                    whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column',
                                    alignItems: 'flex-start', gap: '3px', minWidth: '140px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: live ? '#34c759' : '#ff4d4f' }} />
                                    <span style={{ fontSize: '12px' }}>
                                        {p.display_type === 'banner_top' ? 'Banner' : 'Popup'} #{i + 1}
                                    </span>
                                </div>
                                <span style={{ fontSize: '10px', color: '#888', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.title || '(untitled)'}
                                </span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); requestDelete(i); }}
                                title="Delete"
                                style={{ position: 'absolute', right: '-6px', top: '-6px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                            >×</button>
                        </div>
                    );
                })}
            </div>

            {/* Editor */}
            {current && (
                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Left column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <label style={labelStyle}>
                            <span style={labelText}>Display Type</span>
                            <select value={current.display_type} onChange={e => update('display_type', e.target.value)} style={inputStyle}>
                                <option value="banner_top">Top Banner (thin strip at top of pages)</option>
                                <option value="popup_modal">Popup (modal)</option>
                            </select>
                        </label>

                        <label style={labelStyle}>
                            <span style={labelText}>Title</span>
                            <input type="text" value={current.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Get 20% off everything!" style={inputStyle} />
                        </label>
                        <label style={labelStyle}>
                            <span style={labelText}>Title (Arabic)</span>
                            <input type="text" value={current.title_ar || ''} onChange={e => update('title_ar', e.target.value)} placeholder="عنوان" style={{ ...inputStyle, textAlign: 'right', direction: 'rtl' }} />
                        </label>

                        <label style={labelStyle}>
                            <span style={labelText}>Description</span>
                            <textarea value={current.description || ''} onChange={e => update('description', e.target.value)} placeholder="Optional supporting text" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                        </label>
                        <label style={labelStyle}>
                            <span style={labelText}>Description (Arabic)</span>
                            <textarea value={current.description_ar || ''} onChange={e => update('description_ar', e.target.value)} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', textAlign: 'right', direction: 'rtl' }} />
                        </label>

                        <label style={labelStyle}>
                            <span style={labelText}>Coupon Code (optional)</span>
                            <input type="text" value={current.coupon_code || ''} onChange={e => update('coupon_code', e.target.value)} placeholder="SAVE20" style={inputStyle} />
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={labelStyle}>
                                <span style={labelText}>CTA Text</span>
                                <input type="text" value={current.cta_text || ''} onChange={e => update('cta_text', e.target.value)} placeholder="Shop Now" style={inputStyle} />
                            </label>
                            <label style={labelStyle}>
                                <span style={labelText}>CTA Link</span>
                                <input type="text" value={current.cta_link || ''} onChange={e => update('cta_link', e.target.value)} placeholder="/shopnow" style={inputStyle} />
                            </label>
                        </div>
                        <label style={labelStyle}>
                            <span style={labelText}>CTA Text (Arabic)</span>
                            <input type="text" value={current.cta_text_ar || ''} onChange={e => update('cta_text_ar', e.target.value)} style={{ ...inputStyle, textAlign: 'right', direction: 'rtl' }} />
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={labelStyle}>
                                <span style={labelText}>Background Color</span>
                                <input type="color" value={current.bg_color || '#ff3b30'} onChange={e => update('bg_color', e.target.value)} style={{ ...inputStyle, height: '42px', padding: '4px' }} />
                            </label>
                            <label style={labelStyle}>
                                <span style={labelText}>Text Color</span>
                                <input type="color" value={current.text_color || '#ffffff'} onChange={e => update('text_color', e.target.value)} style={{ ...inputStyle, height: '42px', padding: '4px' }} />
                            </label>
                        </div>

                        {isPopup && (
                            <label style={labelStyle}>
                                <span style={labelText}>Popup Image (optional)</span>
                                {current.image_url && (
                                    <img src={current.image_url} alt="Popup preview" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                )}
                                <input type="text" value={current.image_url || ''} onChange={e => update('image_url', e.target.value)} placeholder="Paste URL or upload below" style={inputStyle} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} style={{ fontSize: '12px' }} />
                                    <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                        Recommended: <strong>880×400 px</strong> (2:1 ratio)
                                    </span>
                                </div>
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                    Image is cropped to fit a 440×200 area; use a 2:1 ratio so nothing important gets clipped.
                                </span>
                            </label>
                        )}
                    </div>

                    {/* Right column — targeting + scheduling + popup settings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ ...labelText, marginBottom: '10px' }}>Page Targeting</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                    <input type="radio" checked={current.target_mode === 'all'} onChange={() => update('target_mode', 'all')} />
                                    All pages
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                    <input type="radio" checked={current.target_mode === 'include'} onChange={() => update('target_mode', 'include')} />
                                    Only on selected pages
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                    <input type="radio" checked={current.target_mode === 'exclude'} onChange={() => update('target_mode', 'exclude')} />
                                    All pages EXCEPT selected
                                </label>
                            </div>
                            {current.target_mode !== 'all' && (
                                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {PAGE_KEYS.map(p => (
                                        <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={(current.target_pages || []).includes(p.key)}
                                                onChange={() => togglePage(p.key)}
                                            />
                                            {p.label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ ...labelText, marginBottom: '10px' }}>Schedule</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <label style={labelStyle}>
                                    <span style={labelText}>Start (optional)</span>
                                    <input type="datetime-local" value={current.start_date || ''} onChange={e => update('start_date', e.target.value)} style={inputStyle} />
                                </label>
                                <label style={labelStyle}>
                                    <span style={labelText}>End (optional)</span>
                                    <input type="datetime-local" value={current.end_date || ''} onChange={e => update('end_date', e.target.value)} style={inputStyle} />
                                </label>
                            </div>
                            <label style={{ ...labelStyle, marginTop: '12px' }}>
                                <span style={labelText}>Priority (higher wins when multiple match)</span>
                                <input type="number" value={current.priority} onChange={e => update('priority', Number(e.target.value) || 0)} style={inputStyle} />
                            </label>
                        </div>

                        {isPopup && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
                                <div style={{ ...labelText, marginBottom: '10px' }}>Popup Behavior</div>
                                <label style={labelStyle}>
                                    <span style={labelText}>Trigger</span>
                                    <select value={current.popup_trigger} onChange={e => update('popup_trigger', e.target.value)} style={inputStyle}>
                                        <option value="on_load">Show immediately on page load</option>
                                        <option value="delay_seconds">Show after delay (seconds)</option>
                                        <option value="scroll_percent">Show after scrolling (%)</option>
                                        <option value="exit_intent">Show on exit intent</option>
                                    </select>
                                </label>
                                {(current.popup_trigger === 'delay_seconds' || current.popup_trigger === 'scroll_percent') && (
                                    <label style={{ ...labelStyle, marginTop: '10px' }}>
                                        <span style={labelText}>{current.popup_trigger === 'delay_seconds' ? 'Delay (seconds)' : 'Scroll percent (%)'}</span>
                                        <input type="number" value={current.popup_trigger_value} onChange={e => update('popup_trigger_value', Number(e.target.value) || 0)} style={inputStyle} />
                                    </label>
                                )}
                                <label style={{ ...labelStyle, marginTop: '10px' }}>
                                    <span style={labelText}>Frequency</span>
                                    <select value={current.popup_frequency} onChange={e => update('popup_frequency', e.target.value)} style={inputStyle}>
                                        <option value="every_visit">Show on every visit</option>
                                        <option value="once_per_session">Once per session</option>
                                        <option value="once_per_days">Once every N days</option>
                                    </select>
                                </label>
                                {current.popup_frequency === 'once_per_days' && (
                                    <label style={{ ...labelStyle, marginTop: '10px' }}>
                                        <span style={labelText}>Days</span>
                                        <input type="number" value={current.popup_frequency_value} onChange={e => update('popup_frequency_value', Number(e.target.value) || 1)} style={inputStyle} />
                                    </label>
                                )}
                            </div>
                        )}

                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!current.is_active} onChange={e => update('is_active', e.target.checked)} />
                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#166534' }}>Active (live on site)</span>
                        </label>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                disabled={saving}
                                onClick={handleSave}
                                style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Save size={16} /> {saving ? 'Saving…' : (current.id ? 'Save Changes' : 'Create Promotion')}
                            </button>
                            <button
                                onClick={() => requestDelete(activeIdx)}
                                style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmDel.open}
                title="Delete promotion?"
                message="This will permanently remove the promotion."
                confirmLabel="Delete"
                type="danger"
                onConfirm={doDelete}
                onCancel={() => setConfirmDel({ open: false })}
            />
        </div>
    );
};

export default AdminCMS_Promotions;
