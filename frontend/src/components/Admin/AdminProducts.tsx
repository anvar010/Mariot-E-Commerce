'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminProducts.module.css';
import { Package, Plus, Search, Edit2, Trash2, X, Upload, ChevronDown, ChevronLeft, ChevronRight, Loader2, FileDown, FileUp, CheckCircle2, AlertCircle, ClipboardCheck, Banknote, LayoutGrid, Images, FileText, BarChart3, Eye, EyeOff, Video } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { CATEGORIES_STRUCTURE } from '@/data/categories';
import { stripHtml } from '@/utils/formatters';
import { getAuthHeaders } from '@/utils/authHeaders';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';

// Searchable Select Component
const SearchableSelect = ({ label, name, options, value, onChange, placeholder = "Search..." }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter((opt: any) =>
        (opt.name || opt).toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find((opt: any) => String(opt.id || opt) === String(value));

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
        <div className={styles.formGroup} ref={containerRef}>
            <label>{label}</label>
            <div className={styles.customSelectWrapper}>
                <div
                    className={styles.customSelectTrigger}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedOption ? (selectedOption.name || selectedOption) : placeholder}
                    <ChevronDown size={18} className={isOpen ? styles.rotate : ''} />
                </div>

                {isOpen && (
                    <div className={styles.customSelectDropdown}>
                        <div className={styles.selectSearchBox}>
                            <Search size={14} />
                            <input
                                type="text"
                                placeholder="Search..."
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
                                        key={opt.id || opt}
                                        className={`${styles.selectOption} ${String(opt.id || opt) === String(value) ? styles.selected : ''}`}
                                        onClick={() => {
                                            onChange({ target: { name: name, value: String(opt.id || opt) } });
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                    >
                                        {opt.name || opt}
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noOptions}>No results found</div>
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
        showNotification('Template downloaded successfully');
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
                showNotification(`Successfully imported ${data.data.success} products!`);
                fetchProducts();
            } else {
                showNotification(data.message || 'Import failed', 'error');
            }
        } catch (error: any) {
            console.error('Import Error:', error);
            showNotification(error.message || 'An error occurred during import', 'error');
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
                    showNotification(data.message || 'Export failed', 'error');
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
            showNotification('Product list exported successfully');
        } catch (error) {
            console.error('Failed to export products:', error);
            showNotification('Failed to export products', 'error');
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
        price: '',
        discount_percentage: '0',
        offer_price: '',
        stock_quantity: '',
        category_id: '1',
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
        resources: [{ name: '', url: '' }],
        status: 'active',
        offer_start: '',
        offer_end: '',
        track_inventory: false
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
                price: '', discount_percentage: '0', offer_price: '',
                stock_quantity: '', category_id: '1', brand_id: '1',
                product_group: '', sub_category: '',
                image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop',
                additional_images: ['', '', ''],
                is_weekly_deal: false, is_limited_offer: false,
                is_featured: false, is_daily_offer: false, is_best_seller: false,
                resources: [{ name: '', url: '' }],
                status: 'active', offer_start: '', offer_end: '',
                track_inventory: false
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
        fetchProducts();
    }, [filters, currentPage]);

    useEffect(() => {
        fetchCategories();
        fetchBrands();
    }, []);

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
            const res = await fetch(`${API_BASE_URL}/brands`, { credentials: "include", headers: getAuthHeaders() });
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
            params.append('status', filters.status); // User selected status
            params.append('stockStatus', filters.stockStatus); // User selected stock status

            if (filters.offerType === 'featured') params.append('is_featured', 'true');
            if (filters.offerType === 'weekly') params.append('is_weekly_deal', 'true');
            if (filters.offerType === 'limited') params.append('is_limited_offer', 'true');
            if (filters.offerType === 'daily') params.append('is_daily_offer', 'true');
            if (filters.offerType === 'best_seller') params.append('is_best_seller', 'true');

            params.append('t', String(Date.now()));

            // Database Debugging Trace
            try {
                const debugRes = await fetch(`${API_BASE_URL}/admin/debug-db`, { credentials: "include", headers: getAuthHeaders() });
                const debugData = await debugRes.json();
                console.log('--- DATABASE DEBUG INFO ---');
                console.log('Table Counts:', debugData.counts);
                console.log('Environment:', debugData.env);
                console.log('---------------------------');
            } catch (e) {
                console.warn('Debug fetch failed', e);
            }

            const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
                if (data.pagination) {
                    setPaginationInfo(prev => ({
                        ...prev,
                        total: Number(data.total || 0),
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
                showNotification('Image uploaded successfully');
            } else {
                showNotification(data.message || 'Upload failed', 'error');
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
                showNotification('File uploaded successfully');
            } else {
                showNotification(data.message || 'Upload failed', 'error');
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
        // Get additional images from product.images array (excluding primary)
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
            price: product.price,
            discount_percentage: product.discount_percentage || '0',
            offer_price: product.offer_price || '',
            stock_quantity: product.stock_quantity,
            category_id: product.category_id || '',
            brand_id: product.brand_id || '',
            product_group: product.product_group || product.heading || '',
            sub_category: product.sub_category || '',
            image_url: product.primary_image || product.image_url || '',
            additional_images: paddedImages,
            is_weekly_deal: isTrue(product.is_weekly_deal),
            is_limited_offer: isTrue(product.is_limited_offer),
            is_featured: isTrue(product.is_featured),
            is_daily_offer: isTrue(product.is_daily_offer),
            is_best_seller: isTrue(product.is_best_seller),
            status: product.status || 'active',
            offer_start: product.offer_start ? new Date(product.offer_start).toISOString().slice(0, 16) : '',
            offer_end: product.offer_end ? new Date(product.offer_end).toISOString().slice(0, 16) : '',
            track_inventory: isTrue(product.track_inventory)
        });
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
            price: '',
            discount_percentage: '0',
            offer_price: '',
            stock_quantity: '',
            category_id: categories.length > 0 ? String(categories[0].id) : '1',
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
            track_inventory: false
        });
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
                    showNotification('Offer End Date must be after Offer Start Date!', 'error');
                    return;
                }
            }

            const url = editingId
                ? `${API_BASE_URL}/products/${editingId}`
                : `${API_BASE_URL}/products`;

            const method = editingId ? 'PUT' : 'POST';

            // Combine main image and additional images into a single array for the backend
            const images = [formData.image_url, ...formData.additional_images].filter(img => img && img.trim() !== '');

            const payload = {
                ...formData,
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
                is_best_seller: Boolean(formData.is_best_seller)
            };

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
                showNotification(`Product ${editingId ? 'updated' : 'added'} successfully!`);
                handleCloseModal();
                fetchProducts();
            } else {
                showNotification(data.message || 'Operation failed', 'error');
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
                <div className={styles.headerTop}>
                    <div className={styles.titleGroup}>
                        <div className={styles.titleWithBadge}>
                            <h1>Products Management</h1>
                            <div className={styles.totalBadge}>
                                <Package size={14} />
                                <span><strong>{paginationInfo.total}</strong> products</span>
                            </div>
                        </div>
                        <p className={styles.subtitle}>Manage your inventory and add new products to the catalog.</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selectedIds.length > 0 && (
                            <button className={styles.bulkDeleteBtn} onClick={handleBulkDelete}>
                                <Trash2 size={18} />
                                <span>Delete ({selectedIds.length})</span>
                            </button>
                        )}
                        <button className={styles.addBtn} onClick={() => {
                            setEditingId(null);
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
                                price: '',
                                discount_percentage: '0',
                                offer_price: '',
                                stock_quantity: '',
                                category_id: categories.length > 0 ? String(categories[0].id) : '1',
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
                                track_inventory: false
                            });
                            setActiveTab('basic');
                            setIsModalOpen(true);
                        }}>
                            <Plus size={20} />
                            <span>Add New Product</span>
                        </button>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <div className={styles.actionGroup}>
                        <button
                            className={styles.utilBtn}
                            onClick={handleSyncBrands}
                            title="Sync brand logos to database"
                        >
                            <BarChart3 size={16} />
                            <span>Sync Brands</span>
                        </button>
                        <button
                            className={styles.utilBtn}
                            onClick={handleExport}
                            disabled={exporting}
                        >
                            <FileDown size={16} />
                            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
                        </button>
                        <button
                            className={styles.utilBtn}
                            onClick={() => {
                                setImportResult(null);
                                setIsImportModalOpen(true);
                            }}
                        >
                            <FileUp size={16} />
                            <span>Bulk Import</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        name="search"
                        placeholder="Search products by model or brand..."
                        value={filters.search}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className={styles.filterBtns}>
                    <select
                        className={styles.filterSelect}
                        name="category"
                        value={filters.category}
                        onChange={handleFilterChange}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="brand"
                        value={filters.brand}
                        onChange={handleFilterChange}
                    >
                        <option value="">All Brands</option>
                        {brands.map(brand => (
                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="stockStatus"
                        value={filters.stockStatus}
                        onChange={handleFilterChange}
                    >
                        <option value="all">Stock Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="offerType"
                        value={filters.offerType}
                        onChange={handleFilterChange}
                        style={{ borderInlineStart: '4px solid #4c6ef5' }}
                    >
                        <option value="all">Offer Types (All)</option>
                        <option value="weekly">Weekly Deals</option>
                        <option value="limited">Limited Offers</option>
                        <option value="daily">Daily Offers</option>
                        <option value="featured">Featured Items</option>
                        <option value="best_seller">Best Sellers</option>
                    </select>
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
                            <th>Product</th>
                            <th>Brand</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Tags</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '60px' }}><Loader2 className={styles.spinnerIcon} size={32} /></td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>No products found.</td></tr>
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
                                            <img src={product.primary_image || product.image_url || '/assets/placeholder-image.webp'} alt={product.name} />
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
                                            <span className={styles.categoryPath}>{product.category_name || 'Equipment'}</span>
                                            {product.product_group && (
                                                <span className={styles.headingPath}>
                                                    › {product.product_group}
                                                </span>
                                            )}
                                            {product.sub_category && (
                                                <span className={styles.subCategoryPath}>
                                                    » {product.sub_category}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.price}>
                                        {product.discount_percentage > 0 ? (
                                            <div>
                                                <div className={styles.offerPrice}>
                                                    AED {Number(Number(product.offer_price) > 0 ? product.offer_price : product.price).toLocaleString()}
                                                </div>
                                                <div className={styles.discountText}>
                                                    {product.discount_percentage}% OFF
                                                </div>
                                            </div>
                                        ) : (
                                            `AED ${Number(product.price).toLocaleString()}`
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
                                            {(product.is_weekly_deal === 1 || product.is_weekly_deal === '1' || product.is_weekly_deal === true) && <span className={`${styles.tag} ${styles.tagWeekly}`}>Weekly Deal</span>}
                                            {(product.is_limited_offer === 1 || product.is_limited_offer === '1' || product.is_limited_offer === true) && <span className={`${styles.tag} ${styles.tagLimited}`}>Limited</span>}
                                            {(product.is_daily_offer === 1 || product.is_daily_offer === '1' || product.is_daily_offer === true) && <span className={`${styles.tag} ${styles.tagDaily}`}>Daily Deal</span>}
                                            {!product.is_featured && !product.is_weekly_deal && !product.is_limited_offer && !product.is_daily_offer && (
                                                <span className={styles.emptyTag}>-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={product.status === 'draft' ? styles.statusDraft : styles.statusActive}>
                                            {product.status ? product.status.charAt(0).toUpperCase() + product.status.slice(1) : 'Active'}
                                        </span>
                                    </td>
                                    <td className={styles.actions}>
                                        <button className={styles.editBtn} onClick={() => handleEditClick(product)}><Edit2 size={16} /></button>
                                        <button className={styles.deleteBtn} onClick={() => handleDeleteProduct(product.id)}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Bulk Actions Sticky Bar */}
                {selectedIds.length > 0 && (
                    <div className={styles.bulkActionsBar}>
                        <div className={styles.bulkInfo}>
                            <div className={styles.selectionCount}>
                                <strong>{selectedIds.length}</strong> products selected
                            </div>
                            <button className={styles.clearSelection} onClick={() => setSelectedIds([])}>Clear</button>
                        </div>
                        <div className={styles.bulkBtns}>
                            <button className={styles.bulkUpdateBtn} onClick={() => setIsBulkModalOpen(true)}>
                                <BarChart3 size={16} />
                                Set Offer Duration
                            </button>
                            <button className={styles.bulkDeleteStickyBtn} onClick={handleBulkDelete}>
                                <Trash2 size={16} />
                                Delete Selected
                            </button>
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
                                <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                                <p>{editingId ? `You are editing: ${stripHtml(formData.name)}` : 'Create a professional product entry for the store'}</p>
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
                                    <span>Basic Information</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'content' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('content')}
                                >
                                    <FileText size={18} />
                                    <span>Descriptions</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'pricing' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('pricing')}
                                >
                                    <Banknote size={18} />
                                    <span>Pricing & Stock</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'category' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('category')}
                                >
                                    <LayoutGrid size={18} />
                                    <span>Categories & Deals</span>
                                </button>
                                <button
                                    className={`${styles.navItem} ${activeTab === 'media' ? styles.activeNav : ''}`}
                                    onClick={() => setActiveTab('media')}
                                >
                                    <Images size={18} />
                                    <span>Product Media</span>
                                </button>
                            </div>

                            {/* Main Content Area */}
                            <form className={styles.modalContentArea} onSubmit={handleSaveProduct}>
                                <div className={styles.tabContent}>
                                    {activeTab === 'basic' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Basic Information</h3>
                                                <p>General product identifiers and names in both languages.</p>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>Product Name (English)</label>
                                                    <input type="text" name="name" required placeholder="Ex: Rational Ovens SCC 61" value={formData.name} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>اسم المنتج (Arabic)</label>
                                                    <input type="text" name="name_ar" placeholder="تفاصيل المنتج" dir="rtl" value={formData.name_ar} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>Model Number</label>
                                                    <input type="text" name="model" placeholder="Ex: SCC-61-G" value={formData.model} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Slug (Read-only)</label>
                                                    <input type="text" value={products.find(p => p.id === editingId)?.slug || 'Auto-generated'} disabled className={styles.disabledInput} />
                                                </div>
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>Related YouTube Videos</label>
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
                                                    <Plus size={16} /> Add Another Video
                                                </button>
                                            </div>

                                            <div className={styles.formGroup} style={{ marginTop: '20px' }}>
                                                <label>Resources & Downloads</label>
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
                                                    <Plus size={16} /> Add Another Resource
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'content' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Descriptions & Specs</h3>
                                                <p>Detailed storytelling and technical specifications.</p>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>Long Description (EN)</label>
                                                    <textarea name="description" rows={5} value={formData.description} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Long Description (AR)</label>
                                                    <textarea name="description_ar" rows={5} dir="rtl" value={formData.description_ar} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>Short Description (EN)</label>
                                                    <textarea name="short_description" rows={3} value={formData.short_description} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Short Description (AR)</label>
                                                    <textarea name="short_description_ar" rows={3} dir="rtl" value={formData.short_description_ar} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label>Technical Specifications</label>
                                                <textarea name="specifications" rows={4} placeholder="HTML or Plain text bullet points..." value={formData.specifications} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'pricing' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Pricing & Inventory</h3>
                                                <p>Manage prices, discounts, and real-time stock levels.</p>
                                            </div>
                                            <div className={styles.formGridFour}>
                                                <div className={styles.formGroup}>
                                                    <label>Base Price (AED)</label>
                                                    <input type="number" name="price" required step="0.01" value={formData.price} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Discount (%)</label>
                                                    <input type="number" name="discount_percentage" step="0.01" value={formData.discount_percentage} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Offer Price (AED)</label>
                                                    <input type="number" name="offer_price" step="0.01" value={formData.offer_price} onChange={handleInputChange} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Track Inventory</label>
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
                                                {formData.track_inventory && (
                                                    <div className={styles.formGroup}>
                                                        <label>Stock Quantity</label>
                                                        <input type="number" name="stock_quantity" required={formData.track_inventory} value={formData.stock_quantity} onChange={handleInputChange} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.formGroup} style={{ marginTop: '20px' }}>
                                                <label>Inventory Status</label>
                                                <div className={styles.statusSelector}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.statusOption} ${formData.status === 'active' ? styles.activeStatusActive : ''}`}
                                                        onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                                                    >
                                                        <Eye size={18} />
                                                        <span>Active (Visible)</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.statusOption} ${formData.status === 'draft' ? styles.activeStatusDraft : ''}`}
                                                        onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                                                    >
                                                        <EyeOff size={18} />
                                                        <span>Draft (Hidden)</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'category' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Categories & Marketing</h3>
                                                <p>Organize products and set special promotional deals.</p>
                                            </div>
                                            <div className={styles.formGrid}>
                                                <SearchableSelect label="Main Category" name="category_id" options={categories} value={formData.category_id} onChange={(e: any) => { handleInputChange(e); setFormData(prev => ({ ...prev, product_group: '', sub_category: '' })); }} />
                                                <SearchableSelect label="Brand" name="brand_id" options={brands} value={formData.brand_id} onChange={handleInputChange} />
                                            </div>
                                            <div className={styles.formGrid} style={{ marginTop: '15px' }}>
                                                {(() => {
                                                    const selectedCat = categories.find(c => String(c.id) === String(formData.category_id));
                                                    if (!selectedCat) return null;
                                                    const structure = CATEGORIES_STRUCTURE[selectedCat.slug];
                                                    if (!structure || Array.isArray(structure)) return null;
                                                    const headingOptions = [...(structure.left || []).map(g => g.title), ...(structure.right || []).map(g => g.title)];
                                                    if (headingOptions.length === 0) return null;
                                                    return (
                                                        <SearchableSelect label="Sub-Group" name="product_group" options={headingOptions} value={formData.product_group} onChange={(e: any) => { handleInputChange(e); setFormData(prev => ({ ...prev, sub_category: '' })); }} />
                                                    );
                                                })()}
                                                {formData.product_group && (() => {
                                                    const selectedCat = categories.find(c => String(c.id) === String(formData.category_id));
                                                    if (!selectedCat) return null;
                                                    const structure = CATEGORIES_STRUCTURE[selectedCat.slug];
                                                    if (!structure || Array.isArray(structure)) return null;
                                                    const allGroups = [...(structure.left || []), ...(structure.right || [])];
                                                    const group = allGroups.find(g => g.title === formData.product_group);
                                                    if (!group || !group.items) return null;
                                                    return (
                                                        <SearchableSelect label="Final Sub-category" name="sub_category" options={group.items} value={formData.sub_category} onChange={handleInputChange} />
                                                    );
                                                })()}
                                            </div>
                                            <div className={styles.marketingFlags}>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))} /> Featured Product</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_weekly_deal} onChange={(e) => setFormData(prev => ({ ...prev, is_weekly_deal: e.target.checked, is_limited_offer: e.target.checked ? false : prev.is_limited_offer }))} /> Weekly Deal</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_limited_offer} onChange={(e) => setFormData(prev => ({ ...prev, is_limited_offer: e.target.checked, is_weekly_deal: e.target.checked ? false : prev.is_weekly_deal }))} /> Limited Offer</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_daily_offer} onChange={(e) => setFormData(prev => ({ ...prev, is_daily_offer: e.target.checked }))} /> Daily Offer</label>
                                                <label className={styles.checkLabel}><input type="checkbox" checked={formData.is_best_seller} onChange={(e) => setFormData(prev => ({ ...prev, is_best_seller: e.target.checked }))} /> Best Seller</label>
                                            </div>
                                            {(formData.is_weekly_deal || formData.is_daily_offer || formData.is_limited_offer) && (
                                                <div className={styles.formGrid} style={{ marginTop: '15px' }}>
                                                    <div className={styles.formGroup}><label>Start Date</label><input type="datetime-local" name="offer_start" value={formData.offer_start} onChange={handleInputChange} /></div>
                                                    <div className={styles.formGroup}><label>End Date</label><input type="datetime-local" name="offer_end" value={formData.offer_end} onChange={handleInputChange} /></div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'media' && (
                                        <div className={styles.tabPane}>
                                            <div className={styles.paneHeader}>
                                                <h3>Product Media</h3>
                                                <p>High-resolution images. The first one will be the primary thumbnail.</p>
                                            </div>
                                            <div className={styles.mediaGrid}>
                                                {[formData.image_url, ...formData.additional_images].map((img, index) => (
                                                    img && (
                                                        <div key={index} className={styles.mediaItem}>
                                                            <img src={img} alt="" />
                                                            <button type="button" onClick={() => {
                                                                const currentImages = [formData.image_url, ...formData.additional_images];
                                                                currentImages.splice(index, 1);
                                                                currentImages.push('');
                                                                setFormData(prev => ({ ...prev, image_url: currentImages[0] || '', additional_images: [currentImages[1] || '', currentImages[2] || '', currentImages[3] || ''] }));
                                                            }} className={styles.removeMedia}><X size={14} /></button>
                                                            {index === 0 && <span className={styles.primaryBadge}>Primary</span>}
                                                        </div>
                                                    )
                                                ))}
                                                {(!formData.image_url || formData.additional_images.some(img => !img)) && (
                                                    <div className={styles.mediaUploadPlaceholder} onClick={() => !uploading && document.getElementById('image-upload-input')?.click()}>
                                                        <input id="image-upload-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                                                        <Upload size={24} />
                                                        <span>{uploading ? 'Processing...' : 'Upload Image'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.modalContentFooter}>
                                    <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>Cancel</button>
                                    <button type="submit" className={styles.submitBtn}>{editingId ? 'Update Product' : 'Add Product'}</button>
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
                                    <h2>Bulk Product Import</h2>
                                    <p>Upload an Excel file to add multiple products at once.</p>
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
                                        <h3><LayoutGrid size={18} /> Getting Started</h3>
                                        <ul>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>1</div>
                                                <span>Download the template file to see the required format.</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>2</div>
                                                <span>Fill in your product details in the Excel sheet.</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>3</div>
                                                <span>Columns like <strong>name</strong> and <strong>price</strong> are mandatory.</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>4</div>
                                                <span>Categories and brands will be created automatically if they don't exist.</span>
                                            </li>
                                            <li className={styles.instructionItem}>
                                                <div className={styles.instructionNumber}>5</div>
                                                <span>For multiple images, separate URLs with a comma.</span>
                                            </li>
                                        </ul>
                                        <button className={styles.downloadTemplateBtn} onClick={handleDownloadTemplate}>
                                            <FileDown size={18} />
                                            Download Excel Template
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
                                                    <p>Processing... {uploadProgress}%</p>
                                                    <div className={styles.progressWrapper}>
                                                        <div
                                                            className={styles.progressBarFill}
                                                            style={{ width: `${uploadProgress}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={styles.progressText}>Please keep this window open while the upload completes</span>
                                                </div>
                                            ) : (
                                                <div className={styles.uploadIdleState}>
                                                    <div className={styles.uploadIconCircle}>
                                                        <Upload size={32} />
                                                    </div>
                                                    <p>Click here to select your Excel file</p>
                                                    <span>Supports .xlsx and .xls formats</span>
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
                                            <div className={styles.resultLabel}>Products Imported</div>
                                        </div>
                                        <div className={styles.resultCard}>
                                            <AlertCircle size={32} color={importResult.failed > 0 ? "#ef4444" : "#dee2e6"} />
                                            <div className={styles.resultValue}>{importResult.failed}</div>
                                            <div className={styles.resultLabel}>Failed/Skipped</div>
                                        </div>
                                    </div>

                                    {importResult.errors.length > 0 && (
                                        <div className={styles.errorLog}>
                                            <h4>Error Log:</h4>
                                            <ul>
                                                {importResult.errors.map((err: string, idx: number) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className={styles.importActions}>
                                        <button className={styles.finishBtn} onClick={() => setIsImportModalOpen(false)}>
                                            Done
                                        </button>
                                        <button className={styles.tryAgainBtn} onClick={() => setImportResult(null)}>
                                            Import Another File
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
                                    <h2>Set Offer Duration</h2>
                                    <p>Updating {selectedIds.length} selected products.</p>
                                </div>
                            </div>
                            <button className={styles.bulkUpdateClose} onClick={() => setIsBulkModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.bulkUpdateBody}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Offer Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={bulkFormData.offer_start}
                                        onChange={(e) => setBulkFormData({ ...bulkFormData, offer_start: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Offer End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={bulkFormData.offer_end}
                                        onChange={(e) => setBulkFormData({ ...bulkFormData, offer_end: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px', lineHeight: '1.5' }}>
                                <strong>Note:</strong> This will apply these dates to all selected products.
                                Make sure they have a discount or offer price set to be visible in sales sections.
                            </p>
                        </div>
                        <div className={styles.modalContentFooter}>
                            <button className={styles.cancelBtn} onClick={() => setIsBulkModalOpen(false)}>Cancel</button>
                            <button
                                className={styles.submitBtn}
                                onClick={handleBulkUpdate}
                                disabled={bulkUpdating}
                            >
                                {bulkUpdating ? 'Updating...' : 'Apply to Selection'}
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
        </div>
    );
};

export default AdminProducts;
