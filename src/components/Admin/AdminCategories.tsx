'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminCategories.module.css';
import { Plus, Edit2, Trash2, X, Search, FolderTree, Image as ImageIcon, Layers, Tag, CheckCircle } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';

const AdminCategories = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [allBrands, setAllBrands] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuickAdd, setIsQuickAdd] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [brandSearchTerm, setBrandSearchTerm] = useState('');
    const [modalMainId, setModalMainId] = useState<number | string>('');
    const [additionalCategories, setAdditionalCategories] = useState<{ name: string, name_ar: string }[]>([]);
    const { showNotification } = useNotification();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        name_ar: '',
        description: '',
        image_url: '',
        is_active: true,
        type: 'main_category' as string,
        parent_id: '' as string | number,
        brands: [] as number[]
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

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

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([fetchCategories(), fetchBrands()]);
        setLoading(false);
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setCategories(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const fetchBrands = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/brands`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setAllBrands(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch brands', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value;
        setFormData(prev => ({
            ...prev,
            type: newType,
            parent_id: ''
        }));
    };

    const handleBrandToggle = (brandId: number) => {
        setFormData(prev => {
            const newBrands = prev.brands.includes(brandId)
                ? prev.brands.filter(id => id !== brandId)
                : [...prev.brands, brandId];
            return { ...prev, brands: newBrands };
        });
    };

    const handleEditClick = (category: any) => {
        setEditingId(category.id);

        let mainId = '';
        if (category.type === 'sub_category') {
            mainId = category.parent_id || '';
        } else if (category.type === 'sub_sub_category') {
            const parentSub = categories.find(c => c.id === category.parent_id);
            mainId = parentSub ? parentSub.parent_id : '';
        }
        setModalMainId(mainId);

        setFormData({
            name: category.name,
            name_ar: category.name_ar || '',
            description: category.description || '',
            image_url: category.image_url || '',
            is_active: Boolean(category.is_active),
            type: category.type || 'main_category',
            parent_id: category.parent_id || '',
            brands: Array.isArray(category.brand_ids) ? category.brand_ids : []
        });
        setIsModalOpen(true);
    };

    const handleOpenModal = (type: string = 'main_category', parentId: string | number = '') => {
        setEditingId(null);
        setIsQuickAdd(type !== 'main_category');

        let mainId = '';
        if (type === 'sub_category') {
            mainId = parentId;
        } else if (type === 'sub_sub_category') {
            const parentSub = categories.find(c => c.id === parentId);
            mainId = parentSub ? parentSub.parent_id : '';
        }
        setModalMainId(mainId);

        setFormData({
            name: '',
            name_ar: '',
            description: '',
            image_url: '',
            is_active: true,
            type,
            parent_id: parentId,
            brands: []
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setIsQuickAdd(false);
        setBrandSearchTerm('');
        setModalMainId('');
        setAdditionalCategories([]);
        setFormData({
            name: '',
            name_ar: '',
            description: '',
            image_url: '',
            is_active: true,
            type: 'main_category',
            parent_id: '',
            brands: []
        });
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `${API_BASE_URL}/categories/${editingId}`
                : `${API_BASE_URL}/categories`;
            const method = editingId ? 'PUT' : 'POST';

            // Validation: Ensure parent_id is set for sub and sub-sub categories
            if (formData.type !== 'main_category' && !formData.parent_id) {
                showNotification(
                    `Please select a parent ${formData.type === 'sub_category' ? 'Main' : 'Sub'} category first.`,
                    'error'
                );
                return;
            }

            const categoriesToSubmit = editingId
                ? [{ name: formData.name, name_ar: formData.name_ar }]
                : [{ name: formData.name, name_ar: formData.name_ar }, ...additionalCategories].filter(cat => cat.name.trim() !== '');

            let allSuccess = true;
            for (const cat of categoriesToSubmit) {
                const payload: any = {
                    name: cat.name,
                    name_ar: cat.name_ar,
                    description: formData.description,
                    image_url: formData.image_url,
                    is_active: formData.is_active ? 1 : 0,
                    type: formData.type,
                    parent_id: formData.parent_id || null,
                    brands: formData.brands
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
                if (!data.success) {
                    allSuccess = false;
                    showNotification(`Failed saving ${cat.name}: ${data.message || 'Operation failed'}`, 'error');
                }
            }

            if (allSuccess) {
                showNotification(editingId ? 'Category updated successfully!' : (categoriesToSubmit.length > 1 ? `${categoriesToSubmit.length} Categories created successfully!` : 'Category created successfully!'));
                handleCloseModal();
                fetchCategories();
            } else {
                fetchCategories();
            }
        } catch (error) {
            showNotification('An error occurred during save', 'error');
        }
    };

    const handleDeleteCategory = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Category',
            message: 'Are you sure you want to delete this category? All sub-categories under it will also be deleted. This action cannot be undone.',
            type: 'danger',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Category deleted successfully');
                        fetchCategories();
                    } else {
                        showNotification(data.message || 'Failed to delete category', 'error');
                    }
                } catch (error) {
                    showNotification('Failed to delete category', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === mainsFiltered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(mainsFiltered.map(c => c.id));
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
            const promises = selectedIds.map(id =>
                fetch(`${API_BASE_URL}/categories/${id}`, {
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
            showNotification(`Updated ${selectedIds.length} categories status`);
            setSelectedIds([]);
            fetchCategories();
        } catch (error) {
            showNotification('Failed to update categories status', 'error');
        }
    };

    const getParentOptions = () => {
        if (formData.type === 'sub_category') {
            return categories.filter(c => c.type === 'main_category');
        } else if (formData.type === 'sub_sub_category') {
            return categories.filter(c => c.type === 'sub_category');
        }
        return [];
    };

    const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

    // Group categories
    const mains = sortedCategories.filter(c => c.type === 'main_category');
    const subs = sortedCategories.filter(c => c.type === 'sub_category');
    const subSubs = sortedCategories.filter(c => c.type === 'sub_sub_category');

    // Filter main categories
    const mainsFiltered = mains.filter(main => {
        const matchesSearch = main.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && main.is_active) ||
            (statusFilter === 'inactive' && !main.is_active);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className={styles.adminCategories}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Category Management</h1>
                        <div className={styles.totalBadge}>
                            <FolderTree size={14} />
                            <span><strong>{mains.length}</strong> main categories</span>
                        </div>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.addBtn} onClick={() => {
                        setEditingId(null);
                        handleCloseModal();
                        setIsModalOpen(true);
                    }}>
                        <Plus size={20} />
                        <span>Add Main Category</span>
                    </button>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search main categories..."
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
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className={styles.bulkActions}>
                    <span>{selectedIds.length} main categories selected</span>
                    <button onClick={() => handleBulkStatusUpdate(true)}>Activate</button>
                    <button onClick={() => handleBulkStatusUpdate(false)}>Deactivate</button>
                </div>
            )}

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={mainsFiltered.length > 0 && selectedIds.length === mainsFiltered.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th style={{ width: '80px' }}>Image</th>
                            <th style={{ width: '200px' }}>Main Category</th>
                            <th>Sub Categories / Brands</th>
                            <th>Sub-Sub Categories</th>
                            <th style={{ width: '80px' }}>Status</th>
                            <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px' }}><AdminLoader message="Loading Categories..." /></td></tr>
                        ) : mainsFiltered.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No categories found.</td></tr>
                        ) : (
                            mainsFiltered.map((main) => {
                                const mainSubs = subs.filter(s => Number(s.parent_id) === main.id);
                                const mainSubSubs = subSubs.filter(ss => mainSubs.some(s => Number(ss.parent_id) === s.id));
                                const mainBrands = allBrands.filter(b => main.brand_ids?.includes(b.id));

                                return (
                                    <tr key={main.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(main.id)}
                                                onChange={() => toggleSelect(main.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className={styles.categoryImage}>
                                                {main.image_url ? (
                                                    <img src={main.image_url} alt={main.name} />
                                                ) : (
                                                    <ImageIcon size={20} color="#adb5bd" />
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.categoryName} style={{ marginBottom: '8px' }}>
                                                {main.name}
                                            </div>
                                            {mainBrands.length > 0 && (
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                                                    <strong>Brands:</strong> {mainBrands.map(b => b.name).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.tagsContainer}>
                                                {mainSubs.map(sub => (
                                                    <span
                                                        key={sub.id}
                                                        className={`${styles.tag} ${styles.editableTag}`}
                                                        onClick={() => handleEditClick(sub)}
                                                        title="Click to edit sub category"
                                                    >
                                                        {sub.name}
                                                        <div className={styles.tagActions}>
                                                            <Edit2 size={12} className={styles.tagEditIcon} />
                                                            <Trash2
                                                                size={12}
                                                                className={styles.tagDeleteIcon}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteCategory(sub.id);
                                                                }}
                                                            />
                                                        </div>
                                                    </span>
                                                ))}
                                                <button
                                                    className={styles.addSubBtn}
                                                    onClick={() => handleOpenModal('sub_category', main.id)}
                                                >
                                                    <Plus size={12} /> Add
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.tagGroup}>
                                                {mainSubs.map(sub => {
                                                    const subChildren = subSubs.filter(ss => Number(ss.parent_id) === sub.id);
                                                    return (
                                                        <div key={`group-${sub.id}`} style={{ marginBottom: '8px' }}>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>
                                                                {sub.name}
                                                            </div>
                                                            <div className={styles.tagsContainer}>
                                                                {subChildren.map(ss => (
                                                                    <span
                                                                        key={ss.id}
                                                                        className={`${styles.tag} ${styles.editableTag}`}
                                                                        onClick={() => handleEditClick(ss)}
                                                                        title="Click to edit sub-sub category"
                                                                    >
                                                                        {ss.name}
                                                                        <div className={styles.tagActions}>
                                                                            <Edit2 size={12} className={styles.tagEditIcon} />
                                                                            <Trash2
                                                                                size={12}
                                                                                className={styles.tagDeleteIcon}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteCategory(ss.id);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </span>
                                                                ))}
                                                                <button
                                                                    className={styles.addSubBtn}
                                                                    onClick={() => handleOpenModal('sub_sub_category', sub.id)}
                                                                >
                                                                    <Plus size={12} /> Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {/* If there are subs but no sub-subs yet, show a global add button for sub-subs */}
                                                {mainSubs.length > 0 && mainSubSubs.length === 0 && (
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                        No sub-sub categories yet.
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={main.is_active ? styles.statusActive : styles.statusInactive}>
                                                {main.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                                <button className={styles.editBtn} onClick={() => handleEditClick(main)} title="Edit Main Category"><Edit2 size={16} /></button>
                                                <button className={styles.deleteBtn} onClick={() => handleDeleteCategory(main.id)} title="Delete Main Category"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {/* Safety section for categories without parents */}
                    {!loading && (subs.some(s => !s.parent_id) || subSubs.some(ss => !ss.parent_id)) && (
                        <tbody>
                            <tr style={{ background: '#fff1f2' }}>
                                <td colSpan={7} style={{ padding: '12px 24px', fontSize: '13px', fontWeight: 600, color: '#e11d48' }}>
                                    ⚠️ Orphaned Categories (Missing Parent)
                                </td>
                            </tr>
                            {[...subs, ...subSubs].filter(c => !c.parent_id).map(orphan => (
                                <tr key={orphan.id}>
                                    <td></td>
                                    <td></td>
                                    <td><strong>{orphan.name}</strong> ({orphan.type})</td>
                                    <td colSpan={3} style={{ color: '#94a3b8', fontSize: '12px' }}>
                                        This category is hidden because it has no parent assigned. Click Edit to fix.
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className={styles.actions}>
                                            <button className={styles.editBtn} onClick={() => handleEditClick(orphan)} title="Fix Parent">
                                                <Edit2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingId ? 'Edit Category' : 'Add New Category'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleSaveCategory}>
                            <div className={styles.formGroup}>
                                <label>
                                    Category Placement
                                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '10px', fontWeight: 'normal' }}> (Locked for integrity)</span>
                                </label>
                                <div className={styles.selectionGrid} style={{ opacity: 0.7, pointerEvents: 'none' }}>
                                    <div
                                        className={`${styles.selectionTile} ${formData.type === 'main_category' ? styles.active : ''}`}
                                        onClick={() => {
                                            if (editingId || isQuickAdd) return;
                                            setFormData(prev => ({ ...prev, type: 'main_category', parent_id: '' }));
                                            setModalMainId('');
                                        }}
                                    >
                                        <Layers size={20} color={formData.type === 'main_category' ? '#0f172a' : '#94a3b8'} />
                                        <span>Main</span>
                                    </div>
                                    <div
                                        className={`${styles.selectionTile} ${formData.type === 'sub_category' ? styles.active : ''}`}
                                        onClick={() => {
                                            if (editingId) return;
                                            setFormData(prev => ({ ...prev, type: 'sub_category', parent_id: '' }));
                                            setModalMainId('');
                                        }}
                                    >
                                        <FolderTree size={20} color={formData.type === 'sub_category' ? '#0f172a' : '#94a3b8'} />
                                        <span>Sub</span>
                                    </div>
                                    <div
                                        className={`${styles.selectionTile} ${formData.type === 'sub_sub_category' ? styles.active : ''}`}
                                        onClick={() => {
                                            if (editingId) return;
                                            setFormData(prev => ({ ...prev, type: 'sub_sub_category', parent_id: '' }));
                                            setModalMainId('');
                                        }}
                                    >
                                        <Tag size={20} color={formData.type === 'sub_sub_category' ? '#0f172a' : '#94a3b8'} />
                                        <span>Sub-Sub</span>
                                    </div>
                                </div>
                            </div>

                            {/* Conditional Hierarchy Selection */}
                            {formData.type === 'sub_category' && (
                                <div className={styles.formGroup}>
                                    <label>Belongs to Main Category {(editingId || isQuickAdd) && <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: 'normal' }}>(Locked)</span>}</label>
                                    <div className={styles.chipGrid} style={{ opacity: (editingId || isQuickAdd) ? 0.6 : 1, pointerEvents: (editingId || isQuickAdd) ? 'none' : 'auto' }}>
                                        {categories
                                            .filter(c => c.type === 'main_category')
                                            .filter(c => isQuickAdd ? c.id === formData.parent_id : true)
                                            .map(cat => (
                                                <div
                                                    key={cat.id}
                                                    className={`${styles.chip} ${formData.parent_id === cat.id ? styles.active : ''}`}
                                                    onClick={() => setFormData(prev => ({ ...prev, parent_id: cat.id }))}
                                                >
                                                    {formData.parent_id === cat.id && <CheckCircle size={14} />}
                                                    {cat.name}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {formData.type === 'sub_sub_category' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div className={styles.formGroup}>
                                        <label>1. Pick Main Category {(editingId || isQuickAdd) && <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: 'normal' }}>(Locked)</span>}</label>
                                        <div className={styles.chipGrid} style={{ opacity: (editingId || isQuickAdd) ? 0.6 : 1, pointerEvents: (editingId || isQuickAdd) ? 'none' : 'auto' }}>
                                            {categories
                                                .filter(c => c.type === 'main_category')
                                                .filter(c => isQuickAdd ? c.id === Number(modalMainId) : true)
                                                .map(cat => (
                                                    <div
                                                        key={cat.id}
                                                        className={`${styles.chip} ${modalMainId === cat.id ? styles.active : ''}`}
                                                        onClick={() => {
                                                            setModalMainId(cat.id);
                                                            setFormData(prev => ({ ...prev, parent_id: '' }));
                                                        }}
                                                    >
                                                        {modalMainId === cat.id && <CheckCircle size={14} />}
                                                        {cat.name}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {modalMainId && (
                                        <div className={styles.formGroup} style={{ animation: 'modalIn 0.3s ease-out' }}>
                                            <label>2. Pick Sub Category {(editingId || isQuickAdd) && <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: 'normal' }}>(Locked)</span>}</label>
                                            <div className={styles.chipGrid} style={{ opacity: (editingId || isQuickAdd) ? 0.6 : 1, pointerEvents: (editingId || isQuickAdd) ? 'none' : 'auto' }}>
                                                {categories
                                                    .filter(c => c.type === 'sub_category' && c.parent_id === Number(modalMainId))
                                                    .filter(c => isQuickAdd ? c.id === formData.parent_id : true)
                                                    .map(cat => (
                                                        <div
                                                            key={cat.id}
                                                            className={`${styles.chip} ${formData.parent_id === cat.id ? styles.active : ''}`}
                                                            onClick={() => setFormData(prev => ({ ...prev, parent_id: cat.id }))}
                                                        >
                                                            {formData.parent_id === cat.id && <CheckCircle size={14} />}
                                                            {cat.name}
                                                        </div>
                                                    ))
                                                }
                                                {categories.filter(c => c.type === 'sub_category' && c.parent_id === Number(modalMainId)).length === 0 && (
                                                    <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', gridColumn: '1/-1', padding: '20px' }}>
                                                        No sub-categories found for this main category.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label>Category Name{!editingId && formData.type !== 'main_category' ? '(s)' : ''}</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            placeholder="English Name (e.g. Kitchen)"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            style={{ flex: 1 }}
                                        />
                                        <input
                                            type="text"
                                            name="name_ar"
                                            placeholder="Arabic Name (e.g. مطبخ)"
                                            value={formData.name_ar}
                                            onChange={handleInputChange}
                                            dir="rtl"
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    {!editingId && formData.type !== 'main_category' && additionalCategories.map((cat, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder={`Sub category ${i + 2} (EN)`}
                                                value={cat.name}
                                                onChange={(e) => {
                                                    const newCats = [...additionalCategories];
                                                    newCats[i].name = e.target.value;
                                                    setAdditionalCategories(newCats);
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                            <input
                                                type="text"
                                                placeholder={`Arabic Name (AR)`}
                                                value={cat.name_ar}
                                                dir="rtl"
                                                onChange={(e) => {
                                                    const newCats = [...additionalCategories];
                                                    newCats[i].name_ar = e.target.value;
                                                    setAdditionalCategories(newCats);
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAdditionalCategories(prev => prev.filter((_, idx) => idx !== i))}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
                                                title="Remove this category"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {!editingId && formData.type !== 'main_category' && (
                                        <button
                                            type="button"
                                            onClick={() => setAdditionalCategories(prev => [...prev, { name: '', name_ar: '' }])}
                                            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Plus size={14} /> Add another
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Image URL</label>
                                <input
                                    type="text"
                                    name="image_url"
                                    placeholder="https://example.com/image.jpg"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {formData.type === 'main_category' && (
                                <div className={styles.formGroup}>
                                    <label>Assign Brands (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Search brands..."
                                        value={brandSearchTerm}
                                        onChange={(e) => setBrandSearchTerm(e.target.value)}
                                        style={{ marginBottom: '8px', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                                    />
                                    <div style={{
                                        maxHeight: '160px',
                                        overflowY: 'auto',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                        gap: '8px',
                                        backgroundColor: '#f8fafc'
                                    }}>
                                        {allBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).length === 0 ? (
                                            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '10px 0', gridColumn: 'span 2' }}>
                                                No brands found matching your search.
                                            </div>
                                        ) : (
                                            allBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).map(brand => (
                                                <label key={brand.id} className={styles.checkboxLabel} style={{ fontWeight: 'normal', color: '#334155', margin: 0, padding: '4px 0' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.brands.includes(brand.id)}
                                                        onChange={() => handleBrandToggle(brand.id)}
                                                        style={{ margin: 0, width: '18px', height: '18px', minWidth: '18px', padding: 0, border: 'none' }}
                                                    />
                                                    <span style={{ fontSize: '13px', lineHeight: '1.2' }}>{brand.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

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

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    {editingId ? 'Update Category' : 'Create Category'}
                                </button>
                            </div>
                        </form>
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

export default AdminCategories;
