'use client';
// Triggering rebuild


import React, { useState, useEffect, useRef } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import styles from './AdminProducts.module.css';
import { Package, Plus, Search, Edit2, Trash2, X, Upload, ChevronDown, ChevronLeft, ChevronRight, Loader2, FileDown, FileUp, CheckCircle2, AlertCircle, AlertTriangle, ClipboardCheck, Banknote, LayoutGrid, Images, FileText, BarChart3, Eye, EyeOff, Video, ShoppingCart, Check, Layers, Tag, Ruler, MoveHorizontal, MoveVertical, Scale, Info, GripVertical } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { stripHtml } from '@/utils/formatters';
import { getAuthHeaders } from '@/utils/authHeaders';
import { resolveUrl } from '@/utils/resolveUrl';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import VariantsEditor, { VariantOption, VariantRow } from './VariantsEditor';
import OfferSchedulePicker from './OfferSchedulePicker';

// Broken/missing product images fall back to the site logo, matching the
// storefront (ProductCard / ProductDetail). endsWith guards against an error
// loop if the logo asset itself ever fails.
const LOGO_FALLBACK = '/assets/mariot-logo2.webp';
const swapToLogoOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.src.endsWith(LOGO_FALLBACK)) img.src = LOGO_FALLBACK;
};

const t = (key: string, params?: Record<string, any>): string => {
    const map: Record<string, string> = {
        'title': 'Product Management',
        'subtitle': 'Organize, update, and manage your product catalog with high precision.',
        'searchPlaceholder': 'Search products...',
        'empty': 'No products found',
        'loader': 'Loading products...',
        'totalBadge': `${params?.count ?? 0} total`,
        'filters.search': 'Search products...',
        'filters.categories': 'All Categories',
        'filters.category': 'Category',
        'filters.status': 'All Status',
        'filters.stock': 'All Stock',
        'filters.offers': 'All Offers',
        'filters.featured': 'Featured',
        'filters.weekly': 'Weekly Deal',
        'filters.limited': 'Limited Offer',
        'filters.daily': 'Daily Offer',
        'filters.bestseller': 'Best Seller',
        'table.product': 'Product',
        'table.category': 'Category',
        'table.brand': 'Brand',
        'table.pricing': 'Pricing',
        'table.stock': 'Stock',
        'table.tags': 'Tags',
        'table.status': 'Status',
        'table.actions': 'Actions',
        'actions.add': 'Product',
        'actions.template': 'Template',
        'actions.import': 'Import',
        'actions.export': 'Export',
        'actions.downloading': 'Exporting...',
        'actions.processing': 'Processing...',
        'actions.saving': 'Saving...',
        'actions.updating': 'Updating...',
        'actions.update': 'Update',
        'actions.bulkUpdate': 'Bulk Update',
        'actions.bulkUpdateSubtitle': `Update ${params?.count ?? 0} selected products`,
        'actions.note': 'Note:',
        'actions.bulkUpdateNote': 'Only filled fields will be updated.',
        'modal.editTitle': 'Edit Product',
        'modal.addTitle': 'Add Product',
        'modal.tabs.basic': 'Basic Info',
        'modal.tabs.content': 'Description & Specs',
        'modal.tabs.logic': 'Pricing & Stock',
        'modal.tabs.deals': 'Category & Brand',
        'modal.tabs.visual': 'Images',
        'modal.fields.name': 'Product Name',
        'modal.fields.namePlaceholder': 'Enter product name',
        'modal.fields.nameAr': 'Product Name (Arabic)',
        'modal.fields.nameArPlaceholder': 'Enter product name in Arabic',
        'modal.fields.model': 'Model / SKU',
        'modal.fields.videos': 'YouTube Video Links',
        'modal.fields.addVideo': 'Add Video',
        'modal.fields.resources': 'Resources / Downloads',
        'modal.fields.addResource': 'Add Resource',
        'modal.fields.description': 'Description',
        'modal.fields.descriptionAr': 'Description (Arabic)',
        'modal.fields.shortDesc': 'Short Description',
        'modal.fields.shortDescAr': 'Short Description (Arabic)',
        'modal.fields.specs': 'Specifications',
        'modal.fields.logicSubtitle': 'Set price, discount, offer, and stock',
        'modal.fields.dealsSubtitle': 'Choose category, sub-category, and brand',
        'modal.fields.price': 'Price (AED)',
        'modal.fields.discount': 'Discount %',
        'modal.fields.offerPrice': 'Offer Price',
        'modal.fields.trackStock': 'Track Stock',
        'modal.fields.stock': 'Stock Quantity',
        'modal.fields.status': 'Status',
        'modal.fields.subGroup': 'Product Group',
        'modal.fields.finalSub': 'Sub-category Label',
        'modal.fields.startDate': 'Start Date',
        'modal.fields.endDate': 'End Date',
        'modal.fields.mediaSubtitle': 'Upload product images',
        'modal.fields.uploadImage': 'Upload Image',
        'import.title': 'Import Products',
        'import.subtitle': 'Bulk import products from an Excel file',
        'import.gettingStarted': 'Getting Started',
        'import.step1': 'Download the Excel template below',
        'import.step2': 'Fill in your product data following the column headers',
        'import.step3': 'Make sure required fields (Name, Category, Price) are filled',
        'import.step4': 'Upload the completed file using the area below',
        'import.step5': 'Review the import results and fix any errors',
        'import.downloadTemplate': 'Download Template',
        'import.processing': `Uploading... ${params?.percent ?? 0}%`,
        'import.keepOpen': 'Please keep this window open during upload',
        'import.selectFile': 'Select File to Import',
        'import.formats': 'Supported formats: .xlsx, .xls',
        'import.imported': 'Imported',
        'import.failed': 'Failed',
        'import.errorLog': 'Error Log',
        'import.done': 'Done',
        'import.importAnother': 'Import Another File',
        'notifications.templateSuccess': 'Template downloaded successfully',
        'notifications.importSuccess': `${params?.count ?? 0} products imported successfully`,
        'notifications.importError': 'Import failed. Please check your file and try again.',
        'notifications.exportSuccess': 'Products exported successfully',
        'notifications.exportError': 'Export failed. Please try again.',
        'notifications.uploadSuccess': 'Image uploaded successfully',
        'notifications.uploadError': 'Image upload failed. Please try again.',
        'notifications.dateError': 'End date must be after start date',
        'footer.cancel': 'Cancel',
        'footer.save': 'Save Product',
    };
    return map[key] ?? key;
};

// Parse a product's free-form specifications string into ordered label/value pairs.
// Accepts:  "Capacity: 12 trays"  →  { label: "Capacity", value: "12 trays" }
// Falls back to first-whitespace split: "DIM 20X40X60" → { label: "DIM", value: "20X40X60" }.
const parseSpecLines = (raw: string | null | undefined): Array<{ label: string; value: string }> => {
    if (!raw) return [];
    const cleaned = String(raw)
        .replace(/<[^>]*>/g, '\n')
        .replace(/^[•\s✳️✅\-]+/gm, '')
        .trim();
    const out: Array<{ label: string; value: string }> = [];
    const seen = new Set<string>();
    for (const line of cleaned.split(/\n+/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let label = '';
        let value = '';
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
            label = trimmed.slice(0, colonIdx).trim();
            value = trimmed.slice(colonIdx + 1).trim();
        } else {
            const wsIdx = trimmed.search(/\s/);
            if (wsIdx > 0) {
                label = trimmed.slice(0, wsIdx).trim();
                value = trimmed.slice(wsIdx + 1).trim();
            } else {
                label = trimmed;
                value = '';
            }
        }
        if (!label || !value) continue;
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ label, value });
    }
    return out;
};

// ── Specifications table editor ──────────────────────────────────────────────
// The product page renders specifications as a 2-column "Label: value" table.
// Storage stays a newline-separated string of "Label: value" lines so nothing
// downstream changes — this editor just gives admins a row UI instead of a textarea.
interface SpecRow { label: string; value: string; }

const parseSpecsToRows = (raw?: string | null): SpecRow[] => {
    if (!raw) return [];
    const cleaned = String(raw)
        .replace(/<[^>]*>/g, '\n')
        .replace(/^[•\s✳️✅\-]+/gm, '')
        .trim();
    const rows: SpecRow[] = [];
    for (const line of cleaned.split(/\n+/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
            rows.push({ label: trimmed.slice(0, colonIdx).trim(), value: trimmed.slice(colonIdx + 1).trim() });
        } else {
            const wsIdx = trimmed.search(/\s/);
            if (wsIdx > 0) {
                rows.push({ label: trimmed.slice(0, wsIdx).trim(), value: trimmed.slice(wsIdx + 1).trim() });
            } else {
                rows.push({ label: trimmed, value: '' });
            }
        }
    }
    return rows;
};

const serializeSpecRows = (rows: SpecRow[]): string =>
    rows
        .filter(r => r.label.trim() !== '' || r.value.trim() !== '')
        .map(r => (r.value.trim() ? `${r.label.trim()}: ${r.value.trim()}` : r.label.trim()))
        .join('\n');

// Bilingual spec row: English pair + its Arabic counterpart, edited together.
interface BiSpecRow { label: string; value: string; label_ar: string; value_ar: string; }

const SpecificationsEditor: React.FC<{
    value: string;        // English specs (newline "Label: value")
    valueAr: string;      // Arabic specs (newline "Label: value")
    onChange: (en: string, ar: string) => void;
}> = ({ value, valueAr, onChange }) => {
    // Zip English + Arabic lines by index into combined rows.
    const zip = (en: string, ar: string): BiSpecRow[] => {
        const e = parseSpecsToRows(en);
        const a = parseSpecsToRows(ar);
        const n = Math.max(e.length, a.length);
        const out: BiSpecRow[] = [];
        for (let i = 0; i < n; i++) {
            out.push({
                label: e[i]?.label || '', value: e[i]?.value || '',
                label_ar: a[i]?.label || '', value_ar: a[i]?.value || ''
            });
        }
        return out;
    };

    const [rows, setRows] = useState<BiSpecRow[]>(() => {
        const parsed = zip(value, valueAr);
        return parsed.length > 0 ? parsed : [{ label: '', value: '', label_ar: '', value_ar: '' }];
    });
    // Track last emitted strings so external changes re-seed rows, but our own
    // keystrokes don't wipe in-progress empty rows.
    const lastEn = useRef<string>(value || '');
    const lastAr = useRef<string>(valueAr || '');

    useEffect(() => {
        if ((value || '') === lastEn.current && (valueAr || '') === lastAr.current) return;
        const parsed = zip(value, valueAr);
        setRows(parsed.length > 0 ? parsed : [{ label: '', value: '', label_ar: '', value_ar: '' }]);
        lastEn.current = value || '';
        lastAr.current = valueAr || '';
    }, [value, valueAr]);

    const commit = (next: BiSpecRow[]) => {
        setRows(next);
        const en = serializeSpecRows(next.map(r => ({ label: r.label, value: r.value })));
        const ar = serializeSpecRows(next.map(r => ({ label: r.label_ar, value: r.value_ar })));
        lastEn.current = en;
        lastAr.current = ar;
        onChange(en, ar);
    };

    const setCell = (idx: number, key: keyof BiSpecRow, v: string) =>
        commit(rows.map((r, i) => (i === idx ? { ...r, [key]: v } : r)));
    const addRow = () => commit([...rows, { label: '', value: '', label_ar: '', value_ar: '' }]);
    const removeRow = (idx: number) => {
        const next = rows.filter((_, i) => i !== idx);
        commit(next.length > 0 ? next : [{ label: '', value: '', label_ar: '', value_ar: '' }]);
    };

    return (
        <div>
            <div className={styles.specTableHeader}>
                <span>Label</span>
                <span>Value</span>
                <span></span>
            </div>
            {rows.map((row, idx) => (
                <div key={idx} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                    {/* English pair */}
                    <div className={styles.specRow}>
                        <input
                            type="text"
                            value={row.label}
                            placeholder="e.g. Capacity"
                            onChange={(e) => setCell(idx, 'label', e.target.value)}
                            className={styles.tierInput}
                        />
                        <input
                            type="text"
                            value={row.value}
                            placeholder="e.g. 12 trays"
                            onChange={(e) => setCell(idx, 'value', e.target.value)}
                            className={styles.tierInput}
                        />
                        <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className={styles.tierDeleteBtn}
                            title="Delete row"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {/* Arabic pair (directly beneath the English one) */}
                    <div className={styles.specRow} style={{ marginTop: 6 }}>
                        <input
                            type="text"
                            value={row.label_ar}
                            placeholder="مثال: السعة"
                            dir="rtl"
                            onChange={(e) => setCell(idx, 'label_ar', e.target.value)}
                            className={styles.tierInput}
                        />
                        <input
                            type="text"
                            value={row.value_ar}
                            placeholder="مثال: 12 صينية"
                            dir="rtl"
                            onChange={(e) => setCell(idx, 'value_ar', e.target.value)}
                            className={styles.tierInput}
                        />
                        <span></span>
                    </div>
                </div>
            ))}
            <button type="button" onClick={addRow} className={styles.addTierBtn} style={{ marginTop: 4 }}>
                <Plus size={16} /> Add row
            </button>
        </div>
    );
};

// Searchable Select Component
const SearchableSelect = ({ label, name, options, value, onChange, placeholder = "Search...", alignRight = false, searchPlaceholder = "Search...", customTriggerStyle = {} }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter((opt: any) =>
        (opt.name || opt).toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find((opt: any) => String(opt.id !== undefined ? opt.id : opt) === String(value));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.formGroup} ref={containerRef} style={!label ? { marginBottom: 0 } : {}}>
            {label && <label>{label}</label>}
            <div className={styles.customSelectWrapper}>
                <div
                    className={styles.customSelectTrigger}
                    onClick={() => setIsOpen(!isOpen)}
                    style={customTriggerStyle}
                >
                    {selectedOption ? (selectedOption.name || selectedOption) : placeholder}
                    <ChevronDown size={18} className={isOpen ? styles.rotate : ''} />
                </div>

                {isOpen && (
                    <div className={`${styles.customSelectDropdown} ${alignRight ? styles.alignRight : ''}`}>
                        <div className={styles.selectSearchBox}>
                            <Search size={14} />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className={styles.selectOptionsList}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt: any) => (
                                    <div
                                        key={opt.id !== undefined ? opt.id : opt}
                                        className={`${styles.selectOption} ${String(opt.id !== undefined ? opt.id : opt) === String(value) ? styles.selected : ''}`}
                                        onClick={() => {
                                            onChange({ target: { name: name, value: String(opt.id !== undefined ? opt.id : opt) } });
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                    >
                                        {opt.name || opt}
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noOptions}>{t('empty')}</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminProducts = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const { showNotification } = useNotification();

    const [categories, setCategories] = useState<any[]>([]);
    const [hierarchicalCategories, setHierarchicalCategories] = useState<any[]>([]);

    // Frequently Bought Together picker
    const [fbtSearch, setFbtSearch] = useState('');
    const [fbtResults, setFbtResults] = useState<any[]>([]);
    const [fbtLoading, setFbtLoading] = useState(false);
    const [fbtSelectedItems, setFbtSelectedItems] = useState<{ id: number; name: string }[]>([]);

    // You May Also Need picker
    const [ymanSearch, setYmanSearch] = useState('');
    const [ymanResults, setYmanResults] = useState<any[]>([]);
    const [ymanLoading, setYmanLoading] = useState(false);
    const [ymanSelectedItems, setYmanSelectedItems] = useState<{ id: number; name: string }[]>([]);

    // Free Gift Products picker (bundle / create-a-bundle promo)
    const [giftSearch, setGiftSearch] = useState('');
    const [giftResults, setGiftResults] = useState<any[]>([]);
    const [giftLoading, setGiftLoading] = useState(false);
    const [giftSelectedItems, setGiftSelectedItems] = useState<{ id: number; name: string }[]>([]);

    // Linked Parts picker (only searches 'Parts' category)
    const [partsSearch, setPartsSearch] = useState('');
    const [partsResults, setPartsResults] = useState<any[]>([]);
    const [partsLoading, setPartsLoading] = useState(false);
    const [partsSelectedItems, setPartsSelectedItems] = useState<{ id: number; name: string }[]>([]);

    // Admin-curated Compare table — slots grow dynamically (admin can add as many as they want)
    const [compareEnabled, setCompareEnabled] = useState(false);
    const [compareSlots, setCompareSlots] = useState<Array<{ id: number; name: string }>>([]);
    const [compareRows, setCompareRows] = useState<Array<{ label: string; label_ar: string; values: string[]; values_ar: string[] }>>([]);
    const [compareSearch, setCompareSearch] = useState('');
    const [compareResults, setCompareResults] = useState<any[]>([]);
    const [compareLoading, setCompareLoading] = useState(false);
    // null = picker closed; -1 = picker open for a NEW slot; >=0 = swap an existing slot
    const [compareSlotPicker, setCompareSlotPicker] = useState<number | null>(null);

    // Variants state
    const [variantsEnabled, setVariantsEnabled] = useState(false);
    const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
    const [variantRows, setVariantRows] = useState<VariantRow[]>([]);

    // Custom-size (dimension-based) pricing state
    type SizeTierRow = { dimension: 'width' | 'depth' | 'height'; min_cm: string; max_cm: string; price: string };
    const [customizableEnabled, setCustomizableEnabled] = useState(false);
    const [customDimensions, setCustomDimensions] = useState<Array<'width' | 'depth' | 'height'>>(['width', 'depth', 'height']);
    const [sizeTiers, setSizeTiers] = useState<SizeTierRow[]>([]);
    const [baseDimensions, setBaseDimensions] = useState<{ width: string; depth: string; height: string }>({ width: '', depth: '', height: '' });
    // Drag-reorder of customization dimensions — controls display order on the product page.
    const [dimDragIdx, setDimDragIdx] = useState<number | null>(null);
    const [dimDragOverIdx, setDimDragOverIdx] = useState<number | null>(null);
    const reorderDimension = (from: number, to: number) => {
        setCustomDimensions(prev => {
            if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };
    const [brands, setBrands] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState('basic');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFormData, setBulkFormData] = useState({
        offer_start: '',
        offer_end: ''
    });
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
        confirmLabel?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleDownloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Import Template');

        const columns = [
            'name', 'name_ar', 'category', 'brand', 'price', 'discount_percentage',
            'stock_quantity', 'description', 'description_ar', 'short_description',
            'short_description_ar', 'specifications', 'heading', 'sub_category',
            'model', 'youtube_video_link', 'status', 'is_featured', 'is_weekly_deal',
            'is_limited_offer', 'is_daily_offer', 'offer_start', 'offer_end',
            'resources', 'images'
        ];

        worksheet.addRow(columns);

        worksheet.addRow([
            'Product Name', 'اسم المنتج', 'Kitchen Equipment', 'RATIONAL', 1500.00, 10,
            50, 'Detailed description of the product', 'وصف مفصل للمنتج',
            'Key highlights in 1-2 sentences', 'أبرز مميزات المنتج في جملة أو جملتين',
            'Color: Silver, Weight: 5kg', 'Featured Items', 'Ovens',
            'SCC-61', 'https://youtube.com/...', 'active', 'No', 'No',
            'No', 'No', '2024-03-01 00:00:00', '2024-03-31 23:59:59',
            'Manual: https://example.com/manual.pdf',
            'https://example.com/image1.jpg, https://example.com/image2.jpg'
        ]);

        // Style header row
        worksheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mariot_products_template.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showNotification(t('notifications.templateSuccess'));
    };

    const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setImporting(true);
        setImportResult(null);
        setUploadProgress(0);

        try {
            const data: any = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${API_BASE_URL}/products/bulk-import`);
                xhr.withCredentials = true;
                const headers = getAuthHeaders() as Record<string, string>;
                if (headers['Authorization']) {
                    xhr.setRequestHeader('Authorization', headers['Authorization']);
                }

                // Track upload progress
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 100);
                        setUploadProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (err) {
                            reject(new Error('Invalid JSON response'));
                        }
                    } else {
                        try {
                            const errorResponse = JSON.parse(xhr.responseText);
                            reject(new Error(errorResponse.message || 'Import failed'));
                        } catch (err) {
                            reject(new Error('Import failed'));
                        }
                    }
                };

                xhr.onerror = () => {
                    reject(new Error('Network error during import'));
                };

                xhr.send(formData);
            });

            if (data.success) {
                setImportResult(data.data);
                showNotification(t('notifications.importSuccess', { count: data.data.success }));
                fetchProducts();
                fetchStats();
            } else {
                showNotification(data.message || t('notifications.importError'), 'error');
            }
        } catch (error: any) {
            console.error('Import Error:', error);
            showNotification(error.message || t('notifications.importError'), 'error');
        } finally {
            setImporting(false);
            setUploadProgress(0);
            event.target.value = ''; // Reset input
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const response = await fetch(`${API_BASE_URL}/admin/export/products`, {
                credentials: "include",
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Export failed');

            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!data.success) {
                    showNotification(data.message || t('notifications.exportError'), 'error');
                    return;
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mariot_products_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            showNotification(t('notifications.exportSuccess'));
        } catch (error) {
            console.error('Failed to export products:', error);
            showNotification(t('notifications.exportError'), 'error');
        } finally {
            setExporting(false);
        }
    };

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        brand: '',
        status: 'all',
        stockStatus: 'all',
        offerType: 'all'
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [paginationInfo, setPaginationInfo] = useState({
        total: 0,
        totalPages: 0,
        limit: 10
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        name_ar: '',
        model: '',
        youtube_video_links: [''],
        featured_video_index: 0,
        description: '',
        description_ar: '',
        short_description: '',
        short_description_ar: '',
        specifications: '',
        specifications_ar: '',
        price: '',
        discount_percentage: '0',
        offer_price: '',
        stock_quantity: '',
        category_id: '1',
        sub_category_id: '',
        sub_sub_category_id: '',
        brand_id: '1',
        product_group: '',
        sub_category: '',
        image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop',
        additional_images: ['', '', ''], // Support for 3 additional images
        is_weekly_deal: false,
        is_limited_offer: false,
        is_featured: false,
        is_daily_offer: false,
        is_best_seller: false,
        notify_users_on_save: false,
        resources: [{ name: '', url: '' }],
        status: 'active',
        offer_start: '',
        offer_end: '',
        track_inventory: false,
        charge_delivery: false,
        delivery_charge: '',
        warranty: '',
        warranty_ar: ''
    });

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const action = searchParams.get('action');
        const editId = searchParams.get('edit');
        const legacyId = searchParams.get('id');
        const productId = editId || legacyId;

        if (action === 'add') {
            // Open the add product modal
            setEditingId(null);
            setFormData({
                name: '', name_ar: '', model: '',
                youtube_video_links: [''],
                featured_video_index: 0,
                description: '', description_ar: '',
                short_description: '', short_description_ar: '',
                specifications: '',
                specifications_ar: '',
                price: '', discount_percentage: '0', offer_price: '',
                stock_quantity: '', category_id: '1', sub_category_id: '', sub_sub_category_id: '', brand_id: '1',
                product_group: '', sub_category: '',
                image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop',
                additional_images: ['', '', ''],
                is_weekly_deal: false, is_limited_offer: false,
                is_featured: false, is_daily_offer: false, is_best_seller: false,
                resources: [{ name: '', url: '' }],
                status: 'active', offer_start: '', offer_end: '',
                track_inventory: false,
                charge_delivery: false,
                delivery_charge: '',
                warranty: '',
                warranty_ar: '',
                notify_users_on_save: false
            });
            setIsModalOpen(true);
            setActiveTab('basic');
            // Clear the query param so refreshing doesn't re-open
            router.replace('/admin/products', { scroll: false });
        } else if (productId) {
            const fetchAndEdit = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/products/${productId}`, { credentials: "include", headers: getAuthHeaders() });
                    const data = await res.json();
                    if (data.success) {
                        handleEditClick(data.data);
                    }
                } catch (error) {
                    console.error('Failed to fetch product for editing', error);
                }
            };
            fetchAndEdit();
            // Clear the query param
            router.replace('/admin/products', { scroll: false });
        }
    }, [searchParams]);

    useEffect(() => {
        if (!fbtSearch.trim()) { setFbtResults([]); return; }
        const timer = setTimeout(async () => {
            setFbtLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(fbtSearch)}&limit=8&page=1&status=all`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    setFbtResults(data.data.filter((p: any) => p.id !== editingId));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setFbtLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [fbtSearch, editingId]);

    useEffect(() => {
        if (!ymanSearch.trim()) { setYmanResults([]); return; }
        const timer = setTimeout(async () => {
            setYmanLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(ymanSearch)}&limit=8&page=1&status=all`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    setYmanResults(data.data.filter((p: any) => p.id !== editingId));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setYmanLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [ymanSearch, editingId]);

    useEffect(() => {
        if (!giftSearch.trim()) { setGiftResults([]); return; }
        const timer = setTimeout(async () => {
            setGiftLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(giftSearch)}&limit=8&page=1&status=all`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    setGiftResults(data.data.filter((p: any) => p.id !== editingId));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setGiftLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [giftSearch, editingId]);

    useEffect(() => {
        if (!partsSearch.trim()) { setPartsResults([]); return; }
        const timer = setTimeout(async () => {
            setPartsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(partsSearch)}&limit=15&page=1&status=all&category=parts`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    setPartsResults(data.data.filter((p: any) => p.id !== editingId));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setPartsLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [partsSearch, editingId]);

    useEffect(() => {
        if (!compareSearch.trim()) { setCompareResults([]); return; }
        const timer = setTimeout(async () => {
            setCompareLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(compareSearch)}&limit=8&page=1&status=all`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    setCompareResults(data.data.filter((p: any) => p.id !== editingId));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setCompareLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [compareSearch, editingId]);

    useEffect(() => {
        fetchProducts();
    }, [filters, currentPage]);

    // Dashboard stats
    const [dashboardStats, setDashboardStats] = useState({ total: 0, active: 0, outOfStock: 0, categories: 0 });

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/products/stats`, { credentials: 'include', headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) setDashboardStats(data.data);
        } catch (e) { console.error('Failed to fetch stats', e); }
    };

    useEffect(() => {
        fetchCategories();
        fetchBrands();
        fetchStats();
    }, []);

    // Re-render product list every 30s so offer tags (checked against offer_end) stay current
    const [, setAdminTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setAdminTick(n => n + 1), 30000);
        return () => clearInterval(id);
    }, []);

    // Auto-uncheck offer flags in edit modal when offer_end expires in real-time
    const offerExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (offerExpiryTimerRef.current) clearTimeout(offerExpiryTimerRef.current);
        if (!formData.offer_end) return;
        const ms = new Date(formData.offer_end).getTime() - Date.now();
        // setTimeout delays > 2^31-1 ms overflow to ~0 and fire instantly, which
        // was wrongly un-checking the offer flags the moment a far-future end date
        // was picked. Only arm the timer for expiries within range.
        if (ms <= 0 || ms > 2147483647) return;
        offerExpiryTimerRef.current = setTimeout(() => {
            setFormData(prev => ({
                ...prev,
                is_weekly_deal: false,
                is_limited_offer: false,
                is_daily_offer: false,
            }));
        }, ms);
        return () => {
            if (offerExpiryTimerRef.current) clearTimeout(offerExpiryTimerRef.current);
        };
    }, [formData.offer_end]);

    useEffect(() => {
        if (categories.length > 0) {
            const buildPath = (cat: any): string => {
                if (!cat.parent_id) return cat.name;
                const parent = categories.find(c => String(c.id) === String(cat.parent_id));
                if (parent) return `${buildPath(parent)} > ${cat.name}`;
                return cat.name;
            };

            const transformed = categories.map(cat => ({
                id: cat.id,
                name: buildPath(cat),
                type: cat.type
            })).sort((a, b) => a.name.localeCompare(b.name));

            setHierarchicalCategories([{ id: '', name: t('filters.categories') }, { id: 'uncategorised', name: 'Uncategorised' }, ...transformed]);
        } else {
            setHierarchicalCategories([{ id: '', name: t('filters.categories') }, { id: 'uncategorised', name: 'Uncategorised' }]);
        }
    }, [categories]);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) setCategories(data.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const fetchBrands = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/brands?all=1`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) setBrands(data.data);
        } catch (error) {
            console.error('Failed to fetch brands', error);
        }
    };

    const fetchProducts = async (page = currentPage) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.category) params.append('category', filters.category);
            if (filters.brand) params.append('brand', filters.brand);
            params.append('page', String(page));
            params.append('limit', String(paginationInfo.limit));
            params.append('status', filters.status);
            params.append('stockStatus', filters.stockStatus);

            if (filters.offerType === 'featured') params.append('is_featured', 'true');
            if (filters.offerType === 'weekly') params.append('is_weekly_deal', 'true');
            if (filters.offerType === 'limited') params.append('is_limited_offer', 'true');
            if (filters.offerType === 'daily') params.append('is_daily_offer', 'true');
            if (filters.offerType === 'best_seller') params.append('is_best_seller', 'true');

            params.append('t', String(Date.now()));

            const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
                if (data.pagination) {
                    setPaginationInfo(prev => ({
                        ...prev,
                        total: data.total,
                        totalPages: data.pagination.totalPages
                    }));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const next = { ...prev, [name]: value };

            // Auto-calculate logic for pricing
            if (name === 'price') {
                const basePrice = Number.parseFloat(value);
                const discount = Number.parseFloat(prev.discount_percentage);
                const offerPrice = Number.parseFloat(prev.offer_price);

                if (!Number.isNaN(basePrice) && basePrice > 0) {
                    if (!Number.isNaN(discount) && discount > 0) {
                        next.offer_price = (basePrice * (1 - discount / 100)).toFixed(2);
                    } else if (!Number.isNaN(offerPrice) && offerPrice > 0) {
                        next.discount_percentage = (((basePrice - offerPrice) / basePrice) * 100).toFixed(2);
                    }
                }
            } else if (name === 'discount_percentage') {
                const basePrice = Number.parseFloat(prev.price);
                const discount = Number.parseFloat(value);

                if (!Number.isNaN(basePrice) && basePrice > 0 && !Number.isNaN(discount)) {
                    if (discount > 0) {
                        next.offer_price = (basePrice * (1 - discount / 100)).toFixed(2);
                    } else {
                        next.offer_price = '';
                    }
                }
            } else if (name === 'offer_price') {
                const basePrice = Number.parseFloat(prev.price);
                const offerPrice = Number.parseFloat(value);

                if (!Number.isNaN(basePrice) && basePrice > 0 && !Number.isNaN(offerPrice)) {
                    if (offerPrice > 0 && offerPrice < basePrice) {
                        next.discount_percentage = (((basePrice - offerPrice) / basePrice) * 100).toFixed(2);
                    } else if (offerPrice >= basePrice) {
                        next.discount_percentage = '0';
                    } else if (value === '') {
                        next.discount_percentage = '0';
                    }
                }
            }

            return next;
        });
    };

    const handleAdditionalImageChange = (index: number, value: string) => {
        setFormData(prev => {
            const newImages = [...prev.additional_images];
            newImages[index] = value;
            return { ...prev, additional_images: newImages };
        });
    };

    const handleAddVideo = () => {
        setFormData(prev => ({
            ...prev,
            youtube_video_links: [...prev.youtube_video_links, '']
        }));
    };

    const handleRemoveVideo = (index: number) => {
        setFormData(prev => {
            const newLinks = [...prev.youtube_video_links];
            newLinks.splice(index, 1);
            return {
                ...prev,
                youtube_video_links: newLinks,
                featured_video_index: prev.featured_video_index >= newLinks.length ? 0 : prev.featured_video_index
            };
        });
    };

    const handleVideoChange = (index: number, value: string) => {
        setFormData(prev => {
            const newLinks = [...prev.youtube_video_links];
            newLinks[index] = value;
            return {
                ...prev,
                youtube_video_links: newLinks
            };
        });
    };

    const handleAddResource = () => {
        setFormData(prev => ({
            ...prev,
            resources: [...prev.resources, { name: '', url: '' }]
        }));
    };

    const handleRemoveResource = (index: number) => {
        setFormData(prev => {
            const newResources = [...prev.resources];
            newResources.splice(index, 1);
            return {
                ...prev,
                resources: newResources
            };
        });
    };

    const handleResourceChange = (index: number, field: 'name' | 'url', value: string) => {
        setFormData(prev => {
            const newResources = [...prev.resources];
            newResources[index] = { ...newResources[index], [field]: value };
            return {
                ...prev,
                resources: newResources
            };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        setUploading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/upload/image`, {
                credentials: "include",
                method: 'POST',
                headers: getAuthHeaders(),
                body: formDataUpload
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => {
                    const newUrl = data.data;
                    if (!prev.image_url) {
                        return { ...prev, image_url: newUrl };
                    }
                    const newAdditional = [...prev.additional_images];
                    const emptyIndex = newAdditional.findIndex(img => !img);
                    if (emptyIndex !== -1) {
                        newAdditional[emptyIndex] = newUrl;
                        return { ...prev, additional_images: newAdditional };
                    }
                    return prev;
                });
                showNotification(t('notifications.uploadSuccess'));
            } else {
                showNotification(data.message || t('notifications.uploadError'), 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Upload error', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        setUploading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/upload/document`, {
                credentials: "include",
                method: 'POST',
                headers: getAuthHeaders(),
                body: formDataUpload
            });
            const data = await res.json();
            if (data.success) {
                handleResourceChange(index, 'url', data.data);
                showNotification(t('notifications.uploadSuccess'));
            } else {
                showNotification(data.message || t('notifications.uploadError'), 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Upload error', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleEditClick = (product: any) => {
        setEditingId(product.id);
        // Extract primary and additional images from product.images array
        const primaryImg = product.images?.find((img: any) => img.is_primary)?.image_url
            || product.images?.[0]?.image_url
            || product.primary_image
            || '';
        const additionalImgs = product.images?.filter((img: any) => !img.is_primary).map((img: any) => img.image_url) || [];
        const paddedImages = [...additionalImgs, '', '', ''].slice(0, 3);

        const isTrue = (val: any) => val === true || val === 1 || val === '1' || val === 'true';

        let vLinks = [''];
        let vIndex = 0;
        if (product.youtube_video_link) {
            try {
                const parsed = JSON.parse(product.youtube_video_link);
                if (parsed && typeof parsed === 'object' && parsed.links) {
                    vLinks = parsed.links;
                    vIndex = Number(parsed.featuredIndex) || 0;
                } else if (Array.isArray(parsed)) {
                    vLinks = parsed;
                } else {
                    vLinks = [String(product.youtube_video_link)];
                }
            } catch (e) {
                vLinks = [String(product.youtube_video_link)];
            }
        }

        let resData = [{ name: '', url: '' }];
        if (product.resources) {
            try {
                const parsed = JSON.parse(product.resources);
                if (Array.isArray(parsed)) {
                    resData = parsed.length > 0 ? parsed : [{ name: '', url: '' }];
                }
            } catch (e) {
                console.error('Failed to parse resources', e);
            }
        }

        setFormData({
            name: stripHtml(product.name),
            name_ar: stripHtml(product.name_ar || ''),
            model: product.model || '',
            youtube_video_links: vLinks,
            featured_video_index: vIndex,
            resources: resData,
            description: product.description || '',
            description_ar: product.description_ar || '',
            short_description: product.short_description || '',
            short_description_ar: product.short_description_ar || '',
            specifications: product.specifications || '',
            specifications_ar: product.specifications_ar || '',
            price: product.price,
            discount_percentage: product.discount_percentage || '0',
            offer_price: product.offer_price || '',
            stock_quantity: product.stock_quantity,
            category_id: product.category_id || '',
            sub_category_id: product.sub_category_id || '',
            sub_sub_category_id: product.sub_sub_category_id || '',
            brand_id: product.brand_id || '',
            product_group: product.product_group || product.heading || '',
            sub_category: product.sub_category || '',
            image_url: primaryImg,
            additional_images: paddedImages,
            is_featured: isTrue(product.is_featured),
            is_best_seller: isTrue(product.is_best_seller),
            ...(() => {
                const offerExpired = product.offer_end && new Date(product.offer_end).getTime() <= Date.now();
                return {
                    is_weekly_deal: offerExpired ? false : isTrue(product.is_weekly_deal),
                    is_limited_offer: offerExpired ? false : isTrue(product.is_limited_offer),
                    is_daily_offer: offerExpired ? false : isTrue(product.is_daily_offer),
                };
            })(),
            status: product.status || 'active',
            offer_start: product.offer_start ? new Date(product.offer_start).toISOString().slice(0, 16) : '',
            offer_end: product.offer_end ? new Date(product.offer_end).toISOString().slice(0, 16) : '',
            track_inventory: isTrue(product.track_inventory),
            charge_delivery: Number(product.delivery_charge) > 0,
            delivery_charge: Number(product.delivery_charge) > 0 ? String(product.delivery_charge) : '',
            warranty: product.warranty !== null && product.warranty !== undefined ? String(product.warranty) : '',
            warranty_ar: product.warranty_ar !== null && product.warranty_ar !== undefined ? String(product.warranty_ar) : '',
            notify_users_on_save: false
        });

        let fbtItems: { id: number; name: string }[] = [];
        if (product.frequently_bought_together) {
            try {
                const ids: number[] = JSON.parse(product.frequently_bought_together);
                fbtItems = ids.map(id => ({
                    id,
                    name: products.find((p: any) => p.id === id)?.name || `Product #${id}`
                }));
            } catch (e) { }
        }
        setFbtSelectedItems(fbtItems);
        setFbtSearch('');
        setFbtResults([]);

        let ymanItems: { id: number; name: string }[] = [];
        if (Array.isArray(product.you_may_also_need_products) && product.you_may_also_need_products.length > 0) {
            // Prefer the enriched array returned by findById (has names already)
            ymanItems = product.you_may_also_need_products.map((p: any) => ({ id: p.id, name: p.name }));
        } else if (product.you_may_also_need) {
            try {
                const ids: number[] = JSON.parse(product.you_may_also_need);
                ymanItems = ids.map(id => ({
                    id,
                    name: products.find((p: any) => p.id === id)?.name || `Product #${id}`
                }));
            } catch (e) { }
        }
        setYmanSelectedItems(ymanItems);
        setYmanSearch('');
        setYmanResults([]);

        let giftItems: { id: number; name: string }[] = [];
        if (Array.isArray(product.free_gift_products) && product.free_gift_products.length > 0) {
            giftItems = product.free_gift_products.map((p: any) => ({ id: p.id, name: p.name }));
        } else if (product.free_gift_product_ids) {
            try {
                const ids: number[] = JSON.parse(product.free_gift_product_ids);
                giftItems = ids.map(id => ({
                    id,
                    name: products.find((p: any) => p.id === id)?.name || `Product #${id}`
                }));
            } catch (e) { }
        }
        setGiftSelectedItems(giftItems);
        setGiftSearch('');
        setGiftResults([]);

        let partsItems: { id: number; name: string }[] = [];
        if (Array.isArray(product.linked_parts_products) && product.linked_parts_products.length > 0) {
            partsItems = product.linked_parts_products.map((p: any) => ({ id: p.id, name: p.name }));
        } else if (product.linked_parts) {
            try {
                const ids: number[] = JSON.parse(product.linked_parts);
                partsItems = ids.map(id => ({
                    id,
                    name: products.find((p: any) => p.id === id)?.name || `Product #${id}`
                }));
            } catch (e) { }
        }
        setPartsSelectedItems(partsItems);
        setPartsSearch('');
        setPartsResults([]);

        // Hydrate admin Compare config
        let cmpCfg: any = product.compare_config;
        if (typeof cmpCfg === 'string') {
            try { cmpCfg = JSON.parse(cmpCfg); } catch (e) { cmpCfg = null; }
        }
        const slotProducts: any[] = Array.isArray(product.compare_slot_products) ? product.compare_slot_products : [];
        const slotIds: any[] = (cmpCfg && Array.isArray(cmpCfg.slots)) ? cmpCfg.slots : [];
        const loadedSlots: Array<{ id: number; name: string }> = [];
        for (let i = 0; i < slotIds.length; i++) {
            const id = slotIds[i];
            if (!id) continue;
            const fromEnriched = slotProducts[i];
            const name = fromEnriched?.name || products.find((p: any) => p.id === id)?.name || `Product #${id}`;
            loadedSlots.push({ id, name });
        }
        setCompareEnabled(!!cmpCfg?.enabled);
        setCompareSlots(loadedSlots);
        // Row values must be exactly 1 + slots.length long ("This product" plus one per slot).
        const targetLen = 1 + loadedSlots.length;
        setCompareRows(Array.isArray(cmpCfg?.rows) ? cmpCfg.rows.map((r: any) => {
            const raw = Array.isArray(r?.values) ? r.values.map((v: any) => String(v ?? '')) : [];
            const rawAr = Array.isArray(r?.values_ar) ? r.values_ar.map((v: any) => String(v ?? '')) : [];
            const values: string[] = [];
            const values_ar: string[] = [];
            for (let i = 0; i < targetLen; i++) { values.push(raw[i] ?? ''); values_ar.push(rawAr[i] ?? ''); }
            return { label: String(r?.label || ''), label_ar: String(r?.label_ar || ''), values, values_ar };
        }) : []);
        setCompareSearch('');
        setCompareResults([]);
        setCompareSlotPicker(null);

        // Variants
        const hasVariants = Number(product.has_variants) === 1 && Array.isArray(product.options) && product.options.length > 0;
        if (hasVariants) {
            const loadedOptions: VariantOption[] = product.options.map((o: any) => ({
                name: o.name || '',
                name_ar: o.name_ar || '',
                values: (o.values || []).map((v: any) => ({ value: v.value || '', value_ar: v.value_ar || '', swatch_color: v.swatch_color || '' }))
            }));
            const optionIdToIndex = new Map<number, number>();
            product.options.forEach((o: any, i: number) => optionIdToIndex.set(o.id, i));

            const loadedVariants: VariantRow[] = (product.variants || []).map((v: any) => {
                const combo = new Array(loadedOptions.length).fill('');
                (v.options || []).forEach((vo: any) => {
                    const idx = optionIdToIndex.get(vo.option_id);
                    if (idx !== undefined) combo[idx] = (vo.value || '').trim() || (vo.value_ar || '').trim();
                });
                return {
                    combo,
                    sku: v.sku || '',
                    price: v.price != null ? String(v.price) : '',
                    offer_price: v.offer_price != null ? String(v.offer_price) : '',
                    stock_quantity: v.stock_quantity != null ? String(v.stock_quantity) : '0',
                    use_primary_image: Number(v.use_primary_image) === 1,
                    image_url: v.image_url || '',
                    image_urls: Array.isArray(v.image_urls) && v.image_urls.length > 0
                        ? v.image_urls.map((s: any) => String(s)).filter(Boolean)
                        : (v.image_url ? [v.image_url] : []),
                    is_active: Number(v.is_active) === 1,
                    is_default: Number(v.is_default) === 1
                };
            });
            setVariantsEnabled(true);
            setVariantOptions(loadedOptions);
            setVariantRows(loadedVariants);
        } else {
            setVariantsEnabled(false);
            setVariantOptions([]);
            setVariantRows([]);
        }

        // Load custom-size pricing
        const isCust = Number(product.is_customizable) === 1;
        setCustomizableEnabled(isCust);
        if (isCust) {
            let dims: Array<'width' | 'depth' | 'height'> = ['width', 'depth', 'height'];
            const raw = product.custom_dimensions;
            if (Array.isArray(raw)) {
                dims = raw.filter((d: any) => ['width', 'depth', 'height'].includes(d));
            } else if (typeof raw === 'string' && raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) dims = parsed.filter((d: any) => ['width', 'depth', 'height'].includes(d));
                } catch (e) { /* ignore */ }
            }
            setCustomDimensions(dims.length > 0 ? dims : ['width', 'height']);
            const tiers = Array.isArray(product.size_tiers) ? product.size_tiers : [];
            setSizeTiers(tiers.map((t: any) => ({
                dimension: t.dimension,
                min_cm: String(t.min_cm ?? ''),
                max_cm: String(t.max_cm ?? ''),
                price: String(t.price ?? '')
            })));
            let bd: any = product.base_dimensions;
            if (typeof bd === 'string' && bd) {
                try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
            }
            setBaseDimensions({
                width: bd?.width !== undefined ? String(bd.width) : '',
                depth: bd?.depth !== undefined ? String(bd.depth) : '',
                height: bd?.height !== undefined ? String(bd.height) : ''
            });
        } else {
            setCustomDimensions(['width', 'depth', 'height']);
            setSizeTiers([]);
            setBaseDimensions({ width: '', depth: '', height: '' });
        }

        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        // Clear search params if on the edit page or if id is present
        if (searchParams.get('id')) {
            router.push('/admin/products');
        }
        setFormData({
            name: '',
            name_ar: '',
            model: '',
            youtube_video_links: [''],
            featured_video_index: 0,
            description: '',
            description_ar: '',
            short_description: '',
            short_description_ar: '',
            specifications: '',
            specifications_ar: '',
            price: '',
            discount_percentage: '0',
            offer_price: '',
            stock_quantity: '',
            category_id: categories.length > 0 ? String(categories[0].id) : '1',
            sub_category_id: '',
            sub_sub_category_id: '',
            brand_id: brands.length > 0 ? String(brands[0].id) : '1',
            product_group: '',
            sub_category: '',
            image_url: '/assets/placeholder-image.webp',
            additional_images: ['', '', ''],
            is_weekly_deal: false,
            is_limited_offer: false,
            is_featured: false,
            is_daily_offer: false,
            is_best_seller: false,
            resources: [{ name: '', url: '' }],
            status: 'active',
            offer_start: '',
            offer_end: '',
            track_inventory: false,
            charge_delivery: false,
            delivery_charge: '',
            warranty: '',
            warranty_ar: '',
            notify_users_on_save: false
        });
        setFbtSelectedItems([]);
        setFbtSearch('');
        setFbtResults([]);
        setYmanSelectedItems([]);
        setYmanSearch('');
        setYmanResults([]);
        setGiftSelectedItems([]);
        setGiftSearch('');
        setGiftResults([]);
        setPartsSelectedItems([]);
        setPartsSearch('');
        setPartsResults([]);
        setCompareEnabled(false);
        setCompareSlots([]);
        setCompareRows([]);
        setCompareSearch('');
        setCompareResults([]);
        setCompareSlotPicker(null);
        setVariantsEnabled(false);
        setVariantOptions([]);
        setVariantRows([]);
        setCustomizableEnabled(false);
        setCustomDimensions(['width', 'depth', 'height']);
        setSizeTiers([]);
        setBaseDimensions({ width: '', depth: '', height: '' });
        setActiveTab('basic');
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validate offer dates
            if ((formData.is_weekly_deal || formData.is_daily_offer || formData.is_limited_offer) && formData.offer_start && formData.offer_end) {
                const start = new Date(formData.offer_start);
                const end = new Date(formData.offer_end);
                if (end <= start) {
                    showNotification(t('notifications.dateError'), 'error');
                    return;
                }
            }

            const url = editingId
                ? `${API_BASE_URL}/products/${editingId}`
                : `${API_BASE_URL}/products`;

            const method = editingId ? 'PUT' : 'POST';

            // Combine main image and additional images into a single array for the backend
            const images = [formData.image_url, ...formData.additional_images].filter(img => img && img.trim() !== '');

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { notify_users_on_save: _notifyFlag, charge_delivery: _chargeDelivery, ...formDataClean } = formData;
            const payload = {
                ...formDataClean,
                delivery_charge: formData.charge_delivery ? (Number(formData.delivery_charge) || 0) : 0,
                images,
                youtube_video_link: JSON.stringify({
                    links: formData.youtube_video_links,
                    featuredIndex: formData.featured_video_index
                }),
                resources: JSON.stringify(formData.resources
                    .filter(r => r.url && r.url.trim() !== '')
                    .map(r => ({
                        name: r.name.trim() === '' ? 'Download' : r.name,
                        url: r.url
                    }))
                ),
                is_weekly_deal: Boolean(formData.is_weekly_deal),
                is_limited_offer: Boolean(formData.is_limited_offer),
                is_featured: Boolean(formData.is_featured),
                is_daily_offer: Boolean(formData.is_daily_offer),
                is_best_seller: Boolean(formData.is_best_seller),
                frequently_bought_together: fbtSelectedItems.length > 0
                    ? JSON.stringify(fbtSelectedItems.map(p => p.id))
                    : null,
                you_may_also_need: ymanSelectedItems.length > 0
                    ? JSON.stringify(ymanSelectedItems.map(p => p.id))
                    : null,
                free_gift_product_ids: giftSelectedItems.length > 0
                    ? JSON.stringify(giftSelectedItems.map(p => p.id))
                    : null,
                linked_parts: partsSelectedItems.length > 0
                    ? JSON.stringify(partsSelectedItems.map(p => p.id))
                    : null,
                compare_config: compareEnabled
                    ? JSON.stringify({
                        enabled: true,
                        slots: compareSlots.map(s => s.id),
                        rows: compareRows
                            .map(r => ({
                                label: r.label.trim(),
                                label_ar: (r.label_ar || '').trim(),
                                values: Array.from({ length: 1 + compareSlots.length }, (_, i) => r.values[i] || ''),
                                values_ar: Array.from({ length: 1 + compareSlots.length }, (_, i) => r.values_ar[i] || '')
                            }))
                            .filter(r => r.label !== '' || r.label_ar !== '')
                    })
                    : null,
                // Variants payload — only send when enabled; an empty array clears them server-side
                options: variantsEnabled
                    ? variantOptions.map(o => ({
                        name: o.name.trim(),
                        name_ar: o.name_ar.trim(),
                        values: (o.values || []).map(v => ({
                            value: (v.value || '').trim(),
                            value_ar: (v.value_ar || '').trim() || null,
                            swatch_color: v.swatch_color || null
                        })).filter(v => v.value || v.value_ar)
                    }))
                    : [],
                variants: variantsEnabled
                    ? variantRows.map(v => ({
                        sku: v.sku.trim() || null,
                        price: v.price === '' ? 0 : Number(v.price),
                        offer_price: v.offer_price === '' ? null : Number(v.offer_price),
                        stock_quantity: v.stock_quantity === '' ? 0 : Number(v.stock_quantity),
                        image_url: (Array.isArray(v.image_urls) && v.image_urls.length > 0) ? v.image_urls[0] : (v.image_url || null),
                        image_urls: Array.isArray(v.image_urls) ? v.image_urls : (v.image_url ? [v.image_url] : []),
                        use_primary_image: v.use_primary_image,
                        is_active: v.is_active,
                        is_default: v.is_default,
                        options: v.combo.map((value, idx) => {
                            const meta = variantOptions[idx]?.values.find(x => x.value === value);
                            return {
                                option_index: idx,
                                value,
                                value_ar: meta?.value_ar || null,
                                swatch_color: meta?.swatch_color || null
                            };
                        })
                    }))
                    : [],
                // Custom-size pricing payload
                is_customizable: Boolean(customizableEnabled),
                custom_dimensions: customizableEnabled ? customDimensions : [],
                base_dimensions: customizableEnabled
                    ? customDimensions.reduce((acc, d) => {
                        const v = baseDimensions[d];
                        if (v !== '' && Number.isFinite(Number(v))) acc[d] = Number(v);
                        return acc;
                    }, {} as Record<string, number>)
                    : {},
                size_tiers: customizableEnabled
                    ? sizeTiers
                        .filter(t => customDimensions.includes(t.dimension))
                        .map(t => ({
                            dimension: t.dimension,
                            min_cm: Number(t.min_cm),
                            max_cm: Number(t.max_cm),
                            price: Number(t.price)
                        }))
                        .filter(t => Number.isFinite(t.min_cm) && Number.isFinite(t.max_cm) && Number.isFinite(t.price) && t.max_cm >= t.min_cm)
                    : []
            };

            if (variantsEnabled) {
                if (variantOptions.some(o => (!o.name.trim() && !o.name_ar.trim()) || o.values.every(v => !v.value.trim() && !v.value_ar.trim()))) {
                    showNotification('Every option needs a name and at least one value', 'error');
                    return;
                }
                if (variantRows.length === 0) {
                    showNotification('Click Regenerate to build combinations before saving', 'error');
                    return;
                }
            }

            if (customizableEnabled) {
                if (customDimensions.length === 0) {
                    showNotification('Pick at least one dimension (width / depth / height) for customization', 'error');
                    return;
                }
                const missingBase = customDimensions.find(d => baseDimensions[d] === '' || !Number.isFinite(Number(baseDimensions[d])));
                if (missingBase) {
                    showNotification(`Set the base ${missingBase} value for the standard combination`, 'error');
                    return;
                }
                const validTiers = sizeTiers.filter(t =>
                    customDimensions.includes(t.dimension) &&
                    t.min_cm !== '' && t.max_cm !== '' && t.price !== '' &&
                    Number(t.max_cm) >= Number(t.min_cm)
                );
                const missingDim = customDimensions.find(d => !validTiers.some(t => t.dimension === d));
                if (missingDim) {
                    showNotification(`Add at least one valid price tier for ${missingDim}`, 'error');
                    return;
                }
            }

            setIsSaving(true);
            try {
                const res = await fetch(url, {
                    credentials: "include",
                    method,
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    // Capture notify intent before modal resets state
                    const shouldNotify = Boolean(formData.notify_users_on_save) && (formData.is_featured || formData.is_weekly_deal || formData.is_limited_offer || formData.is_daily_offer || formData.is_best_seller);
                    const notifyProductId = editingId || data.data?.id || data.id;

                    showNotification(`Product ${editingId ? 'updated' : 'added'} successfully!`);
                    handleCloseModal();
                    fetchProducts();

                    if (shouldNotify && notifyProductId) {
                        fetch(`${API_BASE_URL}/admin/products/${notifyProductId}/notify-offer`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders()
                        }).then(r => r.json()).then(nd => {
                            if (nd.success && nd.sent > 0) {
                                showNotification(`Email notification sent to ${nd.sent} user${nd.sent !== 1 ? 's' : ''}!`);
                            } else if (nd.success && nd.failed > 0) {
                                showNotification(`Notification failed — ${nd.failed} email${nd.failed !== 1 ? 's' : ''} could not be sent. Check server logs.`, 'error');
                            } else if (nd.success) {
                                showNotification('No registered users found to notify.');
                            } else {
                                showNotification(nd.message || 'Failed to send notification emails.', 'error');
                            }
                        }).catch((err) => {
                            showNotification('Notification email request failed — check server logs.', 'error');
                            console.error('[notify-offer] fetch error:', err);
                        });
                    }
                    fetchStats();
                } else {
                    showNotification(data.message || 'Operation failed', 'error');
                }
            } finally {
                setIsSaving(false);
            }
        } catch (error: any) {
            console.error('Update failed:', error);
            showNotification(`An error occurred: ${error.message || 'Unknown error'}`, 'error');
        }
    };

    const handleSyncBrands = async () => {
        const initialBrands = [
            { name: "3MF", logo: "/assets/brands/3mf.jpg.webp" },
            { name: "ALTO-SHAAM", logo: "/assets/brands/Alto-Shaam.png.webp" },
            { name: "Anfim", logo: "/assets/brands/anfilm.png.webp" },
            { name: "APW Wyott", logo: "/assets/brands/apwwyott.png.webp" },
            { name: "ASAKI", logo: "/assets/brands/asaki-logo.jpg.webp" },
            { name: "BERJAYA", logo: "/assets/brands/Berjaya-Logo.jpg.webp" },
            { name: "blendtec", logo: "/assets/brands/Blendec-logo.png.webp" },
            { name: "BREMA", logo: "/assets/brands/brema.jpg.webp" },
            { name: "CAMRY", logo: "/assets/brands/camry.jpg.webp" },
            { name: "capinox", logo: "/assets/brands/capinox.jpg.webp" },
            { name: "COFRIMELL", logo: "/assets/brands/cofrimell.jpg.webp" },
            { name: "Desmon", logo: "/assets/brands/desmon.png.webp" },
            { name: "EASYLINE", logo: "/assets/brands/easyline.jpg.webp" },
            { name: "Electrolux", logo: "/assets/brands/electrolux.jpg.webp" },
            { name: "GG F", logo: "/assets/brands/ggf-logo.jpg.webp" },
            { name: "EMPERO", logo: "/assets/brands/empero.jpg.webp" },
            { name: "FAGOR", logo: "/assets/brands/FagorProfesional.png.webp" },
            { name: "ACE FILTERS", logo: "/assets/brands/Falater.png.webp" },
            { name: "fimar", logo: "/assets/brands/fimar.jpg.webp" },
            { name: "Frymaster", logo: "/assets/brands/FRYMASTER.png.webp" },
            { name: "GEL MATIC", logo: "/assets/brands/gelmatic.jpg.webp" },
            { name: "GHS", logo: "/assets/brands/ghs.jpg.webp" },
            { name: "Hamilton Beach", logo: "/assets/brands/hamilton-logo.jpg.webp" },
            { name: "Hatco", logo: "/assets/brands/hacto.jpg.webp" },
            { name: "HENNY PENNY", logo: "/assets/brands/hennypenny.jpg.webp" },
            { name: "HCONVED", logo: "/assets/brands/hoonved.jpg.webp" },
            { name: "IMESA", logo: "/assets/brands/imesa.jpg.webp" },
            { name: "IMPERIAL", logo: "/assets/brands/IMPERIAL.png.webp" },
            { name: "INFRICO", logo: "/assets/brands/inofrigo.jpg.webp" },
            { name: "JOSPER", logo: "/assets/brands/josper.jpg.webp" },
            { name: "KITCHENAID", logo: "/assets/brands/Kitchen-Aid.png.webp" },
            { name: "LA MARZOCCO", logo: "/assets/brands/La-Marzocco.png.webp" },
            { name: "La Minerva", logo: "/assets/brands/LA-MINERVA.png.webp" },
            { name: "LA CIMBALI", logo: "/assets/brands/lacimbali.jpg.webp" },
            { name: "Longoni", logo: "/assets/brands/Longoni-Brand.png.webp" },
            { name: "mac.pan", logo: "/assets/brands/macpac.jpg.webp" },
            { name: "MAHLKONIG", logo: "/assets/brands/MAHLKONIG-vector-logo.png.webp" },
            { name: "MARIOT", logo: "/assets/brands/mariot.jpg.webp" },
            { name: "MARIOT FABRICATION", logo: "/assets/brands/fabrication.webp" },
            { name: "MBM", logo: "/assets/brands/mbm-logo.jpg.webp" },
            { name: "MENUMASTER", logo: "/assets/brands/menumaster.jpg.webp" },
            { name: "MERRYCHEF", logo: "/assets/brands/merrychef.png.webp" },
            { name: "Middleby Marshall", logo: "/assets/brands/middleby-marshall-logo.gif.webp" },
            { name: "miska", logo: "/assets/brands/Logo-MiskaFoodTechnology1.jpg.webp" },
            { name: "MKE-MATIC", logo: "/assets/brands/mke-logo.jpg.webp" },
            { name: "MOEL", logo: "/assets/brands/moel.jpg.webp" },
            { name: "MONOLITH", logo: "/assets/brands/monolith.jpg.webp" },
            { name: "nuova SIMONELLI", logo: "/assets/brands/simonelli.jpg.webp" },
            { name: "OMEGA", logo: "/assets/brands/Omega.png.webp" },
            { name: "oztiryakiler", logo: "/assets/brands/oztriyakiler.jpg.webp" },
            { name: "PITCO", logo: "/assets/brands/pitco.jpg.webp" },
            { name: "POSLIX", logo: "/assets/brands/poslix.jpg.webp" },
            { name: "PRINCE CASTLE", logo: "/assets/brands/prince-casle.png.webp" },
            { name: "RANCILIO", logo: "/assets/brands/Rancilio-logo-1.png.webp" },
            { name: "RATIONAL", logo: "/assets/brands/rational.jpg.webp" },
            { name: "RED FOX", logo: "/assets/brands/redfox.jpg.webp" },
            { name: "robot coupe", logo: "/assets/brands/robotcoupe.jpg.webp" },
            { name: "ROLLER GRILL", logo: "/assets/brands/roller-grill.jpg.webp" },
            { name: "ROTONDI", logo: "/assets/brands/Rotondi-Group.png.webp" },
            { name: "SAB", logo: "/assets/brands/sab.jpg.webp" },
            { name: "samixir", logo: "/assets/brands/samixir.jpg.webp" },
            { name: "SANTOS", logo: "/assets/brands/santos.jpg.webp" },
            { name: "SAP", logo: "/assets/brands/sap-bone-saw-machine-in-dubai.png.webp" },
            { name: "SHEFFIELD", logo: "/assets/brands/Sheffiel.png.webp" },
            { name: "SOFINOR", logo: "/assets/brands/sofinor.jpg.webp" },
            { name: "SOUTHBEND", logo: "/assets/brands/southbend.jpg.webp" },
            { name: "SPACEMAN", logo: "/assets/brands/20210329_Spaceman-Logo_Black.png.webp" },
            { name: "Speed Queen", logo: "/assets/brands/Speed-Queen.png.webp" },
            { name: "STAR", logo: "/assets/brands/star.jpg.webp" },
            { name: "TOASTMASTER", logo: "/assets/brands/Toastmaster.png.webp" },
            { name: "UNION", logo: "/assets/brands/Union.png.webp" },
            { name: "VULCAN", logo: "/assets/brands/VULCAN-BRAND.png.webp" },
            { name: "SERVER", logo: "/assets/brands/server.jpg.webp" },
            { name: "STILCO", logo: "/assets/brands/stilco1.jpg.webp" },
            { name: "TECHNOCOOLER", logo: "/assets/brands/technocooler.jpg.webp" },
            { name: "TECNODOM", logo: "/assets/brands/tecnodom.jpg.webp" },
            { name: "UEBERMILK", logo: "/assets/brands/uebermilk_logo_small.png.webp" },
            { name: "UNOX", logo: "/assets/brands/unox.jpg.webp" },
            { name: "VITAMIX", logo: "/assets/brands/vitamix.jpg.webp" },
            { name: "BATTISTELLA", logo: "/assets/brands/BATTISTELLA-1.webp" },
            { name: "BILAIT", logo: "/assets/brands/BILAIT-Logo.webp" },
            { name: "VITO", logo: "/assets/brands/VITO-OIL-FILTER-SYSTEM.png.webp" },
            { name: "Zemic", logo: "/assets/brands/Zemic-Europe.png.webp" },
            { name: "Zumex", logo: "/assets/brands/Zumex.png.webp" },
            { name: "Ailipu", logo: "/assets/brands/ailipu-1.webp" },
            { name: "Bimatic", logo: "/assets/brands/bimatic.webp" },
            { name: "Bunn", logo: "/assets/brands/bunn.webp" },
            { name: "Grindmaster", logo: "/assets/brands/grindmaster.webp" },
            { name: "Hoshizaki", logo: "/assets/brands/hoshizaki.webp" },
            { name: "Mussana", logo: "/assets/brands/mussana.webp" },
            { name: "Pastaline", logo: "/assets/brands/pastaline.webp" },
            { name: "Salva", logo: "/assets/brands/salva.webp" },
            { name: "Snooker", logo: "/assets/brands/snooker-1.webp" },
            { name: "Turbo Chef", logo: "/assets/brands/turbo-chef.webp" },
            { name: "Venarro", logo: "/assets/brands/venarro.jpg.webp" },
            { name: "Venix", logo: "/assets/brands/venix.jpg.webp" },
            { name: "Warning", logo: "/assets/brands/warning.jpg.webp" },
            { name: "Zmatik", logo: "/assets/brands/zmatik-1.webp" }
        ];

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/brands/sync`, {
                credentials: "include",
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ brands: initialBrands.map(b => ({ name: b.name, image_url: b.logo })) })
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message || 'Brands synced to database successfully!');
            } else {
                showNotification(data.message || 'Sync failed', 'error');
            }
            fetchBrands();
        } catch (error) {
            showNotification('Sync failed - network error', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product? This action cannot be undone.',
            type: 'danger',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Product deleted');
                        fetchProducts();
                        fetchStats();
                    }
                } catch (error) {
                    showNotification('Failed to delete product', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map(p => p.id));
        }
    };

    const toggleSelectProduct = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Bulk Delete Products',
            message: `Are you sure you want to delete ${selectedIds.length} products? This action cannot be undone.`,
            type: 'danger',
            confirmLabel: 'Delete All',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/products/bulk-delete`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ids: selectedIds })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification(`Successfully deleted ${selectedIds.length} products`);
                        setSelectedIds([]);
                        fetchProducts();
                        fetchStats();
                    } else {
                        showNotification(data.message || 'Bulk delete failed', 'error');
                    }
                } catch (error) {
                    showNotification('An error occurred during bulk delete', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleBulkUpdate = async () => {
        if (selectedIds.length === 0) return;
        setBulkUpdating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/products/bulk-update`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: selectedIds,
                    data: bulkFormData
                })
            });
            const data = await res.json();
            if (data.success) {
                showNotification(`Successfully updated ${selectedIds.length} products!`);
                setIsBulkModalOpen(false);
                setSelectedIds([]);
                fetchProducts();
                fetchStats();
            } else {
                showNotification(data.message || 'Bulk update failed', 'error');
            }
        } catch (error) {
            showNotification('Error performing bulk update', 'error');
        } finally {
            setBulkUpdating(false);
        }
    };

    return (
        <div className={styles.adminProducts}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>{t('title')}</h1>
                    <p className={styles.subtitle}>{t('subtitle')}</p>
                </div>
                <div className={styles.actionGroup}>
                    <button className={styles.utilBtn} onClick={() => setIsImportModalOpen(true)}>
                        <FileUp size={16} />
                        Import
                    </button>
                    <button className={styles.utilBtn} onClick={handleExport} disabled={exporting}>
                        <FileText size={16} />
                        {exporting ? 'Exporting…' : 'Export'}
                    </button>
                    <button className={styles.addBtn} onClick={() => { setEditingId(null); setIsModalOpen(true); }}>
                        <Plus size={18} />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.totalIcon}`}>
                        <Package size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Products</span>
                        <span className={styles.statValue}>{dashboardStats.total.toLocaleString()}</span>
                        <span className={styles.statSubLabel}>All products in catalog</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.activeIcon}`}>
                        <Tag size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Active Products</span>
                        <span className={styles.statValue}>{dashboardStats.active.toLocaleString()}</span>
                        <span className={styles.statSubLabel}>Currently active</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.oosIcon}`}>
                        <AlertCircle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Out of Stock</span>
                        <span className={styles.statValue}>{dashboardStats.outOfStock.toLocaleString()}</span>
                        <span className={styles.statSubLabel}>Currently unavailable</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.categoryIcon}`}>
                        <Layers size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Categories</span>
                        <span className={styles.statValue}>{dashboardStats.categories}</span>
                        <span className={styles.statSubLabel}>Main categories</span>
                    </div>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className={styles.filterBtns}>
                    <div className={styles.filterDropdownWrapper}>
                        <SearchableSelect
                            label=""
                            name="category"
                            options={hierarchicalCategories}
                            value={filters.category}
                            onChange={(e: any) => {
                                setFilters(prev => ({ ...prev, category: e.target.value }));
                                setCurrentPage(1);
                            }}
                            placeholder="All Categories"
                        />
                    </div>
                    <SearchableSelect
                        label=""
                        name="brand"
                        options={[{ id: '', name: 'All Brands' }, ...brands]}
                        value={filters.brand}
                        onChange={handleFilterChange}
                        placeholder="All Brands"
                    />
                    <SearchableSelect
                        label=""
                        name="status"
                        options={[
                            { id: 'all', name: t('filters.status') },
                            { id: 'active', name: 'Active' },
                            { id: 'draft', name: 'Draft' }
                        ]}
                        value={filters.status}
                        onChange={handleFilterChange}
                        placeholder={t('filters.status')}
                    />
                    <SearchableSelect
                        label=""
                        name="stockStatus"
                        options={[
                            { id: 'all', name: t('filters.stock') },
                            { id: 'in_stock', name: 'In Stock' },
                            { id: 'out_of_stock', name: 'Out of Stock' }
                        ]}
                        value={filters.stockStatus}
                        onChange={handleFilterChange}
                        placeholder={t('filters.stock')}
                    />
                    <SearchableSelect
                        label=""
                        name="offerType"
                        options={[
                            { id: 'all', name: t('filters.offers') },
                            { id: 'weekly', name: 'Weekly Deals' },
                            { id: 'limited', name: 'Limited Offers' },
                            { id: 'daily', name: 'Daily Offers' },
                            { id: 'featured', name: 'Featured Items' },
                            { id: 'best_seller', name: 'Best Sellers' }
                        ]}
                        value={filters.offerType}
                        onChange={handleFilterChange}
                        placeholder={t('filters.offers')}
                        alignRight={true}
                        searchPlaceholder="Search offers..."
                        customTriggerStyle={{ borderInlineStart: '4px solid #3b82f6' }}
                    />
                </div>
            </div>

            <div className={styles.productsTableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={products.length > 0 && selectedIds.length === products.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th style={{ width: '40%' }}>{t('table.product')}</th>
                            <th>Brand</th>
                            <th>{t('table.category')}</th>
                            <th>{t('table.pricing')}</th>
                            <th>{t('table.stock')}</th>
                            <th>{t('table.tags')}</th>
                            <th>{t('table.status')}</th>
                            <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '100px 0' }}><AdminLoader message={t('loader')} /></td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '100px 0' }}><div className={styles.noResults}><AlertCircle size={40} /><p>{t('empty')}</p></div></td></tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.id} className={selectedIds.includes(product.id) ? styles.selectedRow : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(product.id)}
                                            onChange={() => toggleSelectProduct(product.id)}
                                        />
                                    </td>
                                    <td className={styles.productCell}>
                                        <div className={styles.productImgWrapper}>
                                            <img src={resolveUrl(product.primary_image) || LOGO_FALLBACK} alt={product.name} onError={swapToLogoOnError} />
                                        </div>
                                        <div className={styles.productInfo}>
                                            <span className={styles.productName}>
                                                {stripHtml(product.name)}
                                            </span>
                                        </div>
                                    </td>
                                    <td>{product.brand_name || 'RATIONAL'}</td>
                                    <td>
                                        <div className={styles.categoryGroup}>
                                            <span className={styles.categoryPath}>{product.category_name || 'Uncategorised'}</span>
                                        </div>
                                    </td>
                                    <td className={styles.price}>
                                        {product.discount_percentage > 0 ? (
                                            <div>
                                                <div className={styles.offerPrice}>
                                                    <CurrencyPrice amount={Number(Number(product.offer_price) > 0 ? product.offer_price : product.price)} />
                                                </div>
                                                <div className={styles.discountText}>
                                                    {product.discount_percentage}% OFF
                                                </div>
                                            </div>
                                        ) : (
                                            <CurrencyPrice amount={Number(product.price)} />
                                        )}
                                    </td>
                                    <td>
                                        {(product.track_inventory === 1 || product.track_inventory === '1' || product.track_inventory === true) ? (
                                            <span className={`${styles.stockBadge} ${Number(product.stock_quantity) < 10 ? styles.lowStock : ''}`}>
                                                {product.stock_quantity || 0}
                                            </span>
                                        ) : (
                                            <span className={styles.statusAlways}>
                                                Always in Stock
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.tagsCell}>
                                            {(product.is_featured === 1 || product.is_featured === '1' || product.is_featured === true) && <span className={`${styles.tag} ${styles.tagFeatured}`}>Featured</span>}
                                            {(product.is_weekly_deal === 1 || product.is_weekly_deal === '1' || product.is_weekly_deal === true) && (!product.offer_end || new Date(product.offer_end).getTime() > Date.now()) && <span className={`${styles.tag} ${styles.tagWeekly}`}>Weekly</span>}
                                            {(product.is_limited_offer === 1 || product.is_limited_offer === '1' || product.is_limited_offer === true) && (!product.offer_end || new Date(product.offer_end).getTime() > Date.now()) && <span className={`${styles.tag} ${styles.tagLimited}`}>Limited</span>}
                                            {(product.is_daily_offer === 1 || product.is_daily_offer === '1' || product.is_daily_offer === true) && (!product.offer_end || new Date(product.offer_end).getTime() > Date.now()) && <span className={`${styles.tag} ${styles.tagDaily}`}>Daily</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={product.status === 'draft' ? styles.statusDraft : styles.statusActive}>
                                            {product.status ? product.status.charAt(0).toUpperCase() + product.status.slice(1) : 'Active'}
                                        </span>
                                    </td>
                                    <td className={styles.actions}>
                                        <button className={styles.editBtn} onClick={async () => {
                                            try {
                                                const res = await fetch(`${API_BASE_URL}/products/${product.id}`, { credentials: 'include', headers: getAuthHeaders() });
                                                const data = await res.json();
                                                handleEditClick(data.success ? data.data : product);
                                            } catch { handleEditClick(product); }
                                        }}><Edit2 size={16} /></button>
                                        <button className={styles.deleteBtn} onClick={() => handleDeleteProduct(product.id)}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Bulk Actions Floating Bar */}
                {selectedIds.length > 0 && (
                    <div className={styles.bulkActionsBar}>
                        <div className={styles.bulkContent}>
                            <div className={styles.bulkMainInfo}>
                                <div className={styles.selectionGroup}>
                                    <div className={styles.selectionBadge}>{selectedIds.length}</div>
                                    <div className={styles.selectionStats}>
                                        <span className={styles.selectionLabel}>Products Selected</span>
                                        <button className={styles.clearSelection} onClick={() => setSelectedIds([])}>
                                            CLEAR SELECTION
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.bulkDivider} />

                            <div className={styles.bulkActionButtons}>
                                <button className={styles.bulkEditBtn} onClick={() => setIsBulkModalOpen(true)}>
                                    <Edit2 size={18} />
                                    <span>Bulk Edit</span>
                                </button>
                                <button className={styles.bulkDeleteAction} onClick={handleBulkDelete}>
                                    <div className={styles.deleteIconWrapper}>
                                        <Trash2 size={18} />
                                    </div>
                                    <span>Delete</span>
                                </button>
                            </div>

                            <div className={styles.bulkDivider} />

                            <div className={styles.bulkUtilButtons}>
                                <button className={styles.bulkUtilIconBtn} onClick={handleDownloadTemplate} title="Template">
                                    <FileDown size={18} />
                                </button>
                                <button className={styles.bulkUtilIconBtn} onClick={() => setIsImportModalOpen(true)} title="Import">
                                    <FileUp size={18} />
                                </button>
                                <button className={styles.bulkUtilIconBtn} onClick={handleExport} disabled={exporting} title="Export">
                                    {exporting ? <Loader2 size={18} className={styles.spinner} /> : <FileText size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination UI */}
                {!loading && paginationInfo.totalPages > 1 && (
                    <div className={styles.paginationWrapper}>
                        <div className={styles.paginationInfo}>
                            <span>Showing</span>
                            <div className={styles.infoBadge}>
                                <strong>{(currentPage - 1) * paginationInfo.limit + 1}</strong>
                                <span>–</span>
                                <strong>{Math.min(currentPage * paginationInfo.limit, paginationInfo.total)}</strong>
                            </div>
                            <span>of</span>
                            <span className={styles.totalCount}>{paginationInfo.total}</span>
                            <span>products</span>
                        </div>
                        <div className={styles.paginationBtns}>
                            <button
                                className={`${styles.pageBtn} ${styles.navBtn} ${styles.prevBtn}`}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>

                            {/* Render page numbers */}
                            {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    return page === 1 ||
                                        page === paginationInfo.totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1);
                                })
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className={styles.dots}>···</span>
                                        )}
                                        <button
                                            className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))}

                            <button
                                className={`${styles.pageBtn} ${styles.navBtn} ${styles.nextBtn}`}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationInfo.totalPages))}
                                disabled={currentPage === paginationInfo.totalPages}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalLarge}>
                        <div className={styles.modalSideHeader}>
                            <div className={styles.modalTitleArea}>
                                <h2>{editingId ? t('modal.editTitle') : t('modal.addTitle')}</h2>
                                <p>{editingId ? stripHtml(formData.name) : t('subtitle')}</p>
                            </div>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalMainContainer}>
                            {/* Sticky Left Sidebar Navigation */}
                            <div className={styles.modalNavSidebar}>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'basic' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('basic')}
                                >
                                    <ClipboardCheck size={18} />
                                    <span>{t('modal.tabs.basic')}</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'content' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('content')}
                                >
                                    <FileText size={18} />
                                    <span>{t('modal.tabs.content')}</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'pricing' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('pricing')}
                                >
                                    <Banknote size={18} />
                                    <span>{t('modal.tabs.logic')}</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'category' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('category')}
                                >
                                    <LayoutGrid size={18} />
                                    <span>{t('modal.tabs.deals')}</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'media' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('media')}
                                >
                                    <Images size={18} />
                                    <span>{t('modal.tabs.visual')}</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'fbt' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('fbt')}
                                >
                                    <ShoppingCart size={18} />
                                    <span>Linked Products</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'variants' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('variants')}
                                    type="button"
                                >
                                    <Layers size={18} />
                                    <span>Variants</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'customization' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('customization')}
                                    type="button"
                                >
                                    <Ruler size={18} />
                                    <span>Customization</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'compare' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('compare')}
                                    type="button"
                                >
                                    <Scale size={18} />
                                    <span>Compare</span>
                                </button>
                            </div>

                            {/* Main Content Area */}
                            <form className={styles.modalContentArea} onSubmit={handleSaveProduct}>
                                <div className={styles.tabContent}>
                                    {activeTab === 'basic' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>{t('modal.tabs.basic')}</h3>
                                                <p>{t('modal.fields.namePlaceholder')}</p>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>{t('modal.fields.name')}</label>
                                                    <input type="text" name="name" required placeholder={t('modal.fields.namePlaceholder')} value={formData.name} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>{t('modal.fields.nameAr')}</label>
                                                    <input type="text" name="name_ar" placeholder={t('modal.fields.nameArPlaceholder')} dir="rtl" value={formData.name_ar} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>{t('modal.fields.model')}</label>
                                                    <input type="text" name="model" placeholder="Ex: SCC-61-G" value={formData.model} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>{t('table.status')} (Read-only)</label>
                                                    <input type="text" value={products.find(p => p.id === editingId)?.slug || 'Auto-generated'} disabled className={styles.disabledInput} />
                                                </div>
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>{t('modal.fields.videos')}</label>
                                                <div className={styles.videoLinksList}>
                                                    {formData.youtube_video_links.map((link, index) => (
                                                        <div key={index} className={styles.videoLinkItem}>
                                                            <Video size={16} color="#64748b" />
                                                            <input
                                                                type="text"
                                                                className={styles.videoInput}
                                                                placeholder="https://youtube.com/watch?v=..."
                                                                value={link}
                                                                onChange={(e) => handleVideoChange(index, e.target.value)}
                                                            />
                                                            <div
                                                                className={`${styles.featuredVideoToggle} ${formData.featured_video_index === index ? styles.active : ''}`}
                                                                onClick={() => setFormData({ ...formData, featured_video_index: index })}
                                                            >
                                                                {formData.featured_video_index === index ? 'Featured' : 'Mark Featured'}
                                                            </div>
                                                            {formData.youtube_video_links.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className={styles.removeVideoBtn}
                                                                    onClick={() => handleRemoveVideo(index)}
                                                                    title="Remove video"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button type="button" className={styles.addVideoBtn} onClick={handleAddVideo}>
                                                    <Plus size={16} /> {t('modal.fields.addVideo')}
                                                </button>
                                            </div>

                                            <div className={styles.formGroup} style={{ marginTop: '20px' }}>
                                                <label>{t('modal.fields.resources')}</label>
                                                <div className={styles.resourcesList}>
                                                    {formData.resources.map((res, index) => (
                                                        <div key={index} className={styles.resourceItem}>
                                                            <FileDown size={18} color="#64748b" />
                                                            <input
                                                                type="text"
                                                                className={styles.resourceInput}
                                                                placeholder="Title (Ex: User Manual)"
                                                                value={res.name}
                                                                onChange={(e) => handleResourceChange(index, 'name', e.target.value)}
                                                            />
                                                            <input
                                                                type="text"
                                                                className={styles.resourceInput}
                                                                placeholder="URL (Ex: https://.../manual.pdf)"
                                                                value={res.url}
                                                                onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                                                            />
                                                            <div className={styles.resourceUploadWrapper}>
                                                                <input
                                                                    type="file"
                                                                    id={`res-upload-${index}`}
                                                                    accept=".pdf"
                                                                    onChange={(e) => handleResourceUpload(e, index)}
                                                                    style={{ display: 'none' }}
                                                                />
                                                                <label htmlFor={`res-upload-${index}`} className={styles.resourceUploadBtn} title="Upload PDF">
                                                                    <Upload size={16} />
                                                                </label>
                                                            </div>
                                                            {formData.resources.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className={styles.removeVideoBtn}
                                                                    onClick={() => handleRemoveResource(index)}
                                                                    title="Remove resource"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button type="button" className={styles.addResourceBtn} onClick={handleAddResource}>
                                                    <Plus size={16} /> {t('modal.fields.addResource')}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'content' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>{t('modal.tabs.content')}</h3>
                                                <p>{t('modal.fields.description')}</p>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>{t('modal.fields.description')}</label>
                                                    <textarea name="description" rows={5} value={formData.description} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>{t('modal.fields.descriptionAr')}</label>
                                                    <textarea name="description_ar" rows={5} dir="rtl" value={formData.description_ar} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>{t('modal.fields.shortDesc')}</label>
                                                    <textarea name="short_description" rows={3} value={formData.short_description} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>{t('modal.fields.shortDescAr')}</label>
                                                    <textarea name="short_description_ar" rows={3} dir="rtl" value={formData.short_description_ar} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>{t('modal.fields.specs')} — English / العربية</label>
                                                <SpecificationsEditor
                                                    value={formData.specifications}
                                                    valueAr={formData.specifications_ar}
                                                    onChange={(en, ar) => setFormData(prev => ({ ...prev, specifications: en, specifications_ar: ar }))}
                                                />
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>Warranty (Years)</label>
                                                    <input type="number" name="warranty" min="0" value={formData.warranty} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Warranty Arabic (Years)</label>
                                                    <input type="number" name="warranty_ar" min="0" value={formData.warranty_ar} dir="rtl" onChange={handleInputChange} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'pricing' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>{t('modal.tabs.logic')}</h3>
                                                <p>{t('modal.fields.logicSubtitle')}</p>
                                            </div>
                                            {variantsEnabled && (
                                                <div style={{
                                                    background: '#fffbeb',
                                                    border: '1px solid #fde68a',
                                                    borderRadius: '10px',
                                                    padding: '12px 16px',
                                                    margin: '0 0 16px 0',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px',
                                                    color: '#92400e',
                                                    fontSize: '13px',
                                                    lineHeight: 1.5
                                                }}>
                                                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px', color: '#d97706' }} />
                                                    <div>
                                                        <strong style={{ display: 'block', marginBottom: '2px', color: '#78350f' }}>
                                                            Pricing &amp; Logic disabled
                                                        </strong>
                                                        Variants are turned on, so price, offer price, stock, and the primary image come from your default variant on the <strong>Variants</strong> tab. The fields below are ignored everywhere — product detail page, listings, and promotion cards.
                                                    </div>
                                                </div>
                                            )}
                                            {!variantsEnabled && customizableEnabled && (
                                                <div style={{
                                                    background: '#fffbeb',
                                                    border: '1px solid #fde68a',
                                                    borderRadius: '10px',
                                                    padding: '12px 16px',
                                                    margin: '0 0 16px 0',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px',
                                                    color: '#92400e',
                                                    fontSize: '13px',
                                                    lineHeight: 1.5
                                                }}>
                                                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px', color: '#d97706' }} />
                                                    <div>
                                                        <strong style={{ display: 'block', marginBottom: '2px', color: '#78350f' }}>
                                                            Pricing disabled
                                                        </strong>
                                                        Custom-size pricing is turned on, so price, discount, and offer price come from your dimension tiers in the <strong>Customization</strong> tab. Stock and status below still apply.
                                                    </div>
                                                </div>
                                            )}
                                            <fieldset
                                                disabled={variantsEnabled || customizableEnabled}
                                                style={{
                                                    border: 'none',
                                                    padding: 0,
                                                    margin: 0,
                                                    opacity: (variantsEnabled || customizableEnabled) ? 0.5 : 1,
                                                    pointerEvents: (variantsEnabled || customizableEnabled) ? 'none' : 'auto'
                                                }}
                                            >
                                                <div className={styles.formGridFour}>
                                                    <div className={styles.formGroup}>
                                                        <label>{t('modal.fields.price')}</label>
                                                        <input type="number" name="price" required={!variantsEnabled && !customizableEnabled} step="0.01" value={formData.price} onChange={handleInputChange} />
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label>{t('modal.fields.discount')}</label>
                                                        <input type="number" name="discount_percentage" step="0.01" value={formData.discount_percentage} onChange={handleInputChange} />
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label>{t('modal.fields.offerPrice')}</label>
                                                        <input type="number" name="offer_price" step="0.01" value={formData.offer_price} onChange={handleInputChange} />
                                                    </div>
                                                </div>
                                            </fieldset>
                                            <fieldset
                                                disabled={variantsEnabled}
                                                style={{
                                                    border: 'none',
                                                    padding: 0,
                                                    margin: 0,
                                                    opacity: variantsEnabled ? 0.5 : 1,
                                                    pointerEvents: variantsEnabled ? 'none' : 'auto'
                                                }}
                                            >
                                                <div className={styles.formGridFour}>
                                                    <div className={styles.formGroup}>
                                                        <label>{t('modal.fields.trackStock')}</label>
                                                        <div className={styles.toggleWrapper}>
                                                            <label className={styles.switch}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.track_inventory}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, track_inventory: e.target.checked }))}
                                                                />
                                                                <span className={styles.slider}></span>
                                                            </label>
                                                            <span className={styles.toggleLabel}>
                                                                {formData.track_inventory ? 'Strict Stock Control' : 'Always in Stock'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label>Delivery Charge</label>
                                                        <div className={styles.toggleWrapper}>
                                                            <label className={styles.switch}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.charge_delivery}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, charge_delivery: e.target.checked, delivery_charge: e.target.checked ? prev.delivery_charge : '' }))}
                                                                />
                                                                <span className={styles.slider}></span>
                                                            </label>
                                                            <span className={styles.toggleLabel}>
                                                                {formData.charge_delivery ? 'Charge Delivery' : 'Free Delivery'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {formData.charge_delivery && (
                                                        <div className={styles.formGroup}>
                                                            <label>Delivery Charge (per unit)</label>
                                                            <input type="number" name="delivery_charge" step="0.01" min={0} value={formData.delivery_charge} onChange={handleInputChange} placeholder="0.00" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.formGrid}>
                                                    {formData.track_inventory && (
                                                        <div className={styles.formGroup}>
                                                            <label>{t('modal.fields.stock')}</label>
                                                            <input type="number" name="stock_quantity" required={formData.track_inventory && !variantsEnabled} value={formData.stock_quantity} onChange={handleInputChange} />
                                                        </div>
                                                    )}
                                                    <div className={styles.formGroup}>
                                                        <label>{t('modal.fields.status')}</label>
                                                        <div className={styles.statusSelector}>
                                                            <button
                                                                type="button"
                                                                className={`${styles.statusOption} ${formData.status === 'active' ? styles.activeStatusActive : ''}`}
                                                                onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                                                            >
                                                                <Eye size={18} />
                                                                <span>Active</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`${styles.statusOption} ${formData.status === 'draft' ? styles.activeStatusDraft : ''}`}
                                                                onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                                                            >
                                                                <EyeOff size={18} />
                                                                <span>Draft</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </div>
                                    )}

                                    {activeTab === 'category' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>{t('modal.tabs.deals')}</h3>
                                                <p>{t('modal.fields.dealsSubtitle')}</p>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <SearchableSelect label={t('filters.category')} name="category_id" options={categories.filter(c => c.type === 'main_category')} value={formData.category_id} onChange={(e: any) => { handleInputChange(e); setFormData(prev => ({ ...prev, sub_category_id: '', sub_sub_category_id: '', product_group: '', sub_category: '' })); }} />
                                                <SearchableSelect label={t('table.brand')} name="brand_id" options={brands} value={formData.brand_id} onChange={handleInputChange} />
                                            </div>
                                            <div className={styles.formGrid} style={{ marginTop: '15px' }}>
                                                {(() => {
                                                    const subCategories = categories.filter(c => c.type === 'sub_category' && Number(c.parent_id) === Number(formData.category_id));
                                                    if (subCategories.length === 0) return null;
                                                    return (
                                                        <SearchableSelect
                                                            label={t('modal.fields.subGroup')}
                                                            name="sub_category_id"
                                                            options={subCategories}
                                                            value={formData.sub_category_id}
                                                            onChange={(e: any) => {
                                                                const selected = subCategories.find(c => String(c.id) === String(e.target.value));
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    sub_category_id: e.target.value,
                                                                    product_group: selected ? selected.name : '',
                                                                    sub_sub_category_id: '',
                                                                    sub_category: ''
                                                                }));
                                                            }}
                                                        />
                                                    );
                                                })()}
                                                {formData.sub_category_id && (() => {
                                                    const subSubCategories = categories.filter(c => c.type === 'sub_sub_category' && Number(c.parent_id) === Number(formData.sub_category_id));
                                                    if (subSubCategories.length === 0) return null;
                                                    return (
                                                        <SearchableSelect
                                                            label={t('modal.fields.finalSub')}
                                                            name="sub_sub_category_id"
                                                            options={subSubCategories}
                                                            value={formData.sub_sub_category_id}
                                                            onChange={(e: any) => {
                                                                const selected = subSubCategories.find(c => String(c.id) === String(e.target.value));
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    sub_sub_category_id: e.target.value,
                                                                    sub_category: selected ? selected.name : ''
                                                                }));
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div className={styles.marketingFlags}>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))} /> {t('filters.featured')}</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_weekly_deal} onChange={(e) => setFormData(prev => ({ ...prev, is_weekly_deal: e.target.checked, is_limited_offer: e.target.checked ? false : prev.is_limited_offer }))} /> {t('filters.weekly')}</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_limited_offer} onChange={(e) => setFormData(prev => ({ ...prev, is_limited_offer: e.target.checked, is_weekly_deal: e.target.checked ? false : prev.is_weekly_deal }))} /> {t('filters.limited')}</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_daily_offer} onChange={(e) => setFormData(prev => ({ ...prev, is_daily_offer: e.target.checked }))} /> {t('filters.daily')}</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_best_seller} onChange={(e) => setFormData(prev => ({ ...prev, is_best_seller: e.target.checked }))} /> {t('filters.bestseller')}</label>
                                            </div>
                                            {(formData.is_featured || formData.is_weekly_deal || formData.is_limited_offer || formData.is_daily_offer || formData.is_best_seller) && (
                                                <label className={styles.checkLabel} style={{ marginTop: '12px', color: '#0ea5e9' }}>
                                                    <input type="checkbox" checked={formData.notify_users_on_save} onChange={(e) => setFormData(prev => ({ ...prev, notify_users_on_save: e.target.checked }))} />
                                                    Send email notification to all users when saving
                                                </label>
                                            )}
                                            {(formData.is_weekly_deal || formData.is_daily_offer || formData.is_limited_offer) && (
                                                <div className={styles.formGroup} style={{ marginTop: '15px' }}>
                                                    <label>{t('modal.fields.startDate')} / {t('modal.fields.endDate')}</label>
                                                    <OfferSchedulePicker
                                                        startStr={formData.offer_start}
                                                        endStr={formData.offer_end}
                                                        onApply={(start, end) => setFormData(prev => ({ ...prev, offer_start: start, offer_end: end }))}
                                                    />
                                                </div>
                                            )}

                                        </div>
                                    )}

                                    {activeTab === 'fbt' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Frequently Bought Together</h3>
                                                <p>Link products that are commonly purchased alongside this item. They appear as an upsell widget on the product page.</p>
                                            </div>
                                            <div className={styles.formGroup} style={{ maxWidth: '100%' }}>
                                                <label>Search & Add Products</label>
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <input
                                                        type="text"
                                                        value={fbtSearch}
                                                        onChange={(e) => setFbtSearch(e.target.value)}
                                                        placeholder="Type a product name..."
                                                        autoComplete="off"
                                                        style={{ width: '100%', paddingInlineEnd: '36px' }}
                                                    />
                                                    {fbtSearch && (
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => { e.preventDefault(); setFbtSearch(''); setFbtResults([]); }}
                                                            style={{
                                                                position: 'absolute', insetInlineEnd: '10px', top: '50%',
                                                                transform: 'translateY(-50%)', background: 'none', border: 'none',
                                                                cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 2
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                    {fbtSearch.trim() && (fbtResults.length > 0 || fbtLoading) && (
                                                        <div style={{
                                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                                            background: 'white', border: '1px solid #e5e7eb',
                                                            borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                            zIndex: 200, maxHeight: '280px', overflowY: 'auto', marginTop: '4px'
                                                        }}>
                                                            {fbtLoading ? (
                                                                <div style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>Searching...</div>
                                                            ) : (
                                                                fbtResults.map(p => {
                                                                    const alreadyAdded = fbtSelectedItems.some(s => s.id === p.id);
                                                                    return (
                                                                        <div
                                                                            key={p.id}
                                                                            style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', background: alreadyAdded ? '#f0fdf4' : 'white', cursor: 'pointer' }}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                if (alreadyAdded) {
                                                                                    setFbtSelectedItems(prev => prev.filter(s => s.id !== p.id));
                                                                                } else {
                                                                                    setFbtSelectedItems(prev => [...prev, { id: p.id, name: p.name }]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {p.primary_image && <img src={resolveUrl(p.primary_image)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} onError={swapToLogoOnError} />}
                                                                            <span style={{ flex: 1, color: alreadyAdded ? '#16a34a' : 'inherit' }}>{p.name}</span>
                                                                            <div
                                                                                style={{
                                                                                    flexShrink: 0, width: 28, height: 28,
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    borderRadius: '50%',
                                                                                    background: alreadyAdded ? '#16a34a' : '#3b82f6', color: 'white'
                                                                                }}
                                                                            >
                                                                                {alreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {fbtSelectedItems.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px' }}>
                                                    <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                                                    <p>No linked products yet. Search above to add some.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                                    {fbtSelectedItems.map((item, idx) => (
                                                        <div key={item.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px',
                                                            padding: '10px 14px', background: '#f8fafc',
                                                            border: '1px solid #e2e8f0', borderRadius: '10px'
                                                        }}>
                                                            <span style={{ fontSize: '12px', color: '#94a3b8', width: 20, textAlign: 'center' }}>{idx + 1}</span>
                                                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{item.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFbtSelectedItems(prev => prev.filter(p => p.id !== item.id))}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* You May Also Need */}
                                            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                                                <div className={styles.paneHeader} style={{ marginBottom: '16px' }}>
                                                    <h3>You May Also Need</h3>
                                                    <p>
                                                        Select specific products to show in the "You may also need" section.{' '}
                                                        <strong>Default:</strong> shows products from the same category. Selecting products here overrides the default.
                                                    </p>
                                                </div>
                                                {ymanSelectedItems.length > 0 && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                                                        borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#16a34a'
                                                    }}>
                                                        <Check size={14} />
                                                        <span>{ymanSelectedItems.length} product{ymanSelectedItems.length !== 1 ? 's' : ''} selected — overrides default category display</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setYmanSelectedItems([])}
                                                            style={{ marginInlineStart: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: '12px', textDecoration: 'underline', padding: 0 }}
                                                        >
                                                            Reset to default
                                                        </button>
                                                    </div>
                                                )}
                                                <div className={styles.formGroup} style={{ maxWidth: '100%' }}>
                                                    <label>Search & Add Products</label>
                                                    <div style={{ position: 'relative', width: '100%' }}>
                                                        <input
                                                            type="text"
                                                            value={ymanSearch}
                                                            onChange={(e) => setYmanSearch(e.target.value)}
                                                            placeholder="Type a product name..."
                                                            autoComplete="off"
                                                            style={{ width: '100%', paddingInlineEnd: '36px' }}
                                                        />
                                                        {ymanSearch && (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => { e.preventDefault(); setYmanSearch(''); setYmanResults([]); }}
                                                                style={{
                                                                    position: 'absolute', insetInlineEnd: '10px', top: '50%',
                                                                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                                                                    cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 2
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                        {ymanSearch.trim() && (ymanResults.length > 0 || ymanLoading) && (
                                                            <div style={{
                                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                                background: 'white', border: '1px solid #e5e7eb',
                                                                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                                zIndex: 200, maxHeight: '280px', overflowY: 'auto', marginTop: '4px'
                                                            }}>
                                                                {ymanLoading ? (
                                                                    <div style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>Searching...</div>
                                                                ) : (
                                                                    ymanResults.map(p => {
                                                                        const alreadyAdded = ymanSelectedItems.some(s => s.id === p.id);
                                                                        return (
                                                                            <div
                                                                                key={p.id}
                                                                                style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', background: alreadyAdded ? '#f0fdf4' : 'white', cursor: 'pointer' }}
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    if (alreadyAdded) {
                                                                                        setYmanSelectedItems(prev => prev.filter(s => s.id !== p.id));
                                                                                    } else {
                                                                                        setYmanSelectedItems(prev => [...prev, { id: p.id, name: p.name }]);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {p.primary_image && <img src={resolveUrl(p.primary_image)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} onError={swapToLogoOnError} />}
                                                                                <span style={{ flex: 1, color: alreadyAdded ? '#16a34a' : 'inherit' }}>{p.name}</span>
                                                                                <div
                                                                                    style={{
                                                                                        flexShrink: 0, width: 28, height: 28,
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                        borderRadius: '50%',
                                                                                        background: alreadyAdded ? '#16a34a' : '#3b82f6', color: 'white'
                                                                                    }}
                                                                                >
                                                                                    {alreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {ymanSelectedItems.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '24px 20px', color: '#94a3b8', fontSize: '13px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                                                        <p style={{ margin: 0 }}>No products selected — showing same-category products by default.</p>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                                        {ymanSelectedItems.map((item, idx) => (
                                                            <div key={item.id} style={{
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                padding: '10px 14px', background: '#f8fafc',
                                                                border: '1px solid #e2e8f0', borderRadius: '10px'
                                                            }}>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8', width: 20, textAlign: 'center' }}>{idx + 1}</span>
                                                                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{item.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setYmanSelectedItems(prev => prev.filter(p => p.id !== item.id))}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Free Gift Products */}
                                            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                                                <div className={styles.paneHeader} style={{ marginBottom: '16px' }}>
                                                    <h3>Free Gift Products (Bundle)</h3>
                                                    <p>
                                                        Pick products to give away free with this item. The product page will show a "Create a bundle" card, and clicking the main Add to Cart will offer the bundle as an upsell. Each selected product is added to the cart at AED 0.
                                                    </p>
                                                </div>
                                                {giftSelectedItems.length > 0 && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde68a',
                                                        borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#a16207'
                                                    }}>
                                                        <Check size={14} />
                                                        <span>{giftSelectedItems.length} free gift{giftSelectedItems.length !== 1 ? 's' : ''} attached — customers see a bundle offer</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setGiftSelectedItems([])}
                                                            style={{ marginInlineStart: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#a16207', fontSize: '12px', textDecoration: 'underline', padding: 0 }}
                                                        >
                                                            Remove all
                                                        </button>
                                                    </div>
                                                )}
                                                <div className={styles.formGroup} style={{ maxWidth: '100%' }}>
                                                    <label>Search & Add Free Gifts</label>
                                                    <div style={{ position: 'relative', width: '100%' }}>
                                                        <input
                                                            type="text"
                                                            value={giftSearch}
                                                            onChange={(e) => setGiftSearch(e.target.value)}
                                                            placeholder="Type a product name..."
                                                            autoComplete="off"
                                                            style={{ width: '100%', paddingInlineEnd: '36px' }}
                                                        />
                                                        {giftSearch && (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => { e.preventDefault(); setGiftSearch(''); setGiftResults([]); }}
                                                                style={{
                                                                    position: 'absolute', insetInlineEnd: '10px', top: '50%',
                                                                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                                                                    cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 2
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                        {giftSearch.trim() && (giftResults.length > 0 || giftLoading) && (
                                                            <div style={{
                                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                                background: 'white', border: '1px solid #e5e7eb',
                                                                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                                zIndex: 200, maxHeight: '280px', overflowY: 'auto', marginTop: '4px'
                                                            }}>
                                                                {giftLoading ? (
                                                                    <div style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>Searching...</div>
                                                                ) : (
                                                                    giftResults.map(p => {
                                                                        const alreadyAdded = giftSelectedItems.some(s => s.id === p.id);
                                                                        return (
                                                                            <div
                                                                                key={p.id}
                                                                                style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', background: alreadyAdded ? '#fef9c3' : 'white', cursor: 'pointer' }}
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    if (alreadyAdded) {
                                                                                        setGiftSelectedItems(prev => prev.filter(s => s.id !== p.id));
                                                                                    } else {
                                                                                        setGiftSelectedItems(prev => [...prev, { id: p.id, name: p.name }]);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {p.primary_image && <img src={resolveUrl(p.primary_image)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} onError={swapToLogoOnError} />}
                                                                                <span style={{ flex: 1, color: alreadyAdded ? '#a16207' : 'inherit' }}>{p.name}</span>
                                                                                <div
                                                                                    style={{
                                                                                        flexShrink: 0, width: 28, height: 28,
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                        borderRadius: '50%',
                                                                                        background: alreadyAdded ? '#a16207' : '#3b82f6', color: 'white'
                                                                                    }}
                                                                                >
                                                                                    {alreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {giftSelectedItems.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '24px 20px', color: '#94a3b8', fontSize: '13px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                                                        <p style={{ margin: 0 }}>No free gifts attached — leave empty to disable the bundle promo.</p>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                                        {giftSelectedItems.map((item, idx) => (
                                                            <div key={item.id} style={{
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                padding: '10px 14px', background: '#fffbeb',
                                                                border: '1px solid #fde68a', borderRadius: '10px'
                                                            }}>
                                                                <span style={{ fontSize: '12px', color: '#a16207', width: 20, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</span>
                                                                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{item.name}</span>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>FREE</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setGiftSelectedItems(prev => prev.filter(p => p.id !== item.id))}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Linked Parts */}
                                            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                                                <div className={styles.paneHeader} style={{ marginBottom: '16px' }}>
                                                    <h3>Linked Parts</h3>
                                                    <p>
                                                        Link compatible parts to this product. They will appear in a dedicated section on the product page.
                                                    </p>
                                                </div>
                                                {partsSelectedItems.length > 0 && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe',
                                                        borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#1e40af'
                                                    }}>
                                                        <Check size={14} />
                                                        <span>{partsSelectedItems.length} linked part{partsSelectedItems.length !== 1 ? 's' : ''} attached</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPartsSelectedItems([])}
                                                            style={{ marginInlineStart: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontSize: '12px', textDecoration: 'underline', padding: 0 }}
                                                        >
                                                            Remove all
                                                        </button>
                                                    </div>
                                                )}
                                                <div className={styles.formGroup} style={{ maxWidth: '100%' }}>
                                                    <label>Search & Add Linked Parts</label>
                                                    <div style={{ position: 'relative', width: '100%' }}>
                                                        <input
                                                            type="text"
                                                            value={partsSearch}
                                                            onChange={(e) => setPartsSearch(e.target.value)}
                                                            placeholder="Search for parts..."
                                                            autoComplete="off"
                                                            style={{ width: '100%', paddingInlineEnd: '36px' }}
                                                        />
                                                        {partsSearch && (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => { e.preventDefault(); setPartsSearch(''); setPartsResults([]); }}
                                                                style={{
                                                                    position: 'absolute', insetInlineEnd: '10px', top: '50%',
                                                                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                                                                    cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 2
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                        {partsSearch.trim() && (partsResults.length > 0 || partsLoading) && (
                                                            <div style={{
                                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                                background: 'white', border: '1px solid #e5e7eb',
                                                                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                                zIndex: 200, maxHeight: '280px', overflowY: 'auto', marginTop: '4px'
                                                            }}>
                                                                {partsLoading ? (
                                                                    <div style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>Searching parts...</div>
                                                                ) : (
                                                                    partsResults.map(p => {
                                                                        const alreadyAdded = partsSelectedItems.some(s => s.id === p.id);
                                                                        return (
                                                                            <div
                                                                                key={p.id}
                                                                                style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', background: alreadyAdded ? '#f0fdf4' : 'white', cursor: 'pointer' }}
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    if (alreadyAdded) {
                                                                                        setPartsSelectedItems(prev => prev.filter(s => s.id !== p.id));
                                                                                    } else {
                                                                                        setPartsSelectedItems(prev => [...prev, { id: p.id, name: p.name }]);
                                                                                    }
                                                                                    setPartsSearch('');
                                                                                    setPartsResults([]);
                                                                                }}
                                                                            >
                                                                                {p.primary_image && <img src={resolveUrl(p.primary_image)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} onError={swapToLogoOnError} />}
                                                                                <span style={{ flex: 1, color: alreadyAdded ? '#16a34a' : 'inherit' }}>{p.name}</span>
                                                                                <div
                                                                                    style={{
                                                                                        flexShrink: 0, width: 28, height: 28,
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                        borderRadius: '50%',
                                                                                        background: alreadyAdded ? '#16a34a' : '#3b82f6', color: 'white'
                                                                                    }}
                                                                                >
                                                                                    {alreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {partsSelectedItems.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '24px 20px', color: '#94a3b8', fontSize: '13px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                                                        <p style={{ margin: 0 }}>No linked parts attached yet.</p>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                                        {partsSelectedItems.map((item, idx) => (
                                                            <div key={item.id} style={{
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                padding: '10px 14px', background: '#f8fafc',
                                                                border: '1px solid #e2e8f0', borderRadius: '10px'
                                                            }}>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8', width: 20, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</span>
                                                                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{item.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPartsSelectedItems(prev => prev.filter(p => p.id !== item.id))}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'customization' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className={`${styles.iconBox} ${styles.blueIcon}`}>
                                                        <Layers size={20} />
                                                    </div>
                                                    <div>
                                                <h3>Custom Size Pricing</h3>
                                                        <p>Let customers enter their own size. You set a price for each size range, and the final price is added up automatically.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className={`${styles.featureToggleCard} ${customizableEnabled ? styles.active : ''}`}
                                                onClick={() => setCustomizableEnabled(!customizableEnabled)}
                                            >
                                                <div className={styles.switch}>
                                                    <input
                                                        type="checkbox"
                                                        checked={customizableEnabled}
                                                        readOnly
                                                    />
                                                    <span className={styles.slider}></span>
                                                </div>
                                                <div className={styles.featureToggleContent}>
                                                    <span className={styles.featureToggleTitle}>Enable custom-size pricing</span>
                                                    <span className={styles.featureToggleDesc}>Allow customers to provide specific dimensions and pay based on calculated tiers.</span>
                                                </div>
                                            </div>

                                            {customizableEnabled && (
                                                <>
                                                    <div className={styles.infoBox} style={{ marginBottom: 20 }}>
                                                        <div style={{ display: 'flex', gap: 10 }}>
                                                            <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: '#3b82f6' }} />
                                                            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                                                <strong>How it works — 3 simple steps:</strong>
                                                                <div style={{ marginTop: 4 }}>
                                                                    <strong>1.</strong> Pick which measurements the customer can change (width / depth / height).<br />
                                                                    <strong>2.</strong> For each measurement, set a price for every size range (e.g. <em>0–50&nbsp;cm = 100&nbsp;AED, 51–100&nbsp;cm = 180&nbsp;AED</em>).<br />
                                                                    <strong>3.</strong> Enter the standard (default) size. Its price is then worked out automatically.
                                                                </div>
                                                                <div style={{ marginTop: 6, color: '#64748b' }}>The customer&apos;s final price = the matching range price for each measurement, added together.</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={styles.customSizingSection}>
                                                        <h4><Ruler size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: '#3b82f6' }} />Step 1 · Which measurements can the customer change?</h4>
                                                        <p>Tick the measurements the customer is allowed to enter. Untick anything that stays fixed.</p>
                                                        <div className={styles.dimensionCheckboxGroup}>
                                                            {(['width', 'depth', 'height'] as const).map(dim => (
                                                                <label key={dim} className={styles.dimensionCheckboxLabel}>
                                                                    <div className={styles.dimensionToggleIcon}>
                                                                        {dim === 'width' && <MoveHorizontal size={14} />}
                                                                        {dim === 'depth' && <Ruler size={14} />}
                                                                        {dim === 'height' && <MoveVertical size={14} />}
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={customDimensions.includes(dim)}
                                                                        onChange={(e) => {
                                                                            setCustomDimensions(prev =>
                                                                                e.target.checked
                                                                                    ? Array.from(new Set([...prev, dim]))
                                                                                    : prev.filter(d => d !== dim)
                                                                            );
                                                                            if (!e.target.checked) {
                                                                                setSizeTiers(prev => prev.filter(t => t.dimension !== dim));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span style={{ textTransform: 'capitalize' }}>{dim}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className={styles.customSizingSection} style={{ paddingBottom: 0, borderBottom: 'none' }}>
                                                        <h4><BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: '#3b82f6' }} />Step 2 · Price for each size range</h4>
                                                        <p>For every measurement below, add the size ranges and the price for each. Example: <em>From 0 to 50&nbsp;cm → 100&nbsp;AED, From 51 to 100&nbsp;cm → 180&nbsp;AED</em>.</p>
                                                    </div>

                                                    {customDimensions.map((dim, dimIdx) => {
                                                        const dimTiers = sizeTiers
                                                            .map((t, i) => ({ ...t, _idx: i }))
                                                            .filter(t => t.dimension === dim);
                                                        const isDimDragOver = dimDragOverIdx === dimIdx && dimDragIdx !== dimIdx;
                                                        return (
                                                            <div
                                                                key={dim}
                                                                className={styles.customSizingSection}
                                                                onDragOver={(e) => {
                                                                    if (dimDragIdx === null) return;
                                                                    e.preventDefault();
                                                                    e.dataTransfer.dropEffect = 'move';
                                                                    if (dimDragOverIdx !== dimIdx) setDimDragOverIdx(dimIdx);
                                                                }}
                                                                onDragLeave={() => { if (dimDragOverIdx === dimIdx) setDimDragOverIdx(null); }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    if (dimDragIdx !== null) reorderDimension(dimDragIdx, dimIdx);
                                                                    setDimDragIdx(null);
                                                                    setDimDragOverIdx(null);
                                                                }}
                                                                style={{
                                                                    background: isDimDragOver ? '#eff6ff' : undefined,
                                                                    outline: isDimDragOver ? '2px dashed #3b82f6' : undefined,
                                                                    opacity: dimDragIdx === dimIdx ? 0.4 : 1,
                                                                    borderRadius: 12,
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <span
                                                                            draggable
                                                                            onDragStart={(e) => { setDimDragIdx(dimIdx); e.dataTransfer.effectAllowed = 'move'; }}
                                                                            onDragEnd={() => { setDimDragIdx(null); setDimDragOverIdx(null); }}
                                                                            title="Drag to reorder — this is the order shown on the product page"
                                                                            style={{ cursor: 'grab', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                                                                        >
                                                                            <GripVertical size={16} />
                                                                        </span>
                                                                        <h4 style={{ textTransform: 'capitalize', margin: 0 }}>{dim}</h4>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSizeTiers(prev => {
                                                                            const existingForDim = prev.filter(t => t.dimension === dim);
                                                                            let nextMin = '';
                                                                            if (existingForDim.length === 0) {
                                                                                const baseV = parseInt(baseDimensions[dim], 10);
                                                                                if (Number.isFinite(baseV)) nextMin = String(baseV);
                                                                            } else {
                                                                                const maxes = existingForDim
                                                                                    .map(t => parseInt(t.max_cm, 10))
                                                                                    .filter(n => Number.isFinite(n));
                                                                                if (maxes.length > 0) nextMin = String(Math.max(...maxes) + 1);
                                                                            }
                                                                            return [...prev, { dimension: dim, min_cm: nextMin, max_cm: '', price: '' }];
                                                                        })}
                                                                        className={styles.addTierBtn}
                                                                    >
                                                                        <Plus size={16} /> Add tier
                                                                    </button>
                                                                </div>

                                                                {dimTiers.length === 0 ? (
                                                                    <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
                                                                        No tiers configured for {dim}.
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className={styles.tierTableHeader}>
                                                                            <span>From (cm)</span>
                                                                            <span>To (cm)</span>
                                                                            <span>Price (AED)</span>
                                                                            <span></span>
                                                                        </div>
                                                                        {dimTiers.map(t => (
                                                                            <div key={t._idx} className={styles.tierRow}>
                                                                                <input
                                                                                    type="number" min="0" step="1" value={t.min_cm}
                                                                                    onChange={(e) => setSizeTiers(prev => prev.map((row, i) => i === t._idx ? { ...row, min_cm: e.target.value } : row))}
                                                                                    className={styles.tierInput}
                                                                                />
                                                                                <input
                                                                                    type="number" min="0" step="1" value={t.max_cm}
                                                                                    onChange={(e) => setSizeTiers(prev => prev.map((row, i) => i === t._idx ? { ...row, max_cm: e.target.value } : row))}
                                                                                    className={styles.tierInput}
                                                                                />
                                                                                <input
                                                                                    type="number" min="0" step="0.01" value={t.price}
                                                                                    onChange={(e) => setSizeTiers(prev => prev.map((row, i) => i === t._idx ? { ...row, price: e.target.value } : row))}
                                                                                    className={styles.tierInput}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setSizeTiers(prev => prev.filter((_, i) => i !== t._idx))}
                                                                                    className={styles.tierDeleteBtn}
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    <div className={styles.customSizingSection}>
                                                        <h4><Ruler size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: '#3b82f6' }} />Step 3 · Standard (default) size</h4>
                                                        <p>The size shown on the product page by default. Its price is worked out automatically from the ranges you set above.</p>

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                                                            {customDimensions.map(dim => (
                                                                <div key={dim} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{dim} (cm)</label>
                                                                    <input
                                                                        type="number" min="0" step="1"
                                                                        value={baseDimensions[dim]}
                                                                        onChange={(e) => setBaseDimensions(prev => ({ ...prev, [dim]: e.target.value }))}
                                                                        placeholder={dim === 'width' ? '30' : dim === 'depth' ? '70' : '90'}
                                                                        className={styles.tierInput}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {(() => {
                                                            let computedBase: number | null = 0;
                                                            for (const dim of customDimensions) {
                                                                const baseV = Number(baseDimensions[dim]);
                                                                if (!Number.isFinite(baseV) || baseDimensions[dim] === '') { computedBase = null; break; }
                                                                const tiers = sizeTiers.filter(t => t.dimension === dim);
                                                                if (tiers.length === 0) { computedBase = null; break; }
                                                                const tier = tiers.find(t =>
                                                                    t.min_cm !== '' && t.max_cm !== '' && t.price !== '' &&
                                                                    baseV >= Number(t.min_cm) && baseV <= Number(t.max_cm)
                                                                );
                                                                if (!tier) { computedBase = null; break; }
                                                                computedBase += Number(tier.price);
                                                            }
                                                            return (
                                                                <div className={styles.basePriceSummary}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                        <Banknote size={20} color="#3b82f6" />
                                                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Price at the standard size</span>
                                                                    </div>
                                                                    <span style={{ fontSize: 16, fontWeight: 800, color: computedBase === null ? '#dc2626' : '#0f172a' }}>
                                                                        {computedBase === null ? '— set ranges above' : `${computedBase.toFixed(2)} AED`}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'variants' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Product Variants</h3>
                                                <p>Define Color / Size / etc. Each combination gets its own price, stock, SKU, and optional image.</p>
                                            </div>
                                            <VariantsEditor
                                                enabled={variantsEnabled}
                                                onEnabledChange={setVariantsEnabled}
                                                options={variantOptions}
                                                onOptionsChange={setVariantOptions}
                                                variants={variantRows}
                                                onVariantsChange={setVariantRows}
                                                primaryImage={formData.image_url}
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'compare' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Compare with Similar Products</h3>
                                                <p>
                                                    Curate which 2 products appear next to this one in the &ldquo;Compare with similar products&rdquo; table on the product page, and write the row labels / values you want shown. Price is always added automatically.
                                                </p>
                                            </div>

                                            <div
                                                className={`${styles.featureToggleCard} ${compareEnabled ? styles.active : ''}`}
                                                onClick={() => setCompareEnabled(!compareEnabled)}
                                            >
                                                <div className={styles.switch}>
                                                    <input type="checkbox" checked={compareEnabled} readOnly />
                                                    <span className={styles.slider}></span>
                                                </div>
                                                <div className={styles.featureToggleContent}>
                                                    <span className={styles.featureToggleTitle}>Enable curated compare table</span>
                                                    <span className={styles.featureToggleDesc}>When on, the product page uses this manually-defined table instead of auto-parsing specifications.</span>
                                                </div>
                                            </div>

                                            {compareEnabled && (
                                                <>
                                                    {/* Slot pickers — dynamic; admin can add as many products as they want */}
                                                    <div style={{ marginTop: 24 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475569' }}>
                                                                Products to compare ({compareSlots.length})
                                                            </h4>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setCompareSlotPicker(-1); setCompareSearch(''); setCompareResults([]); }}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                                    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                                                                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                                }}
                                                            >
                                                                <Plus size={14} /> Add product
                                                            </button>
                                                        </div>
                                                        {compareSlots.length === 0 ? (
                                                            <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8', fontSize: 13 }}>
                                                                No products selected yet. Click <strong>Add product</strong> to pick one.
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                                                                {compareSlots.map((slot, slotIdx) => (
                                                                    <div key={slot.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#f8fafc' }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                                                                            Product {slotIdx + 1}
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                                                                            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', flex: 1 }}>{slot.name}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    // Remove this slot AND drop the corresponding value column from every row.
                                                                                    setCompareSlots(prev => prev.filter((_, i) => i !== slotIdx));
                                                                                    setCompareRows(prev => prev.map(r => ({
                                                                                        ...r,
                                                                                        values: r.values.filter((_, i) => i !== slotIdx + 1),
                                                                                        values_ar: r.values_ar.filter((_, i) => i !== slotIdx + 1)
                                                                                    })));
                                                                                }}
                                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'flex' }}
                                                                                title="Remove"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {compareSlotPicker !== null && (
                                                            <div style={{ marginTop: 12, padding: 14, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                                                                        {compareSlotPicker === -1 ? 'Search to add a product' : `Search to replace product ${compareSlotPicker + 1}`}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCompareSlotPicker(null)}
                                                                        style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={compareSearch}
                                                                    onChange={(e) => setCompareSearch(e.target.value)}
                                                                    placeholder="Type a product name..."
                                                                    autoComplete="off"
                                                                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8 }}
                                                                />
                                                                {compareSearch.trim() && (compareResults.length > 0 || compareLoading) && (
                                                                    <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
                                                                        {compareLoading ? (
                                                                            <div style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>Searching...</div>
                                                                        ) : (
                                                                            compareResults.map(p => {
                                                                                // Can't pick the same product twice; allow re-picking the current slot's own product.
                                                                                const alreadyPicked = compareSlots.some((s, i) => s.id === p.id && i !== compareSlotPicker);
                                                                                return (
                                                                                    <button
                                                                                        key={p.id}
                                                                                        type="button"
                                                                                        disabled={alreadyPicked}
                                                                                        onClick={async () => {
                                                                                            const isAppend = compareSlotPicker === -1;
                                                                                            // Index in the values[] array that will hold this product's specs.
                                                                                            // values[0] = "this product", values[1+slotIdx] = each curated slot.
                                                                                            const targetCol = isAppend ? (1 + compareSlots.length) : (1 + (compareSlotPicker as number));

                                                                                            if (isAppend) {
                                                                                                setCompareSlots(prev => [...prev, { id: p.id, name: p.name }]);
                                                                                                setCompareRows(prev => prev.map(r => ({ ...r, values: [...r.values, ''], values_ar: [...r.values_ar, ''] })));
                                                                                            } else {
                                                                                                setCompareSlots(prev => prev.map((s, i) => i === compareSlotPicker ? { id: p.id, name: p.name } : s));
                                                                                            }
                                                                                            setCompareSlotPicker(null);
                                                                                            setCompareSearch('');
                                                                                            setCompareResults([]);

                                                                                            // Fetch the picked product's full record to access `specifications`
                                                                                            // (search results may not include it), then merge into the compare rows:
                                                                                            // existing labels get their cell filled, new labels become new rows.
                                                                                            try {
                                                                                                const res = await fetch(`${API_BASE_URL}/products/${p.id}`, { credentials: 'include', headers: getAuthHeaders() });
                                                                                                const data = await res.json();
                                                                                                const full = data?.data || data?.product || data;
                                                                                                const pickedSpecs = parseSpecLines(full?.specifications);
                                                                                                const pickedSpecsAr = parseSpecLines(full?.specifications_ar);
                                                                                                // Also pull the *current* product's specs once so values[0] gets filled.
                                                                                                const ownSpecs = parseSpecLines(formData.specifications);
                                                                                                const ownSpecsAr = parseSpecLines((formData as any).specifications_ar);
                                                                                                if (pickedSpecs.length === 0 && pickedSpecsAr.length === 0 && ownSpecs.length === 0 && ownSpecsAr.length === 0) return;

                                                                                                setCompareRows(prev => {
                                                                                                    // After the slot mutation above, every row's values length equals 1 + compareSlots.length (post-append) or unchanged (swap).
                                                                                                    const colCount = isAppend ? (2 + compareSlots.length) : (1 + compareSlots.length);
                                                                                                    const pad = (arr: string[]) => Array.from({ length: colCount }, (_, i) => arr[i] || '');
                                                                                                    const rows = prev.map(r => ({ ...r, values: pad(r.values), values_ar: pad(r.values_ar) }));

                                                                                                    const findIdx = (label: string) => rows.findIndex(r =>
                                                                                                        r.label.trim().toLowerCase() === label.trim().toLowerCase()
                                                                                                        || r.label_ar.trim().toLowerCase() === label.trim().toLowerCase()
                                                                                                    );
                                                                                                    const setCell = (rowIdx: number, col: number, value: string, ar: boolean) => {
                                                                                                        if (ar) rows[rowIdx].values_ar[col] = rows[rowIdx].values_ar[col] || value;
                                                                                                        else rows[rowIdx].values[col] = rows[rowIdx].values[col] || value;
                                                                                                    };
                                                                                                    const upsert = (label: string, value: string, col: number, opts: { ar?: boolean } = {}) => {
                                                                                                        if (!label || !value) return;
                                                                                                        let idx = findIdx(label);
                                                                                                        if (idx === -1) {
                                                                                                            const blanks = Array.from({ length: colCount }, () => '');
                                                                                                            rows.push({ label: opts.ar ? '' : label, label_ar: opts.ar ? label : '', values: [...blanks], values_ar: [...blanks] });
                                                                                                            idx = rows.length - 1;
                                                                                                        } else if (opts.ar && !rows[idx].label_ar) {
                                                                                                            rows[idx].label_ar = label;
                                                                                                        } else if (!opts.ar && !rows[idx].label) {
                                                                                                            rows[idx].label = label;
                                                                                                        }
                                                                                                        setCell(idx, col, value, !!opts.ar);
                                                                                                    };

                                                                                                    // 1. Current product → column 0.
                                                                                                    ownSpecs.forEach(({ label, value }) => upsert(label, value, 0));
                                                                                                    ownSpecsAr.forEach(({ label, value }) => upsert(label, value, 0, { ar: true }));
                                                                                                    // 2. Picked product → targetCol.
                                                                                                    pickedSpecs.forEach(({ label, value }) => upsert(label, value, targetCol));
                                                                                                    pickedSpecsAr.forEach(({ label, value }) => upsert(label, value, targetCol, { ar: true }));

                                                                                                    return rows;
                                                                                                });
                                                                                            } catch (err) {
                                                                                                console.error('Failed to fetch product specs for compare:', err);
                                                                                            }
                                                                                        }}
                                                                                        style={{
                                                                                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                                                                            padding: '8px 12px', background: 'white', border: '1px solid #f1f5f9',
                                                                                            borderRadius: 8, cursor: alreadyPicked ? 'not-allowed' : 'pointer',
                                                                                            opacity: alreadyPicked ? 0.4 : 1, marginBottom: 6, textAlign: 'start'
                                                                                        }}
                                                                                    >
                                                                                        {p.primary_image && <img src={resolveUrl(p.primary_image)} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} onError={swapToLogoOnError} />}
                                                                                        <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                                                                                    </button>
                                                                                );
                                                                            })
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Row editor */}
                                                    <div style={{ marginTop: 28 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475569' }}>
                                                                Comparison Rows
                                                            </h4>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    // New row always carries 1 + slots.length empty cells so the table is consistent.
                                                                    const empty = Array.from({ length: 1 + compareSlots.length }, () => '');
                                                                    setCompareRows(prev => [...prev, { label: '', label_ar: '', values: empty, values_ar: [...empty] }]);
                                                                }}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                                    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                                                                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                                }}
                                                            >
                                                                <Plus size={14} /> Add row
                                                            </button>
                                                        </div>

                                                        {compareRows.length === 0 ? (
                                                            <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8', fontSize: 13 }}>
                                                                No rows yet. Add a row like &ldquo;Layout&rdquo; with the value for each product.
                                                            </div>
                                                        ) : (
                                                            // Card-per-row layout: each row gets its own panel with a label header and
                                                            // a 2-column grid of "Product → value" pairs. Stays readable with many products.
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                {compareRows.map((row, rIdx) => {
                                                                    const productLabels: string[] = [
                                                                        'This product',
                                                                        ...compareSlots.map((s, i) => s.name || `Product ${i + 1}`)
                                                                    ];
                                                                    return (
                                                                        <div
                                                                            key={rIdx}
                                                                            style={{
                                                                                border: '1px solid #e2e8f0', borderRadius: 10,
                                                                                background: '#ffffff', overflow: 'hidden'
                                                                            }}
                                                                        >
                                                                            <div style={{
                                                                                display: 'flex', alignItems: 'center', gap: 10,
                                                                                padding: '10px 12px', background: '#f8fafc',
                                                                                borderBottom: '1px solid #e2e8f0'
                                                                            }}>
                                                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                                                                                    ROW {rIdx + 1}
                                                                                </span>
                                                                                <input
                                                                                    type="text"
                                                                                    value={row.label}
                                                                                    onChange={(e) => setCompareRows(prev => prev.map((r, i) => i === rIdx ? { ...r, label: e.target.value } : r))}
                                                                                    placeholder="Row label EN (e.g. Height)"
                                                                                    style={{ flex: 1, padding: '6px 10px', fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 6, background: 'white' }}
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    dir="rtl"
                                                                                    value={row.label_ar}
                                                                                    onChange={(e) => setCompareRows(prev => prev.map((r, i) => i === rIdx ? { ...r, label_ar: e.target.value } : r))}
                                                                                    placeholder="تسمية الصف بالعربية"
                                                                                    style={{ flex: 1, padding: '6px 10px', fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 6, background: 'white' }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setCompareRows(prev => prev.filter((_, i) => i !== rIdx))}
                                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'inline-flex' }}
                                                                                    title="Remove row"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                            <div style={{
                                                                                display: 'grid',
                                                                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                                                gap: 10,
                                                                                padding: 12
                                                                            }}>
                                                                                {productLabels.map((plabel, cIdx) => (
                                                                                    <label
                                                                                        key={cIdx}
                                                                                        style={{
                                                                                            display: 'flex', flexDirection: 'column', gap: 4,
                                                                                            fontSize: 11, color: '#64748b'
                                                                                        }}
                                                                                    >
                                                                                        <span style={{ fontWeight: 600, color: '#475569' }}>{plabel}</span>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.values[cIdx] || ''}
                                                                                            onChange={(e) => setCompareRows(prev => prev.map((r, i) => i === rIdx
                                                                                                ? {
                                                                                                    ...r,
                                                                                                    values: Array.from({ length: 1 + compareSlots.length }, (_, j) => j === cIdx ? e.target.value : (r.values[j] || ''))
                                                                                                }
                                                                                                : r))}
                                                                                            placeholder="EN value"
                                                                                            style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#ffffff' }}
                                                                                        />
                                                                                        <input
                                                                                            type="text"
                                                                                            dir="rtl"
                                                                                            value={row.values_ar[cIdx] || ''}
                                                                                            onChange={(e) => setCompareRows(prev => prev.map((r, i) => i === rIdx
                                                                                                ? {
                                                                                                    ...r,
                                                                                                    values_ar: Array.from({ length: 1 + compareSlots.length }, (_, j) => j === cIdx ? e.target.value : (r.values_ar[j] || ''))
                                                                                                }
                                                                                                : r))}
                                                                                            placeholder="القيمة بالعربية"
                                                                                            style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#ffffff' }}
                                                                                        />
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        <div className={styles.infoBox} style={{ marginTop: 12 }}>
                                                            <div style={{ display: 'flex', gap: 10 }}>
                                                                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2, color: '#3b82f6' }} />
                                                                <div>
                                                                    <strong>Tip:</strong> Leave a cell empty to show &ldquo;—&rdquo; in that column. Price is rendered automatically as the first row; you don&apos;t need to add it here.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'media' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>{t('modal.tabs.visual')}</h3>
                                                <p>{t('modal.fields.mediaSubtitle')}</p>
                                            </div>
                                            <div className={styles.mediaGrid}>
                                                {[formData.image_url, ...formData.additional_images].map((img, index) => (
                                                    img && (
                                                        <div key={index} className={styles.mediaItem}>
                                                            <img src={resolveUrl(img)} alt="" onError={swapToLogoOnError} />
                                                            <button type="button" onClick={() => {
                                                                const currentImages = [formData.image_url, ...formData.additional_images];
                                                                currentImages.splice(index, 1);
                                                                currentImages.push('');
                                                                setFormData(prev => ({ ...prev, image_url: currentImages[0] || '', additional_images: [currentImages[1] || '', currentImages[2] || '', currentImages[3] || ''] }));
                                                            }} className={styles.removeMedia}><X size={14} /></button>
                                                            {index === 0 ? (
                                                                <span className={styles.primaryBadge}>Primary</span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // Promote this image to primary by swapping it into slot 0.
                                                                        const currentImages = [formData.image_url, ...formData.additional_images];
                                                                        const picked = currentImages[index];
                                                                        currentImages[index] = currentImages[0];
                                                                        currentImages[0] = picked;
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            image_url: currentImages[0] || '',
                                                                            additional_images: [currentImages[1] || '', currentImages[2] || '', currentImages[3] || '']
                                                                        }));
                                                                    }}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        bottom: 8,
                                                                        insetInlineStart: 8,
                                                                        background: 'rgba(255,255,255,0.95)',
                                                                        border: '1px solid #d1d5db',
                                                                        borderRadius: 6,
                                                                        padding: '3px 8px',
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                        color: '#374151',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Set as Primary
                                                                </button>
                                                            )}
                                                        </div>
                                                    )
                                                ))}
                                                {(!formData.image_url || formData.additional_images.some(img => !img)) && (
                                                    <div className={styles.mediaUploadPlaceholder} onClick={() => !uploading && document.getElementById('image-upload-input')?.click()}>
                                                        <input id="image-upload-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                                                        <Upload size={24} />
                                                        <span>{uploading ? t('actions.processing') : t('modal.fields.uploadImage')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.modalContentFooter}>
                                    <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>{t('footer.cancel')}</button>
                                    <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                                        {isSaving
                                            ? (editingId ? t('actions.updating') : t('actions.saving'))
                                            : (editingId ? t('actions.update') : t('footer.save'))
                                        }
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {isImportModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.importModal}`}>
                        <div className={styles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className={`${styles.iconBox} ${styles.blueIcon}`}>
                                    <FileUp size={20} />
                                </div>
                                <div>
                                    <h2>{t('import.title')}</h2>
                                    <p>{t('import.subtitle')}</p>
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setIsImportModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.importBody}>
                            {!importResult ? (
                                <>
                                    <div className={styles.importInstructions}>
                                        <h3><LayoutGrid size={18} /> {t('import.gettingStarted')}</h3>
                                        <ul>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>1</div>
                                                <span>{t('import.step1')}</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>2</div>
                                                <span>{t('import.step2')}</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>3</div>
                                                <span>{t('import.step3')}</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>4</div>
                                                <span>{t('import.step4')}</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>5</div>
                                                <span>{t('import.step5')}</span>
                                            </li>
                                        </ul>
                                        <button className={styles.downloadTemplateBtn} onClick={handleDownloadTemplate}>
                                            <FileDown size={18} />
                                            {t('import.downloadTemplate')}
                                        </button>
                                    </div>

                                    <div className={styles.uploadArea}>
                                        <input
                                            type="file"
                                            id="bulk-import-input"
                                            hidden
                                            accept=".xlsx, .xls"
                                            onChange={handleBulkImport}
                                        />
                                        <div
                                            className={styles.uploadPlaceholder}
                                            onClick={() => !importing && document.getElementById('bulk-import-input')?.click()}
                                        >
                                            {importing ? (
                                                <div className={styles.progressContainer}>
                                                    <Loader2 size={32} className={styles.spinner} />
                                                    <p>{t('import.processing', { percent: uploadProgress })}</p>
                                                    <div className={styles.progressWrapper}>
                                                        <div
                                                            className={styles.progressBarFill}
                                                            style={{ width: `${uploadProgress}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={styles.progressText}>{t('import.keepOpen')}</span>
                                                </div>
                                            ) : (
                                                <div className={styles.uploadIdleState}>
                                                    <div className={styles.uploadIconCircle}>
                                                        <Upload size={32} />
                                                    </div>
                                                    <p>{t('import.selectFile')}</p>
                                                    <span>{t('import.formats')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.importSuccessArea}>
                                    <div className={styles.resultSummary}>
                                        <div className={styles.resultCard}>
                                            <CheckCircle2 size={32} color="#10b981" />
                                            <div className={styles.resultValue}>{importResult.success}</div>
                                            <div className={styles.resultLabel}>{t('import.imported')}</div>
                                        </div>
                                        <div className={styles.resultCard}>
                                            <AlertCircle size={32} color={importResult.failed > 0 ? "#ef4444" : "#dee2e6"} />
                                            <div className={styles.resultValue}>{importResult.failed}</div>
                                            <div className={styles.resultLabel}>{t('import.failed')}</div>
                                        </div>
                                    </div>

                                    {importResult.errors.length > 0 && (
                                        <div className={styles.errorLog}>
                                            <h4>{t('import.errorLog')}</h4>
                                            <ul>
                                                {importResult.errors.map((err: string, idx: number) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className={styles.importActions}>
                                        <button className={styles.finishBtn} onClick={() => setIsImportModalOpen(false)}>
                                            {t('import.done')}
                                        </button>
                                        <button className={styles.tryAgainBtn} onClick={() => setImportResult(null)}>
                                            {t('import.importAnother')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Update Modal */}
            {isBulkModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.bulkUpdateModal}>
                        <div className={styles.bulkUpdateHeader}>
                            <div className={styles.bulkUpdateHeaderTitle}>
                                <BarChart3 size={24} color="#4c6ef5" />
                                <div className={styles.bulkUpdateHeaderText}>
                                    <h2>{t('actions.bulkUpdate')}</h2>
                                    <p>{t('actions.bulkUpdateSubtitle', { count: selectedIds.length })}</p>
                                </div>
                            </div>
                            <button className={styles.bulkUpdateClose} onClick={() => setIsBulkModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.bulkUpdateBody}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>{t('modal.fields.startDate')}</label>
                                    <input
                                        type="datetime-local"
                                        value={bulkFormData.offer_start}
                                        onChange={(e) => setBulkFormData({ ...bulkFormData, offer_start: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('modal.fields.endDate')}</label>
                                    <input
                                        type="datetime-local"
                                        value={bulkFormData.offer_end}
                                        onChange={(e) => setBulkFormData({ ...bulkFormData, offer_end: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px', lineHeight: '1.5' }}>
                                <strong>{t('actions.note')}</strong> {t('actions.bulkUpdateNote')}
                            </p>
                        </div>
                        <div className={styles.modalContentFooter}>
                            <button className={styles.cancelBtn} onClick={() => setIsBulkModalOpen(false)}>{t('footer.cancel')}</button>
                            <button
                                className={styles.submitBtn}
                                onClick={handleBulkUpdate}
                                disabled={bulkUpdating}
                            >
                                {bulkUpdating ? t('actions.processing') : t('actions.update')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                type={confirmModal.type}
                isLoading={isActionLoading}
            />
        </div >
    );
};

export default AdminProducts;
