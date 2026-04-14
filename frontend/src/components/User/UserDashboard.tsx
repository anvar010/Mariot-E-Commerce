'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './UserDashboard.module.css';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/context/NotificationContext';
import {
    Package,
    Heart,
    Coins,
    User,
    FileText,
    MapPin,
    CreditCard,
    LogOut,
    Inbox,
    Trash2,
    ShoppingCart,
    X,
    ChevronLeft,
    Store,
    Phone,
    Edit2,
    Calendar,
    Download,
    Banknote,
    Check
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL, BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';

const UserDashboard = () => {
    const t = useTranslations('userDashboard');
    const { user, logout, updateUser, loading: authLoading } = useAuth();
    const { wishlistItems, removeFromWishlist } = useWishlist();
    const { addToCart, pointRate } = useCart();
    const { showNotification } = useNotification();
    const router = useRouter();
    const locale = useLocale();

    const [activeSection, setActiveSection] = useState('yourOrders');
    const [activeTab, setActiveTab] = useState('All Orders');

    const [profileTab, setProfileTab] = useState('Personal Info');
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phone_number: user?.phone_number || '',
        company_name: user?.company_name || '',
        vat_number: user?.vat_number || '',
        email: user?.email || '',
        password: ''
    });

    const [saving, setSaving] = useState(false);

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('127.0.0.1:5000')) {
            return url.replace('http://127.0.0.1:5000', BASE_URL);
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Update formData when user changes (after context update)
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                phone_number: user.phone_number || '',
                company_name: user.company_name || '',
                vat_number: user.vat_number || '',
                email: user.email || ''
            }));
            fetchOrders();
            fetchAddresses();
        }
    }, [user]);

    // Fetch quotations when that section becomes active
    useEffect(() => {
        if (activeSection === 'quotations' && user) {
            fetchQuotations();
        }
    }, [activeSection, user]);

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const fetchQuotations = async () => {
        setLoadingQuotations(true);
        try {
            const response = await fetch(`${API_BASE_URL}/quotations/my-quotations`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setQuotations(data.data);
            }
        } catch (error) {
            console.error('Error fetching quotations:', error);
        } finally {
            setLoadingQuotations(false);
        }
    };

    const handleDeleteQuotation = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: t('quotations.deleteTitle') || 'Delete Quotation',
            message: t('quotations.confirmDelete'),
            type: 'danger',
            confirmLabel: t('quotations.delete') || 'Delete',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const response = await fetch(`${API_BASE_URL}/quotations/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await response.json();
                    if (data.success) {
                        setQuotations(quotations.filter(q => q.id !== id));
                        showNotification(t('quotations.deleteSuccess'));
                    }
                } catch (error) {
                    console.error('Error deleting quotation:', error);
                    showNotification(t('quotations.deleteError'), 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDownloadQuotation = async (quotation: any) => {
        setIsDownloadingId(quotation.id);
        try {
            const { generateQuotationPDF } = await import('@/utils/pdfGenerator');
            await generateQuotationPDF(quotation, true);
        } catch (error) {
            console.error('Error downloading quotation:', error);
            showNotification(t('profile.pdfGenerateError'), 'error');
        } finally {
            setIsDownloadingId(null);
        }
    };

    const handleViewQuotation = async (quotation: any) => {
        setIsViewingId(quotation.id);
        try {
            const { generateQuotationPDF } = await import('@/utils/pdfGenerator');
            await generateQuotationPDF(quotation);
        } catch (error) {
            console.error('Error viewing quotation:', error);
            showNotification(t('profile.pdfGenerateError'), 'error');
        } finally {
            setIsViewingId(null);
        }
    };

    const fetchAddresses = async () => {
        setLoadingAddresses(true);
        try {
            const response = await fetch(`${API_BASE_URL}/users/addresses`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setAddresses(data.data);
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
        } finally {
            setLoadingAddresses(false);
        }
    };

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = editingAddressId ? 'PUT' : 'POST';
            const url = editingAddressId
                ? `${API_BASE_URL}/users/addresses/${editingAddressId}`
                : `${API_BASE_URL}/users/addresses`;

            const response = await fetch(url, {
                method,
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addressForm),
                credentials: "include"
            });
            const data = await response.json();
            if (data.success) {
                const isNowDefault = addressForm.is_default;

                let baseAddresses = addresses;
                if (isNowDefault) {
                    baseAddresses = addresses.map(a => ({ ...a, is_default: false }));
                }

                if (editingAddressId) {
                    setAddresses(baseAddresses.map(a => a.id === editingAddressId ? data.data : a));
                } else {
                    setAddresses([...baseAddresses, data.data]);
                }
                setShowAddressForm(false);
                setEditingAddressId(null);
                setAddressForm({
                    first_name: '',
                    last_name: '',
                    company_name: '',
                    email: '',
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: 'UAE',
                    zip_code: '',
                    country: 'United Arab Emirates',
                    phone: '',
                    is_default: false
                });
                setMessage({ type: 'success', text: editingAddressId ? t('addresses.success') : t('addresses.addSuccess') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: editingAddressId ? t('addresses.error') : t('addresses.addError') });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleEditAddress = (addr: any) => {
        setEditingAddressId(addr.id);
        setAddressForm({
            first_name: addr.first_name || '',
            last_name: addr.last_name || '',
            company_name: addr.company_name || '',
            email: addr.email || '',
            address_line1: addr.address_line1 || '',
            address_line2: addr.address_line2 || '',
            city: addr.city || '',
            state: addr.state || 'UAE',
            zip_code: addr.zip_code || '',
            country: addr.country || 'United Arab Emirates',
            phone: addr.phone || '',
            is_default: addr.is_default || false
        });
        setShowAddressForm(true);
    };

    const handleDeleteAddress = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: t('addresses.deleteTitle') || 'Delete Address',
            message: t('addresses.confirmDelete'),
            type: 'danger',
            confirmLabel: t('addresses.delete') || 'Delete',
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const response = await fetch(`${API_BASE_URL}/users/addresses/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await response.json();
                    if (data.success) {
                        setAddresses(addresses.filter(a => a.id !== id));
                        showNotification(t('addresses.removeSuccess'));
                    }
                } catch (error) {
                    console.error('Error deleting address:', error);
                    showNotification(t('addresses.removeError'), 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [quotations, setQuotations] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loadingQuotations, setLoadingQuotations] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [isViewingId, setIsViewingId] = useState<number | null>(null);
    const [isDownloadingId, setIsDownloadingId] = useState<number | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
    const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressForm, setAddressForm] = useState({
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: 'UAE',
        zip_code: '',
        country: 'United Arab Emirates',
        phone: '',
        is_default: false
    });

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

    const tabs = ['All Orders', 'Open', 'Cancelled', 'Delivered'];
    const tabTranslations: Record<string, string> = {
        'All Orders': t('orders.allOrders'),
        'Open': t('orders.open'),
        'Cancelled': t('orders.cancelled'),
        'Delivered': t('orders.delivered'),
        'Personal Info': t('profile.personalInfo'),
        'Bussiness Info': t('profile.businessInfo'),
        'Sign-in Info': t('profile.signInInfo')
    };

    const navItems = [
        { name: 'myRewards', translationName: t('nav.myRewards'), icon: <Coins size={20} /> },
        { name: 'yourOrders', translationName: t('nav.yourOrders'), icon: <Package size={20} /> },
        { name: 'favorites', translationName: t('nav.favorites'), icon: <Heart size={20} /> },
        { name: 'profileSecurity', translationName: t('nav.profileSecurity'), icon: <User size={20} /> },
        { name: 'quotations', translationName: t('nav.quotations'), icon: <FileText size={20} /> },
        { name: 'addresses', translationName: t('nav.addresses'), icon: <MapPin size={20} /> },
        { name: 'payments', translationName: t('nav.payments'), icon: <CreditCard size={20} /> },
        ...(['seller', 'admin'].includes(user?.role) ? [{ name: 'sellerDashboard', translationName: t('nav.sellerDashboard'), icon: <Store size={20} /> }] : []),
    ];

    if (authLoading) return <Loader fullPage={true} />;
    if (!user) return null;

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await updateUser(formData);
            setMessage({ type: 'success', text: t('profile.updateSuccess') });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || t('profile.updateError') });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const renderContent = () => {
        if (activeSection === 'favorites') {
            return (
                <div className={styles.wishlistContainer}>
                    <h2 className={styles.sectionTitle}>{t('favorites.title', { count: wishlistItems.length })}</h2>
                    {wishlistItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}><Heart size={60} strokeWidth={1} /></div>
                            <h3 className={styles.emptyText}>{t('favorites.noFavorites')}</h3>
                            <Link href="/" className={styles.shoppingBtn}>{t('favorites.exploreProducts')}</Link>
                        </div>
                    ) : (
                        <div className={styles.wishlistGrid}>
                            {wishlistItems.map((item) => (
                                <div key={item.id} className={styles.wishlistItem}>
                                    <Link href={`/product/${item.id}`}>
                                        <div className={styles.itemImage}>
                                            <img src={resolveUrl(item.image)} alt={item.name} style={{ cursor: 'pointer' }} />
                                        </div>
                                    </Link>
                                    <div className={styles.itemInfo}>
                                        <Link href={`/product/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <span className={styles.itemName} style={{ cursor: 'pointer' }}>
                                                {item.name}
                                            </span>
                                        </Link>
                                        <p className={styles.itemBrand}>{item.brand}</p>
                                        <div className={styles.itemPrice}>AED {item.price.toLocaleString()}</div>
                                        <div className={styles.itemActions}>
                                            <button
                                                className={styles.addToCartBtn}
                                                onClick={() => addToCart({
                                                    id: item.id,
                                                    name: item.name,
                                                    price: item.price,
                                                    image: item.image,
                                                    brand: item.brand,
                                                    stock_quantity: item.stock_quantity
                                                })}
                                            >
                                                <ShoppingCart size={18} /> {t('favorites.addToCart')}
                                            </button>
                                            <button
                                                className={styles.removeBtn}
                                                onClick={() => removeFromWishlist(item.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (activeSection === 'yourOrders') {
            if (selectedOrder) {
                return (
                    <div className={styles.orderDetailsSection}>
                        <button
                            className={styles.backBtn}
                            onClick={() => setSelectedOrder(null)}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', fontWeight: '500', ...(locale === 'ar' ? { flexDirection: 'row-reverse' } : {}) }}
                        >
                            <ChevronLeft size={16} style={locale === 'ar' ? { transform: 'rotate(180deg)' } : {}} /> {t('orders.backToOrders')}
                        </button>

                        <h2 className={styles.sectionTitle} style={{ marginBottom: '5px' }}>{t('orders.orderNumber')}{selectedOrder.id}</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                            {t('orders.placedOn')} {new Date(selectedOrder.created_at).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </p>

                        <div style={{ background: '#f8fafc', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{t('orders.status')}</strong>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    backgroundColor: selectedOrder.status === 'delivered' ? '#dcfce7' : selectedOrder.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                                    color: selectedOrder.status === 'delivered' ? '#166534' : selectedOrder.status === 'cancelled' ? '#991b1b' : '#92400e',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>
                                    {t(`orders.${selectedOrder.status}`)}
                                </span>
                            </div>
                            <div>
                                <strong style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{t('orders.paymentMethod')}</strong>
                                <span style={{ fontWeight: '600', textTransform: 'uppercase', fontSize: '14px' }}>{selectedOrder.payment_method === 'card' ? t('orders.card') : t('orders.bankTransfer')}</span>
                            </div>
                            <div>
                                <strong style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{t('orders.totalAmount')}</strong>
                                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>AED {parseFloat(selectedOrder.final_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>{t('orders.itemsInOrder')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                            {selectedOrder.items && selectedOrder.items.map((item: any) => (
                                <div key={item.id} style={{ display: 'flex', gap: '15px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <div style={{ width: '80px', height: '80px', flexShrink: 0, background: '#f8fafc', borderRadius: '6px', overflow: 'hidden' }}>
                                        {item.image ? (
                                            <img src={resolveUrl(item.image)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Package size={32} /></div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '5px' }}>{locale === 'ar' && item.name_ar ? item.name_ar : item.name}</h4>
                                        <div style={{ color: '#64748b', fontSize: '13px' }}>{t('orders.qty')} {item.quantity}  ×  AED {parseFloat(item.price_at_purchase).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                        AED {(item.quantity * parseFloat(item.price_at_purchase)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#475569' }}>
                                <span>{t('orders.subtotal')} <small>{t('orders.isTaxIncl')}</small></span>
                                <span>AED {parseFloat(selectedOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {(parseFloat(selectedOrder.discount_amount) > 0 || parseFloat(selectedOrder.points_discount) > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#ef4444' }}>
                                    <span>{t('orders.discountApplied')}</span>
                                    <span>- AED {(parseFloat(selectedOrder.discount_amount || 0) + parseFloat(selectedOrder.points_discount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#475569' }}>
                                <span>{t('orders.vat')}</span>
                                <span>AED {parseFloat(selectedOrder.vat_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                <span>{t('orders.totalPaid')}</span>
                                <span>AED {parseFloat(selectedOrder.final_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                );
            }

            const filteredOrders = orders.filter(order => {
                if (activeTab === 'All Orders') return true;
                if (activeTab === 'Open') return ['pending', 'processing', 'shipped'].includes(order.status);
                if (activeTab === 'Cancelled') return order.status === 'cancelled';
                if (activeTab === 'Delivered') return order.status === 'delivered';
                return true;
            });

            return (
                <>
                    <div className={styles.tabs}>
                        {tabs.map(tab => (
                            <span
                                key={tab}
                                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tabTranslations[tab] || tab}
                            </span>
                        ))}
                    </div>

                    {loadingOrders ? (
                        <div className={styles.loaderWrapper}><Loader /></div>
                    ) : filteredOrders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Inbox size={60} strokeWidth={1} />
                            </div>
                            <h3 className={styles.emptyText}>{t('orders.noOrders')}</h3>
                            <Link href="/shop" className={styles.shoppingBtn}>
                                {t('orders.continueShopping')}
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.ordersList} style={{ marginTop: '20px' }}>
                            {filteredOrders.map((order) => (
                                <div key={order.id} className={styles.premiumOrderCard}>
                                    <div className={styles.orderMain}>
                                        <div className={styles.orderIconWrapper}>
                                            <Package size={24} />
                                        </div>
                                        <div className={styles.orderBrief}>
                                            <div className={styles.orderIdRow}>
                                                <span className={styles.orderIdText}>
                                                    {t('orders.orderNumber')}{order.id}
                                                </span>
                                                <span className={`${styles.orderStatusBadge} ${order.status === 'delivered' ? styles.statusDelivered :
                                                    order.status === 'cancelled' ? styles.statusCancelled :
                                                        styles.statusPending
                                                    }`}>
                                                    {t(`orders.${order.status}`)}
                                                </span>
                                            </div>
                                            <div className={styles.orderMetaRow}>
                                                <div className={styles.orderMetaItem}>
                                                    <Calendar size={14} />
                                                    {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-GB', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </div>
                                                <div className={styles.orderMetaItem}>
                                                    <span>{t('orders.total')}</span>
                                                    <span className={styles.orderPrice}>
                                                        AED {parseFloat(order.final_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.orderActions}>
                                        <button
                                            className={styles.orderViewBtn}
                                            onClick={async () => {
                                                setLoadingOrderDetails(true);
                                                try {
                                                    const res = await fetch(`${API_BASE_URL}/orders/${order.id}`, {
                                                        credentials: "include",
                                                        headers: getAuthHeaders()
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        setSelectedOrder(data.data);
                                                    }
                                                } catch (e) {
                                                    console.error('Failed to view order details', e);
                                                } finally {
                                                    setLoadingOrderDetails(false);
                                                }
                                            }}
                                            disabled={loadingOrderDetails}
                                        >
                                            {loadingOrderDetails && selectedOrder?.id === order.id ? t('common.loading') : t('orders.viewDetails')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            );
        }

        if (activeSection === 'profileSecurity') {
            const profileTabs = ['Personal Info', 'Bussiness Info', 'Sign-in Info'];

            return (
                <div className={styles.profileSection}>
                    <div className={styles.profileTabs}>
                        {profileTabs.map(tab => (
                            <span
                                key={tab}
                                className={`${styles.profileTab} ${profileTab === tab ? styles.profileTabActive : ''}`}
                                onClick={() => setProfileTab(tab)}
                            >
                                {tabTranslations[tab] || tab}
                            </span>
                        ))}
                    </div>

                    <form onSubmit={handleProfileUpdate} className={styles.profileForm}>
                        {message && (
                            <div style={{
                                padding: '10px',
                                borderRadius: '4px',
                                marginBottom: '20px',
                                background: message.type === 'success' ? '#ebfbee' : '#fff0f0',
                                color: message.type === 'success' ? '#2b8a3e' : '#fa5252',
                                fontSize: '14px',
                                fontWeight: 600
                            }}>
                                {message.text}
                            </div>
                        )}

                        {profileTab === 'Personal Info' && (
                            <>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('profile.fullName')}</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        placeholder={t('profile.fullName')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('profile.phoneNumber')}</label>
                                    <input
                                        type="text"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        placeholder={t('profile.phoneNumber')}
                                    />
                                </div>
                            </>
                        )}

                        {profileTab === 'Bussiness Info' && (
                            <>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('profile.companyName')}</label>
                                    <input
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        placeholder={t('profile.companyName')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('profile.vatNumber')}</label>
                                    <input
                                        type="text"
                                        name="vat_number"
                                        value={formData.vat_number}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        placeholder={t('profile.vatNumber')}
                                    />
                                </div>
                            </>
                        )}

                        {profileTab === 'Sign-in Info' && (
                            <>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('profile.emailAddress')}</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        placeholder={t('profile.emailAddress')}
                                        disabled
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('profile.changePassword')}</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={styles.formInput}
                                        placeholder={t('profile.passwordPlaceholder')}
                                    />
                                </div>
                            </>
                        )}

                        <button type="submit" className={styles.editBtn} disabled={saving}>
                            {saving ? t('profile.saving') : t('profile.save')}
                        </button>
                    </form>
                </div>
            );
        }

        if (activeSection === 'quotations') {
            return (
                <div className={styles.quotationsContainer}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t('quotations.title')}</h2>
                        <span className={styles.itemCount}>{quotations.length} {t('quotations.items')}</span>
                    </div>

                    {loadingQuotations ? (
                        <div className={styles.loaderWrapper}><Loader /></div>
                    ) : quotations.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}><FileText size={60} strokeWidth={1} /></div>
                            <h3 className={styles.emptyText}>{t('quotations.noQuotations')}</h3>
                            <Link href="/" className={styles.shoppingBtn}>{t('favorites.exploreProducts')}</Link>
                        </div>
                    ) : (
                        <div className={styles.quotationsList}>
                            {quotations.map((q) => (
                                <div className={styles.premiumQuotationCard}>
                                    <div className={styles.quotationInfoMain}>
                                        <div className={styles.docIconWrapperPremium}>
                                            <FileText size={24} />
                                            <div className={styles.iconGloss}></div>
                                        </div>

                                        <div className={styles.quotationData}>
                                            <div className={styles.quotationRefBadge}>
                                                <span className={styles.refLabelText}>{t('quotations.refNumber')}</span>
                                                <span className={styles.refValueText}>{q.quotation_ref}</span>
                                            </div>

                                            <div className={styles.quotationMetaGroup}>
                                                <div className={styles.metaBadge}>
                                                    <Calendar size={14} />
                                                    <span>{new Date(q.created_at).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-GB', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}</span>
                                                </div>

                                                {q.total_amount && (
                                                    <div className={styles.amountPillPremium}>
                                                        <span className={styles.currencyLabel}>AED</span>
                                                        <span className={styles.amountValueText}>{parseFloat(q.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.actionsGroupPremium}>
                                        <div className={styles.actionButtonsWrapper}>
                                            <button
                                                className={styles.sleekViewBtn}
                                                onClick={() => handleViewQuotation(q)}
                                                disabled={isViewingId === q.id || isDownloadingId === q.id}
                                                title={t('quotations.view')}
                                            >
                                                {isViewingId === q.id ? <div className={styles.miniLoaderTeal}></div> : <><FileText size={18} /><span>{t('quotations.view')}</span></>}
                                            </button>

                                            <button
                                                className={styles.sleekDownloadBtn}
                                                onClick={() => handleDownloadQuotation(q)}
                                                disabled={isViewingId === q.id || isDownloadingId === q.id}
                                                title={t('quotations.download')}
                                            >
                                                {isDownloadingId === q.id ? <div className={styles.miniLoaderWhite}></div> : <><Download size={18} /><span>{t('quotations.download')}</span></>}
                                            </button>
                                        </div>

                                        <button
                                            className={styles.sleekDeleteBtn}
                                            onClick={() => handleDeleteQuotation(q.id)}
                                            title={t('quotations.delete')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (activeSection === 'addresses') {
            return (
                <div className={styles.quotationsContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', ...(locale === 'ar' ? { flexDirection: 'row-reverse' } : {}) }}>
                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t('addresses.title')}</h2>
                        <button
                            className={styles.shoppingBtn}
                            onClick={() => {
                                setEditingAddressId(null);
                                setAddressForm({
                                    first_name: '',
                                    last_name: '',
                                    company_name: '',
                                    email: '',
                                    address_line1: '',
                                    address_line2: '',
                                    city: '',
                                    state: 'UAE',
                                    zip_code: '',
                                    country: 'United Arab Emirates',
                                    phone: '',
                                    is_default: false
                                });
                                setShowAddressForm(!showAddressForm);
                            }}
                        >
                            {showAddressForm ? t('addresses.cancel') : t('addresses.addNew')}
                        </button>
                    </div>

                    {message && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '4px',
                            marginBottom: '20px',
                            background: message.type === 'success' ? '#ebfbee' : '#fff0f0',
                            color: message.type === 'success' ? '#2b8a3e' : '#fa5252',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>
                            {message.text}
                        </div>
                    )}

                    {showAddressForm && (
                        <form onSubmit={handleAddAddress} className={styles.addressForm} style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                            <h3 style={{ marginBottom: '20px', color: '#0f172a' }}>{editingAddressId ? t('addresses.edit') : t('addresses.addNew')}</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.firstName')} *</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.formInput}
                                        value={addressForm.first_name}
                                        onChange={(e) => setAddressForm({ ...addressForm, first_name: e.target.value })}
                                        placeholder="e.g. John"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.lastName')} *</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.formInput}
                                        value={addressForm.last_name}
                                        onChange={(e) => setAddressForm({ ...addressForm, last_name: e.target.value })}
                                        placeholder="e.g. Doe"
                                    />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.companyName')}</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={addressForm.company_name}
                                        onChange={(e) => setAddressForm({ ...addressForm, company_name: e.target.value })}
                                        placeholder="Company LLC (Optional)"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.email')} *</label>
                                    <input
                                        type="email"
                                        required
                                        className={styles.formInput}
                                        value={addressForm.email}
                                        onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('addresses.line1')}</label>
                                <input
                                    type="text"
                                    required
                                    className={styles.formInput}
                                    value={addressForm.address_line1}
                                    onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                                    placeholder={t('addresses.line1Placeholder')}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('addresses.line2')}</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={addressForm.address_line2}
                                    onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                                    placeholder={t('addresses.line2Placeholder')}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.city')}</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.formInput}
                                        value={addressForm.city}
                                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                        placeholder={t('addresses.cityPlaceholder')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.state')}</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.formInput}
                                        value={addressForm.state}
                                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                        placeholder={t('addresses.statePlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.zip')}</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={addressForm.zip_code}
                                        onChange={(e) => setAddressForm({ ...addressForm, zip_code: e.target.value })}
                                        placeholder={t('addresses.zipPlaceholder')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>{t('addresses.phone')}</label>
                                    <input
                                        type="tel"
                                        required
                                        className={styles.formInput}
                                        value={addressForm.phone}
                                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                        placeholder={t('addresses.phonePlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={addressForm.is_default}
                                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                                />
                                <label htmlFor="is_default" style={{ cursor: 'pointer', fontSize: '14px' }}>{t('addresses.setAsDefault')}</label>
                            </div>
                            <button type="submit" className={styles.editBtn} disabled={saving}>
                                {saving ? (editingAddressId ? t('addresses.updating') : t('addresses.adding')) : (editingAddressId ? t('addresses.update') : t('addresses.add'))}
                            </button>
                        </form>
                    )
                    }

                    {
                        loadingAddresses ? (
                            <div className={styles.loaderWrapper}><Loader /></div>
                        ) : addresses.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}><MapPin size={60} strokeWidth={1} /></div>
                                <h3 className={styles.emptyText}>{t('addresses.noAddresses')}</h3>
                                <p style={{ marginBottom: '20px' }}>{t('addresses.fasterCheckout')}</p>
                            </div>
                        ) : (
                            <div className={styles.addressGrid}>
                                {addresses.map((addr) => (
                                    <div key={addr.id} className={`${styles.addressCard} ${addr.is_default ? styles.addressCardDefault : ''}`}>
                                        <div className={styles.addressContent}>
                                            {!!addr.is_default && (
                                                <div className={styles.addressBadge}>
                                                    <Check size={12} style={{ marginInlineEnd: '4px' }} />
                                                    {t('addresses.default')}
                                                </div>
                                            )}
                                            <h4 className={styles.addressNameText} style={{ ...(locale === 'ar' ? { flexDirection: 'row-reverse' } : {}), marginBottom: '4px' }}>
                                                <User size={18} color="#56cfe1" />
                                                {addr.first_name} {addr.last_name}
                                            </h4>
                                            <div style={locale === 'ar' ? { textAlign: 'right' } : {}}>
                                                {!!addr.company_name && <p className={styles.addressInfoLine} style={{ fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>{addr.company_name}</p>}
                                                <p className={styles.addressInfoLine}>
                                                    <MapPin size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                                    {addr.address_line1}
                                                </p>
                                                {!!addr.address_line2 && <p className={styles.addressInfoLine}>{addr.address_line2}</p>}
                                                <p className={styles.addressInfoLine}>{addr.city}, {addr.state} {addr.zip_code}</p>
                                                <p className={styles.addressInfoLine} style={{ opacity: 0.8 }}>{addr.country}</p>
                                                <div className={styles.addressPhoneLine} style={locale === 'ar' ? { flexDirection: 'row-reverse' } : {}}>
                                                    <Phone size={14} color="#64748b" />
                                                    <span dir="ltr">{addr.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.addressCardActions} style={locale === 'ar' ? { flexDirection: 'row-reverse' } : {}}>
                                            <button
                                                className={`${styles.addressActionBtn} ${styles.addressEditBtn}`}
                                                onClick={() => handleEditAddress(addr)}
                                                style={locale === 'ar' ? { flexDirection: 'row-reverse' } : {}}
                                            >
                                                <Edit2 size={14} />
                                                {t('addresses.edit').split(' ')[0]}
                                            </button>
                                            <button
                                                className={`${styles.addressActionBtn} ${styles.addressDeleteBtn}`}
                                                onClick={() => handleDeleteAddress(addr.id)}
                                                style={locale === 'ar' ? { flexDirection: 'row-reverse' } : {}}
                                            >
                                                <Trash2 size={14} />
                                                {t('addresses.delete').split(' ')[0]}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div >
            );
        }

        if (activeSection === 'payments') {
            return (
                <div className={styles.quotationsContainer}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t('payments.title')}</h2>
                        <span className={styles.itemCount}>{orders.length} {t('payments.transactions')}</span>
                    </div>
                    {loadingOrders ? (
                        <div className={styles.loaderWrapper}><Loader /></div>
                    ) : orders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}><CreditCard size={60} strokeWidth={1} /></div>
                            <h3 className={styles.emptyText}>{t('payments.noPayments')}</h3>
                            <Link href="/shop" className={styles.shoppingBtn}>{t('favorites.exploreProducts')}</Link>
                        </div>
                    ) : (
                        <div className={styles.quotationsList}>
                            {orders.map((order) => (
                                <div key={`payment-${order.id}`} className={styles.premiumPaymentCard}>
                                    <div className={styles.paymentMain}>
                                        <div className={styles.paymentIconWrapper}>
                                            {order.payment_method === 'card' ? <CreditCard size={24} /> : <Banknote size={24} />}
                                        </div>
                                        <div className={styles.paymentInfo}>
                                            <div className={styles.orderRefRow}>
                                                <span className={styles.orderRefText}>{t('payments.order')}{order.id}</span>
                                                <span className={styles.paymentMethodPill}>
                                                    {order.payment_method === 'card' ? t('orders.card') : t('orders.bankTransfer')}
                                                </span>
                                            </div>
                                            <span className={styles.paymentDate}>
                                                {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-GB', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.paymentAmountSide}>
                                        <div className={styles.paymentValue}>
                                            AED {parseFloat(order.final_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className={`${styles.paymentStatusBadge} ${order.payment_status === 'paid' ? styles.paySuccess :
                                            order.payment_status === 'failed' ? styles.payFailed :
                                                styles.payPending
                                            }`}>
                                            <span className={styles.statusIndicatorDot}></span>
                                            {order.payment_status ? t(`payments.${order.payment_status}`) : t('payments.pending')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                    <Inbox size={60} strokeWidth={1} />
                </div>
                <h3 className={styles.emptyText}>{t('comingSoon', { section: activeSection })}</h3>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('yourAccount')}</h1>

            <div className={styles.layout}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.userCard}>
                        <h2 className={styles.welcomeText}>
                            {t('hello', { name: user.name })}
                        </h2>
                        <p className={styles.emailText}>{user.email}</p>
                        <div className={styles.statusIndicator}>
                            <span className={styles.statusDot}></span>
                            {t('activeSession')}
                        </div>
                        <span className={styles.points}>{user.reward_points || 0} {t('points')}</span>
                        <p className={styles.congratsText} dangerouslySetInnerHTML={{
                            __html: t.raw('rewardCongrats').replace('{amount}', ((user.reward_points || 0) * pointRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                        }} />
                    </div>

                    <nav className={styles.nav}>
                        {navItems.map((item, idx) => (
                            <React.Fragment key={item.name}>
                                {idx === 3 && <div className={styles.divider} />}
                                <button
                                    onClick={() => {
                                        if (item.name === 'sellerDashboard') {
                                            router.push('/sellerDashboard');
                                        } else {
                                            setActiveSection(item.name);
                                        }
                                    }}
                                    className={`${styles.navLink} ${activeSection === item.name ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}>{item.icon}</span>
                                    {item.translationName}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>

                    <button onClick={logout} className={styles.signOutBtn}>
                        {t('signOut')}
                    </button>
                </aside>

                {/* Main Content */}
                <main className={styles.mainContent}>
                    {renderContent()}
                </main>
            </div>

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

export default UserDashboard;

