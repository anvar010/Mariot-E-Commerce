'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminCoupons.module.css';
import { Tag, Plus, Search, Edit2, Trash2, X, Calendar, Percent, Package } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [brands, setBrands] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const { showNotification } = useNotification();

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

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage', // percentage or fixed
        discount_value: '',
        expiry_date: '',
        usage_limit: '',
        min_order_amount: '0',
        is_active: true,
        applicable_brands: [] as string[],
        applicable_products: [] as string[]
    });

    useEffect(() => {
        fetchCoupons();
        fetchBrands();
        fetchProducts();
    }, []);

    const fetchBrands = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/brands`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setBrands(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch brands', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/products?limit=1000`, { credentials: "include", headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    const fetchCoupons = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/coupons`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (data.success && data.data) {
                setCoupons(data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch coupons', error);
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleEditClick = (coupon: any) => {
        setEditingId(coupon.id);
        setFormData({
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            expiry_date: coupon.expiry_date ? new Date(coupon.expiry_date).toISOString().split('T')[0] : '', // Format for date input
            usage_limit: coupon.usage_limit,
            min_order_amount: coupon.min_order_amount || '0',
            is_active: Boolean(coupon.is_active),
            applicable_brands: coupon.applicable_brands ? JSON.parse(coupon.applicable_brands) : [],
            applicable_products: coupon.applicable_products ? JSON.parse(coupon.applicable_products) : []
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
            code: '',
            discount_type: 'percentage',
            discount_value: '',
            expiry_date: '',
            usage_limit: '',
            min_order_amount: '0',
            is_active: true,
            applicable_brands: [],
            applicable_products: []
        });
        setProductSearch('');
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `${API_BASE_URL}/coupons/${editingId}`
                : `${API_BASE_URL}/coupons`;
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
                    discount_value: Number(formData.discount_value),
                    usage_limit: Number(formData.usage_limit),
                    min_order_amount: Number(formData.min_order_amount),
                    is_active: formData.is_active ? 1 : 0,
                    applicable_brands: formData.applicable_brands.length > 0
                        ? JSON.stringify(formData.applicable_brands)
                        : null,
                    applicable_products: formData.applicable_products.length > 0
                        ? JSON.stringify(formData.applicable_products)
                        : null
                })
            });

            const data = await res.json();

            if (data.success) {
                showNotification(editingId ? 'Coupon updated successfully!' : 'Coupon created successfully!');
                handleCloseModal();
                fetchCoupons(); // Refresh list
            } else {
                showNotification(data.message || 'Operation failed', 'error');
            }
        } catch (error) {
            showNotification('An error occurred', 'error');
        }
    };

    const handleDeleteCoupon = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Coupon',
            message: 'Are you sure you want to delete this discount coupon? This action cannot be undone.',
            type: 'danger',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/coupons/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Coupon deleted');
                        fetchCoupons(); // Refresh
                    } else {
                        showNotification('Failed to delete coupon', 'error');
                    }
                } catch (error) {
                    showNotification('Failed to delete coupon', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const toggleBrand = (brandName: string) => {
        const current = [...formData.applicable_brands];
        const idx = current.indexOf(brandName);
        if (idx > -1) {
            current.splice(idx, 1);
        } else {
            current.push(brandName);
        }
        setFormData(prev => ({ ...prev, applicable_brands: current }));
    };

    const toggleProduct = (productName: string) => {
        const current = [...formData.applicable_products];
        const idx = current.indexOf(productName);
        if (idx > -1) {
            current.splice(idx, 1);
        } else {
            current.push(productName);
        }
        setFormData(prev => ({ ...prev, applicable_products: current }));
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.brand?.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 50); // Show top 50 matches

    return (
        <div className={styles.adminCoupons}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Coupon Management</h1>
                        <div className={styles.totalBadge}>
                            <Tag size={14} />
                            <span><strong>{coupons.length}</strong> coupons</span>
                        </div>
                    </div>
                    <p>Create and manage discount codes for your customers and marketing campaigns.</p>
                </div>
                <button className={styles.addBtn} onClick={() => {
                    setEditingId(null);
                    handleCloseModal();
                    setIsModalOpen(true);
                }}>
                    <Plus size={20} />
                    <span>Create New Coupon</span>
                </button>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Discount</th>
                            <th>Expiry Date</th>
                            <th>Applicable For</th>
                            <th>Usage</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px' }}><AdminLoader message="Loading Coupons Catalog..." /></td></tr>
                        ) : coupons.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No coupons found.</td></tr>
                        ) : (
                            coupons.map((coupon) => (
                                <tr key={coupon.id}>
                                    <td>
                                        <span className={styles.couponCode}>{coupon.code}</span>
                                    </td>
                                    <td>
                                        <span className={styles.discountBadge}>
                                            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `AED ${coupon.discount_value} OFF`}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                                            <Calendar size={14} />
                                            {new Date(coupon.expiry_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.restrictionsCol}>
                                            {coupon.applicable_brands ? (
                                                <div className={styles.restrictionRow}>
                                                    <strong>Brands:</strong>
                                                    <div className={styles.miniList}>
                                                        {JSON.parse(coupon.applicable_brands).map((b: string) => (
                                                            <span key={b} className={styles.brandTag}>{b}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                            {coupon.applicable_products ? (
                                                <div className={styles.restrictionRow}>
                                                    <strong>Products:</strong>
                                                    <div className={styles.miniList}>
                                                        {JSON.parse(coupon.applicable_products).map((p: string) => (
                                                            <span key={p} className={styles.productTag}>{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                            {!coupon.applicable_brands && !coupon.applicable_products && (
                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Site-wide</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.usageBadge}>
                                            {coupon.used_count || 0} / {coupon.usage_limit || '∞'}
                                        </span>
                                    </td>
                                    <td>
                                        {(coupon.expiry_date && new Date(coupon.expiry_date).getTime() < new Date().setHours(0, 0, 0, 0)) ? (
                                            <span className={styles.statusExpired}>Expired</span>
                                        ) : (
                                            <span className={coupon.is_active ? styles.statusActive : styles.statusInactive}>
                                                {coupon.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                            <button className={styles.editBtn} onClick={() => handleEditClick(coupon)}><Edit2 size={16} /></button>
                                            <button className={styles.deleteBtn} onClick={() => handleDeleteCoupon(coupon.id)}><Trash2 size={16} /></button>
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
                            <h2>{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleSaveCoupon}>
                            <div className={styles.scrollableContent}>
                                <div className={styles.formSection}>
                                    <div className={styles.formGroup}>
                                        <label>Coupon Code</label>
                                        <input
                                            type="text"
                                            name="code"
                                            required
                                            placeholder="e.g. SUMMER2024"
                                            value={formData.code}
                                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className={styles.formGroup}>
                                            <label>Discount Type</label>
                                            <select name="discount_type" value={formData.discount_type} onChange={handleInputChange}>
                                                <option value="percentage">Percentage (%)</option>
                                                <option value="fixed">Fixed Amount (AED)</option>
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Discount Value</label>
                                            <input
                                                type="number"
                                                name="discount_value"
                                                required
                                                min="0"
                                                placeholder="e.g. 20"
                                                value={formData.discount_value}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Expiry Date</label>
                                        <input
                                            type="date"
                                            name="expiry_date"
                                            required
                                            value={formData.expiry_date}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className={styles.formGroup}>
                                            <label>Usage Limit (Total)</label>
                                            <input
                                                type="number"
                                                name="usage_limit"
                                                placeholder="e.g. 100"
                                                value={formData.usage_limit}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Min. Order Amount (AED)</label>
                                            <input
                                                type="number"
                                                name="min_order_amount"
                                                placeholder="e.g. 50"
                                                value={formData.min_order_amount}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>

                                    {/* Brand Selection */}
                                    <div className={styles.formGroup}>
                                        <label>Applicable Brands (Optional)</label>
                                        <div className={styles.selectionBox}>
                                            {brands.map(brand => (
                                                <label key={brand.id} className={styles.checkboxItem}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.applicable_brands.includes(brand.name)}
                                                        onChange={() => toggleBrand(brand.name)}
                                                    />
                                                    <span>{brand.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Product Selection */}
                                    <div className={styles.formGroup}>
                                        <label>Applicable Products (Optional)</label>
                                        <div className={styles.searchWrapper}>
                                            <Search size={14} className={styles.searchIcon} />
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                className={styles.pSearchInput}
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.selectionBox}>
                                            {filteredProducts.length > 0 ? (
                                                filteredProducts.map(product => (
                                                    <label key={product.id} className={styles.checkboxItem}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.applicable_products.includes(product.name)}
                                                            onChange={() => toggleProduct(product.name)}
                                                        />
                                                        <div className={styles.productInfo}>
                                                            <span className={styles.pName}>{product.name}</span>
                                                            <span className={styles.pBrand}>{product.brand}</span>
                                                        </div>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className={styles.emptySearch}>No products found</div>
                                            )}
                                        </div>
                                        <div className={styles.selectedCount}>
                                            {formData.applicable_products.length} products selected
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    {editingId ? 'Update Coupon' : 'Create Coupon'}
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

export default AdminCoupons;
