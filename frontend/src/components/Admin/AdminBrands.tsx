'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminBrands.module.css';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, ExternalLink, Globe, Search, Filter } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { resolveUrl } from '@/utils/resolveUrl';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';

const AdminBrands = () => {
    const [brands, setBrands] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [bannerMobileFile, setBannerMobileFile] = useState<File | null>(null);
    const [bannerMobilePreview, setBannerMobilePreview] = useState<string | null>(null);
    const { showNotification } = useNotification();

    const categoryOptions = [
        "Cooking", "Refrigeration-line", "Coffee & Bar", "Bakery", "Food Processing", "Snack Maker", "Laundry & Dish Washer", "Super Market", "Dry Store"
    ];

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        image_url: '',
        banner_url: '',
        banner_url_mobile: '',
        website_url: '',
        is_active: true,
        brand_type: ''
    });

    useEffect(() => {
        fetchBrands();
    }, []);

    // Selection state
    const [isActionLoading, setIsActionLoading] = useState(false);

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

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/brands`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setBrands(data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch brands', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setBannerPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleBannerMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerMobileFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setBannerMobilePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleEditClick = (brand: any) => {
        setEditingId(brand.id);
        setFormData({
            name: brand.name,
            name_ar: brand.name_ar || '',
            description: brand.description || '',
            description_ar: brand.description_ar || '',
            image_url: brand.image_url || '',
            banner_url: brand.banner_url || '',
            banner_url_mobile: brand.banner_url_mobile || '',
            website_url: brand.website_url || '',
            is_active: Boolean(brand.is_active),
            brand_type: brand.brand_type || ''
        });
        setLogoPreview(brand.image_url || null);
        setLogoFile(null);
        setBannerPreview(brand.banner_url || null);
        setBannerFile(null);
        setBannerMobilePreview(brand.banner_url_mobile || null);
        setBannerMobileFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
            name: '',
            name_ar: '',
            description: '',
            description_ar: '',
            image_url: '',
            banner_url: '',
            banner_url_mobile: '',
            website_url: '',
            is_active: true,
            brand_type: ''
        });
        setLogoPreview(null);
        setLogoFile(null);
        setBannerPreview(null);
        setBannerFile(null);
        setBannerMobilePreview(null);
        setBannerMobileFile(null);
    };

    const handleCategoryToggle = (cat: string) => {
        setFormData(prev => {
            const currentTypes = prev.brand_type ? prev.brand_type.split(',').map(s => s.trim()) : [];
            const newTypes = currentTypes.includes(cat)
                ? currentTypes.filter(t => t !== cat)
                : [...currentTypes, cat];
            return { ...prev, brand_type: newTypes.join(', ') };
        });
    };

    const handleSaveBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            let currentImageUrl = formData.image_url;
            let currentBannerUrl = formData.banner_url;

            const uploadImage = async (file: File) => {
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch(`${API_BASE_URL}/upload/image?folder=brands`, {
                    method: 'POST', credentials: "include", body: fd, headers: getAuthHeaders()
                });
                return res.json();
            };

            if (logoFile) {
                const uploadData = await uploadImage(logoFile);
                if (uploadData.success) {
                    currentImageUrl = uploadData.data;
                } else {
                    showNotification(uploadData.message || 'Logo upload failed', 'error');
                    setLoading(false);
                    return;
                }
            }

            if (bannerFile) {
                const uploadData = await uploadImage(bannerFile);
                if (uploadData.success) {
                    currentBannerUrl = uploadData.data;
                } else {
                    showNotification(uploadData.message || 'Banner upload failed', 'error');
                    setLoading(false);
                    return;
                }
            }

            let currentBannerMobileUrl = formData.banner_url_mobile;
            if (bannerMobileFile) {
                const uploadData = await uploadImage(bannerMobileFile);
                if (uploadData.success) {
                    currentBannerMobileUrl = uploadData.data;
                } else {
                    showNotification(uploadData.message || 'Mobile banner upload failed', 'error');
                    setLoading(false);
                    return;
                }
            }

            const url = editingId
                ? `${API_BASE_URL}/brands/${editingId}`
                : `${API_BASE_URL}/brands`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                credentials: "include",
                method,
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    image_url: currentImageUrl,
                    banner_url: currentBannerUrl,
                    banner_url_mobile: currentBannerMobileUrl,
                    is_active: formData.is_active ? 1 : 0
                })
            });

            const data = await res.json();

            if (data.success) {
                showNotification(editingId ? 'Brand updated successfully!' : 'Brand created successfully!');
                handleCloseModal();
                fetchBrands();
            } else {
                showNotification(data.message || 'Operation failed', 'error');
            }
            setLoading(false);
        } catch (error) {
            console.error(error);
            showNotification('An error occurred', 'error');
            setLoading(false);
        }
    };

    const handleDeleteBrand = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Brand',
            message: 'Are you sure you want to delete this brand? This action cannot be undone.',
            confirmLabel: 'Delete',
            type: 'danger',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/brands/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Brand deleted successfully');
                        fetchBrands();
                    } else {
                        showNotification(data.message || 'Failed to delete brand', 'error');
                    }
                } catch (error) {
                    showNotification('Failed to delete brand', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Bulk Delete Brands',
            message: `Are you sure you want to delete ${selectedIds.length} selected brands? This action cannot be undone.`,
            confirmLabel: 'Delete All',
            type: 'danger',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/brands`, {
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
                        showNotification(`Successfully deleted ${selectedIds.length} brands`);
                        setSelectedIds([]);
                        fetchBrands();
                    } else {
                        showNotification(data.message || 'Bulk delete failed', 'error');
                    }
                } catch (error) {
                    showNotification('An error occurred during bulk delete', 'error');
                } finally {
                    setLoading(false);
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === brands.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(brands.map(b => b.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkStatusUpdate = async (active: boolean) => {
        if (selectedIds.length === 0) return;
        try {
            // We'll update individually for now as there's no bulk endpoint, 
            // but for better UX we'll wait for all to complete
            const promises = selectedIds.map(id =>
                fetch(`${API_BASE_URL}/brands/${id}`, {
                    credentials: "include",
                    method: 'PUT',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ is_active: active ? 1 : 0 })
                })
            );

            await Promise.all(promises);
            showNotification(`Updated ${selectedIds.length} brands status`);
            setSelectedIds([]);
            fetchBrands();
        } catch (error) {
            showNotification('Failed to update brands status', 'error');
        }
    };

    const [failedLogos, setFailedLogos] = useState<Record<number, boolean>>({});

    const filteredBrands = brands.filter(brand => {
        const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && brand.is_active) ||
            (statusFilter === 'inactive' && !brand.is_active);

        return matchesSearch && matchesStatus;
    });

    return (
        <div className={styles.adminBrands}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Brand Management</h1>
                        <div className={styles.totalBadge}>
                            <Globe size={14} />
                            <span><strong>{brands.length}</strong> brands</span>
                        </div>
                    </div>
                    <p>Manage your collection of partner brands and manufacturers.</p>
                </div>
                <div className={styles.headerActions}>
                    {selectedIds.length > 0 && (
                        <button className={styles.bulkDeleteBtn} onClick={handleBulkDelete}>
                            <Trash2 size={18} />
                            <span>Delete ({selectedIds.length})</span>
                        </button>
                    )}
                    <button className={styles.addBtn} onClick={() => {
                        setEditingId(null);
                        handleCloseModal();
                        setIsModalOpen(true);
                    }}>
                        <Plus size={20} />
                        <span>Add New Brand</span>
                    </button>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search brands by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.filterBox}>
                    <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Brands</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={brands.length > 0 && selectedIds.length === brands.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th style={{ width: '80px' }}>Logo</th>
                            <th>Brand Name</th>
                            <th>Description</th>
                            <th>Website</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px' }}><AdminLoader message="Loading Brands Catalog..." /></td></tr>
                        ) : filteredBrands.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No brands found.</td></tr>
                        ) : (
                            filteredBrands.map((brand) => (
                                <tr key={brand.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(brand.id)}
                                            onChange={() => toggleSelect(brand.id)}
                                        />
                                    </td>
                                    <td>
                                        <div className={styles.brandLogo}>
                                            {brand.image_url && !failedLogos[brand.id] ? (
                                                <img
                                                    src={resolveUrl(brand.image_url)}
                                                    alt={brand.name}
                                                    onError={() => setFailedLogos(prev => ({ ...prev, [brand.id]: true }))}
                                                />
                                            ) : (
                                                <div className={styles.logoPlaceholder}>
                                                    <span className={styles.logoInitials}>
                                                        {brand.name.substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.brandName}>{brand.name}</span>
                                    </td>
                                    <td>
                                        <p className={styles.descriptionText}>{brand.description || 'No description'}</p>
                                    </td>
                                    <td>
                                        {brand.website_url ? (
                                            <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                                                <Globe size={14} />
                                                <span>Visit Site</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <span className={brand.is_active ? styles.statusActive : styles.statusInactive}>
                                            {brand.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                            <button className={styles.editBtn} onClick={() => handleEditClick(brand)}><Edit2 size={16} /></button>
                                            <button className={styles.deleteBtn} onClick={() => handleDeleteBrand(brand.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingId ? 'Edit Brand' : 'Add New Brand'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleSaveBrand}>
                            <div className={styles.formLeft}>
                                <div className={styles.formGroup}>
                                    <label>Brand Name (English)</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        placeholder="e.g. Samsung"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Brand Name (Arabic)</label>
                                    <input
                                        type="text"
                                        name="name_ar"
                                        placeholder="اسم العلامة التجارية باللغة العربية"
                                        value={formData.name_ar}
                                        onChange={handleInputChange}
                                        dir="rtl"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Description (English)</label>
                                    <textarea
                                        name="description"
                                        placeholder="Brief background about the brand..."
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={6}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Description (Arabic)</label>
                                    <textarea
                                        name="description_ar"
                                        placeholder="وصف العلامة التجارية باللغة العربية"
                                        value={formData.description_ar}
                                        onChange={handleInputChange}
                                        rows={6}
                                        dir="rtl"
                                    />
                                </div>
                            </div>

                            <div className={styles.formRight}>
                                <div className={styles.imageUploadsRow}>
                                    <div className={styles.formGroup}>
                                        <label>Brand Logo</label>
                                        <div className={styles.fileUploadWrapper}>
                                            {logoPreview ? (
                                                <div className={styles.previewContainer}>
                                                    <img src={resolveUrl(logoPreview)} alt="Preview" className={styles.previewImage} />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setLogoPreview(null); setLogoFile(null); }}
                                                        className={styles.removeFileBtn}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className={styles.fileLabel}>
                                                    <Plus size={24} />
                                                    <span>Click to upload brand logo</span>
                                                    <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Brand Banner</label>
                                        <div className={`${styles.fileUploadWrapper} ${styles.bannerUploadWrapper}`}>
                                            {bannerPreview ? (
                                                <div className={styles.bannerPreviewContainer}>
                                                    <img src={resolveUrl(bannerPreview)} alt="Banner Preview" className={styles.bannerPreviewImage} />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setBannerPreview(null); setBannerFile(null); }}
                                                        className={styles.bannerRemoveBtn}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className={styles.fileLabel}>
                                                    <Plus size={24} />
                                                    <span>Click to upload brand banner</span>
                                                    <span className={styles.uploadHint}>Recommended: 1400 × 150 px</span>
                                                    <input type="file" accept="image/*" onChange={handleBannerChange} hidden />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Mobile Banner <span className={styles.uploadHint}>(optional — shown on phones)</span></label>
                                    <div className={styles.fileUploadWrapper}>
                                        {bannerMobilePreview ? (
                                            <div className={styles.bannerPreviewContainer}>
                                                <img src={resolveUrl(bannerMobilePreview)} alt="Mobile Banner Preview" className={styles.bannerPreviewImage} />
                                                <button
                                                    type="button"
                                                    onClick={() => { setBannerMobilePreview(null); setBannerMobileFile(null); }}
                                                    className={styles.bannerRemoveBtn}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className={styles.fileLabel} style={{ height: '90px' }}>
                                                <Plus size={20} />
                                                <span>Click to upload mobile banner</span>
                                                <span className={styles.uploadHint}>Recommended: 800 × 120 px</span>
                                                <input type="file" accept="image/*" onChange={handleBannerMobileChange} hidden />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Website URL</label>
                                    <input
                                        type="text"
                                        name="website_url"
                                        placeholder="https://www.brandwebsite.com"
                                        value={formData.website_url}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Brand Categories</label>
                                    <div className={styles.categoryCheckboxes}>
                                        {categoryOptions.map(cat => (
                                            <label key={cat} className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.brand_type ? formData.brand_type.split(',').map(s => s.trim()).includes(cat) : false}
                                                    onChange={() => handleCategoryToggle(cat)}
                                                />
                                                <span>{cat}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                        />
                                        <span>Active Status</span>
                                    </label>
                                </div>
                            </div>
                        </form>
                        <div className={styles.modalFooter}>
                            <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.submitBtn}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSaveBrand(e as any);
                                }}
                            >
                                {editingId ? 'Update Brand' : 'Create Brand'}
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
                type={confirmModal.type}
                isLoading={isActionLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default AdminBrands;
