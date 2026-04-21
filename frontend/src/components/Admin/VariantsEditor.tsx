'use client';

import React, { useMemo } from 'react';
import { Plus, Trash2, X, RefreshCw, Layers, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import styles from './AdminProducts.module.css';
import { getAuthHeaders } from '@/utils/authHeaders';
import { resolveUrl } from '@/utils/resolveUrl';

export interface OptionValue {
    value: string;
    value_ar: string;
}

export interface VariantOption {
    name: string;
    name_ar: string;
    values: OptionValue[];
}

export interface VariantRow {
    combo: string[];          // value chosen for each option, in option order
    sku: string;
    price: string;
    offer_price: string;
    stock_quantity: string;
    use_primary_image: boolean;
    image_url: string;
    is_active: boolean;
    is_default: boolean;
}

interface Props {
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    options: VariantOption[];
    onOptionsChange: (options: VariantOption[]) => void;
    variants: VariantRow[];
    onVariantsChange: (variants: VariantRow[]) => void;
    primaryImage?: string;
}

const emptyValue = (): OptionValue => ({ value: '', value_ar: '' });
const emptyOption = (): VariantOption => ({ name: '', name_ar: '', values: [emptyValue()] });
const rowFromCombo = (combo: string[]): VariantRow => ({
    combo,
    sku: '',
    price: '',
    offer_price: '',
    stock_quantity: '0',
    use_primary_image: true,
    image_url: '',
    is_active: true,
    is_default: false
});

// Effective key for a value: prefer English, fall back to Arabic
const effectiveKey = (v: OptionValue) => v.value.trim() || v.value_ar.trim();

// Cartesian product of option values
function cartesian(options: VariantOption[]): string[][] {
    if (options.length === 0) return [];
    const valueLists = options.map(o => o.values.map(effectiveKey).filter(Boolean));
    if (valueLists.some(list => list.length === 0)) return [];
    return valueLists.reduce<string[][]>(
        (acc, list) => acc.flatMap(prefix => list.map(v => [...prefix, v])),
        [[]]
    );
}

function validateOptions(options: VariantOption[]): string | null {
    if (options.length === 0) return 'Add at least one option (e.g. Color).';
    for (let i = 0; i < options.length; i++) {
        const o = options[i];
        if (!o.name.trim() && !o.name_ar.trim()) return `Option ${i + 1} needs a name.`;
        const values = o.values.map(effectiveKey).filter(Boolean);
        if (values.length === 0) return `Option "${o.name || o.name_ar || i + 1}" needs at least one value.`;
    }
    return null;
}

const signatureOf = (combo: string[]) => combo.join('\u0001');

const VariantsEditor: React.FC<Props> = ({
    enabled, onEnabledChange,
    options, onOptionsChange,
    variants, onVariantsChange,
    primaryImage
}) => {
    const [uploadingIdx, setUploadingIdx] = React.useState<number | null>(null);
    const [regenError, setRegenError] = React.useState<string | null>(null);

    const addOption = () => onOptionsChange([...options, emptyOption()]);
    const removeOption = (idx: number) => {
        const next = options.filter((_, i) => i !== idx);
        onOptionsChange(next);
        // Strip that column from existing variant combos
        onVariantsChange(variants.map(v => ({ ...v, combo: v.combo.filter((_, i) => i !== idx) })));
    };
    const updateOption = (idx: number, patch: Partial<VariantOption>) => {
        onOptionsChange(options.map((o, i) => i === idx ? { ...o, ...patch } : o));
    };
    const addValue = (optIdx: number) => {
        updateOption(optIdx, { values: [...options[optIdx].values, emptyValue()] });
    };
    const removeValue = (optIdx: number, valIdx: number) => {
        const removedKey = effectiveKey(options[optIdx].values[valIdx]);
        updateOption(optIdx, { values: options[optIdx].values.filter((_, i) => i !== valIdx) });
        if (removedKey) {
            onVariantsChange(variants.filter(v => v.combo[optIdx] !== removedKey));
        }
    };
    const updateValue = (optIdx: number, valIdx: number, patch: Partial<OptionValue>) => {
        updateOption(optIdx, {
            values: options[optIdx].values.map((v, i) => i === valIdx ? { ...v, ...patch } : v)
        });
    };

    const regenerate = () => {
        const err = validateOptions(options);
        if (err) {
            setRegenError(err);
            return;
        }
        setRegenError(null);
        const combos = cartesian(options);
        const bySig = new Map(variants.map(v => [signatureOf(v.combo), v]));
        const next = combos.map(combo => bySig.get(signatureOf(combo)) || rowFromCombo(combo));
        onVariantsChange(next);
    };

    const updateVariant = (idx: number, patch: Partial<VariantRow>) => {
        onVariantsChange(variants.map((v, i) => i === idx ? { ...v, ...patch } : v));
    };

    const handleImageUpload = async (idx: number, file: File) => {
        setUploadingIdx(idx);
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await fetch(`${API_BASE_URL}/upload/image`, {
                credentials: 'include', method: 'POST',
                headers: getAuthHeaders(), body: fd
            });
            const data = await res.json();
            if (data.success) {
                updateVariant(idx, { image_url: data.data, use_primary_image: false });
            }
        } catch (e) { console.error(e); }
        finally { setUploadingIdx(null); }
    };

    const combosOutOfSync = useMemo(() => {
        const expected = cartesian(options).map(signatureOf).sort().join(',');
        const current = variants.map(v => signatureOf(v.combo)).sort().join(',');
        return expected !== current;
    }, [options, variants]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Layers size={20} color="#3b82f6" />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Enable Variants</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                            Different combinations of Color, Size, etc. with their own price &amp; stock.
                        </div>
                    </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => onEnabledChange(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                        position: 'absolute', inset: 0, cursor: 'pointer',
                        background: enabled ? '#22c55e' : '#cbd5e1',
                        borderRadius: 12, transition: '0.2s'
                    }} />
                    <span style={{
                        position: 'absolute', top: 2, left: enabled ? 22 : 2, width: 20, height: 20,
                        background: 'white', borderRadius: '50%', transition: '0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </label>
            </div>

            {!enabled ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
                    Variants are off. Product will sell with the base price and stock from the Pricing tab.
                </div>
            ) : (
                <>
                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475569' }}>
                                Options
                            </h4>
                            <button
                                type="button"
                                onClick={addOption}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                <Plus size={14} /> Add Option
                            </button>
                        </div>

                        {options.length === 0 && (
                            <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>
                                No options yet. Add one like &ldquo;Color&rdquo; or &ldquo;Size&rdquo;.
                            </div>
                        )}

                        {options.map((opt, optIdx) => (
                            <div key={optIdx} style={{
                                border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
                                display: 'flex', flexDirection: 'column', gap: 10
                            }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        type="text" placeholder="Option name (e.g. Color)"
                                        value={opt.name}
                                        onChange={(e) => updateOption(optIdx, { name: e.target.value })}
                                        style={{ flex: 1, padding: '8px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8 }}
                                    />
                                    <input
                                        type="text" placeholder="اسم الخيار (بالعربية)" dir="rtl"
                                        value={opt.name_ar}
                                        onChange={(e) => updateOption(optIdx, { name_ar: e.target.value })}
                                        style={{ flex: 1, padding: '8px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8 }}
                                    />
                                    <button type="button" onClick={() => removeOption(optIdx)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {opt.values.map((val, valIdx) => (
                                        <div key={valIdx} style={{
                                            display: 'flex', gap: 4, alignItems: 'center',
                                            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 4
                                        }}>
                                            <input
                                                type="text" placeholder="Value (e.g. Red)"
                                                value={val.value}
                                                onChange={(e) => updateValue(optIdx, valIdx, { value: e.target.value })}
                                                style={{ width: 110, padding: '4px 6px', fontSize: 12, border: 'none', background: 'transparent' }}
                                            />
                                            <input
                                                type="text" placeholder="عربي" dir="rtl"
                                                value={val.value_ar}
                                                onChange={(e) => updateValue(optIdx, valIdx, { value_ar: e.target.value })}
                                                style={{ width: 80, padding: '4px 6px', fontSize: 12, border: 'none', background: 'transparent' }}
                                            />
                                            <button type="button" onClick={() => removeValue(optIdx, valIdx)}
                                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addValue(optIdx)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            background: 'white', border: '1px dashed #cbd5e1', borderRadius: 8,
                                            padding: '6px 10px', fontSize: 12, color: '#64748b', cursor: 'pointer'
                                        }}>
                                        <Plus size={12} /> Value
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Combinations */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475569' }}>
                                Combinations ({variants.length})
                            </h4>
                            <button
                                type="button"
                                onClick={regenerate}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: combosOutOfSync ? '#fef3c7' : '#f1f5f9',
                                    color: combosOutOfSync ? '#b45309' : '#475569',
                                    border: `1px solid ${combosOutOfSync ? '#fcd34d' : '#cbd5e1'}`,
                                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                <RefreshCw size={14} /> {combosOutOfSync ? 'Regenerate (out of sync)' : 'Regenerate'}
                            </button>
                        </div>

                        {regenError && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                                borderRadius: 8, padding: '8px 12px', fontSize: 12
                            }}>
                                {regenError}
                            </div>
                        )}

                        {variants.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>
                                Add option values, then click Regenerate to build the combination grid.
                            </div>
                        ) : (
                            <div className={styles.noScrollbar} style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            {options.map((o, i) => (
                                                <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                                    {o.name || `Option ${i + 1}`}
                                                </th>
                                            ))}
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>SKU</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Price</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Offer</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Stock</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Image</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Default</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((v, idx) => (
                                            <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                {v.combo.map((val, i) => (
                                                    <td key={i} style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                                        {val}
                                                    </td>
                                                ))}
                                                <td style={{ padding: 6 }}>
                                                    <input type="text" value={v.sku}
                                                        onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                                                        placeholder="SKU"
                                                        style={{ width: 110, padding: '6px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                                                </td>
                                                <td style={{ padding: 6 }}>
                                                    <input type="number" step="0.01" value={v.price}
                                                        onChange={(e) => updateVariant(idx, { price: e.target.value })}
                                                        style={{ width: 90, padding: '6px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                                                </td>
                                                <td style={{ padding: 6 }}>
                                                    <input type="number" step="0.01" value={v.offer_price}
                                                        onChange={(e) => updateVariant(idx, { offer_price: e.target.value })}
                                                        placeholder="—"
                                                        style={{ width: 90, padding: '6px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                                                </td>
                                                <td style={{ padding: 6 }}>
                                                    <input type="number" value={v.stock_quantity}
                                                        onChange={(e) => updateVariant(idx, { stock_quantity: e.target.value })}
                                                        style={{ width: 70, padding: '6px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                                                </td>
                                                <td style={{ padding: 6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{
                                                            width: 36, height: 36, borderRadius: 6, overflow: 'hidden',
                                                            background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {(() => {
                                                                const src = v.use_primary_image ? primaryImage : v.image_url;
                                                                const resolved = resolveUrl(src);
                                                                return resolved
                                                                    ? <img src={resolved} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-image.webp'; }} />
                                                                    : <img src="/assets/placeholder-image.webp" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                                            })()}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', cursor: 'pointer' }}>
                                                                <input type="radio" checked={v.use_primary_image}
                                                                    onChange={() => updateVariant(idx, { use_primary_image: true })} />
                                                                Primary
                                                            </label>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', cursor: 'pointer' }}>
                                                                <input type="radio" checked={!v.use_primary_image}
                                                                    onChange={() => updateVariant(idx, { use_primary_image: false })} />
                                                                Custom
                                                            </label>
                                                        </div>
                                                        {!v.use_primary_image && (
                                                            <label style={{
                                                                display: 'flex', alignItems: 'center', gap: 4,
                                                                cursor: 'pointer', padding: '4px 8px',
                                                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                                                borderRadius: 6, fontSize: 11, color: '#475569'
                                                            }}>
                                                                {uploadingIdx === idx ? <Loader2 size={12} className="spin" /> : <Upload size={12} />}
                                                                <span>{uploadingIdx === idx ? '...' : 'Upload'}</span>
                                                                <input type="file" accept="image/*"
                                                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(idx, f); e.target.value = ''; }}
                                                                    style={{ display: 'none' }} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: 6, textAlign: 'center' }}>
                                                    <input
                                                        type="radio"
                                                        name="variant_default"
                                                        checked={v.is_default}
                                                        onChange={() => onVariantsChange(variants.map((r, i) => ({ ...r, is_default: i === idx })))}
                                                        title="Set as default selection"
                                                    />
                                                </td>
                                                <td style={{ padding: 6, textAlign: 'center' }}>
                                                    <input type="checkbox" checked={v.is_active}
                                                        onChange={(e) => updateVariant(idx, { is_active: e.target.checked })} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default VariantsEditor;
