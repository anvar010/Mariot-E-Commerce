'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminCategories.module.css';
import { Plus, Edit2, Trash2, X, Search, FolderTree, Image as ImageIcon, Filter } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';

const AdminCategories = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const { showNotification } = useNotification();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        is_active: true
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setCategories(data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch categories', error);
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

    const handleEditClick = (category: any) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            description: category.description || '',
            image_url: category.image_url || '',
            is_active: Boolean(category.is_active)
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
            name: '',
            description: '',
            image_url: '',
            is_active: true
        });
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `${API_BASE_URL}/categories/${editingId}`
                : `${API_BASE_URL}/categories`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                credentials: "include",
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    is_active: formData.is_active ? 1 : 0
                })
            });

            const data = await res.json();

            if (data.success) {
                showNotification(editingId ? 'Category updated successfully!' : 'Category created successfully!');
                handleCloseModal();
                fetchCategories();
            } else {
                showNotification(data.message || 'Operation failed', 'error');
            }
        } catch (error) {
            showNotification('An error occurred', 'error');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Are you sure you want to delete this category? All related products might be affected.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
                method: 'DELETE',
                credentials: "include"
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
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === categories.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(categories.map(c => c.id));
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

    const filteredCategories = categories.filter(category => {
        const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && category.is_active) ||
            (statusFilter === 'inactive' && !category.is_active);

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
                            <span><strong>{categories.length}</strong> categories</span>
                        </div>
                    </div>
                    <p>Organize your products into logical categories for better navigation.</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.addBtn} onClick={() => {
                        setEditingId(null);
                        handleCloseModal();
                        setIsModalOpen(true);
                    }}>
                        <Plus size={20} />
                        <span>Add New Category</span>
                    </button>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search categories by name..."
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

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={categories.length > 0 && selectedIds.length === categories.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th style={{ width: '80px' }}>Image</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading categories...</td></tr>
                        ) : filteredCategories.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No categories found.</td></tr>
                        ) : (
                            filteredCategories.map((category) => (
                                <tr key={category.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(category.id)}
                                            onChange={() => toggleSelect(category.id)}
                                        />
                                    </td>
                                    <td>
                                        <div className={styles.categoryImage}>
                                            {category.image_url ? (
                                                <img src={category.image_url} alt={category.name} />
                                            ) : (
                                                <ImageIcon size={20} color="#adb5bd" />
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.categoryName}>{category.name}</span>
                                    </td>
                                    <td>
                                        <p className={styles.descriptionText}>{category.description || 'No description'}</p>
                                    </td>
                                    <td>
                                        <span className={category.is_active ? styles.statusActive : styles.statusInactive}>
                                            {category.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                            <button className={styles.editBtn} onClick={() => handleEditClick(category)}><Edit2 size={16} /></button>
                                            <button className={styles.deleteBtn} onClick={() => handleDeleteCategory(category.id)}><Trash2 size={16} /></button>
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
                            <h2>{editingId ? 'Edit Category' : 'Add New Category'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleSaveCategory}>
                            <div className={styles.formGroup}>
                                <label>Category Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. Kitchen Equipment"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    placeholder="Brief description of the category..."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={4}
                                />
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
        </div>
    );
};

export default AdminCategories;
