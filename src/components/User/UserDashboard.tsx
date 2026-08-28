'use client';

import React, { useState, useEffect, useRef } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import { DirhamSymbol } from 'dirham/react';
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
    ChevronRight,
    Store,
    Phone,
    Edit2,
    Calendar,
    Download,
    Banknote,
    Check,
    ArrowUpRight,
    ArrowDownLeft,
    Home,
    Building2,
    MoreHorizontal,
    BadgeCheck,
    Plus
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL, BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { formatCustomDims } from '@/utils/customDimensions';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import OtpVerifyModal from '@/components/shared/OtpVerifyModal/OtpVerifyModal';
import EmailOtpModal from '@/components/shared/EmailOtpModal/EmailOtpModal';
import { useSearchParams } from 'next/navigation';
import SavedCards from '@/components/Payment/SavedCards';
import CardManagerModal from '@/components/Payment/CardManagerModal';
import { SavedCard, listCards, setDefaultCard } from '@/utils/paymentMethodsApi';

const UserDashboard = () => {
    const t = useTranslations('userDashboard');
    const tProd = useTranslations('product');
    // Prefer the localized custom-dimension string; fall back to variant signature / stored label.
    const itemVariantLine = (item: any): string =>
        formatCustomDims(item?.custom_dimensions, tProd) || item?.variant_options || item?.custom_label || '';
    const { user, logout, updateUser, refreshUser, loading: authLoading } = useAuth();
    const [otpOpen, setOtpOpen] = useState(false);
    const [emailOtpOpen, setEmailOtpOpen] = useState(false);
    const [pendingEmail, setPendingEmail] = useState('');
    const { wishlistItems, removeFromWishlist } = useWishlist();
    const { addToCart, pointRate } = useCart();
    const { showNotification } = useNotification();
    const router = useRouter();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [activeSection, setActiveSection] = useState('yourOrders');
    const [activeTab, setActiveTab] = useState('All Orders');

    // Saved cards, loaded only when the Payments section is actually opened —
    // every other section would be paying for a Stripe round trip it never uses.
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [cardsLoading, setCardsLoading] = useState(false);
    const [cardsError, setCardsError] = useState<string | null>(null);
    const [cardManagerOpen, setCardManagerOpen] = useState(false);
    const [cardManagerView, setCardManagerView] = useState<'list' | 'add' | 'edit' | 'confirmDelete'>('list');
    const [cardManagerTarget, setCardManagerTarget] = useState<SavedCard | null>(null);
    const [cardBusyId, setCardBusyId] = useState<string | null>(null);

    useEffect(() => {
        if (tabParam) {
            setActiveSection(tabParam);
        }
    }, [tabParam]);

    // Deep link from order emails: /profile?tab=yourOrders&orderId=70&view=summary
    const orderIdParam = searchParams.get('orderId');
    const viewParam = searchParams.get('view');
    useEffect(() => {
        if (!orderIdParam || !user) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/orders/${orderIdParam}`, { credentials: 'include', headers: getAuthHeaders() });
                const data = await res.json();
                if (cancelled || !data.success) return;
                setActiveSection('yourOrders');
                wantSummaryRef.current = viewParam === 'summary';
                setSelectedOrder(data.data);
            } catch (e) {
                console.error('Failed to open order from email link', e);
            }
        })();
        return () => { cancelled = true; };
    }, [orderIdParam, viewParam, user]);

    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (navRef.current) {
            const activeEl = navRef.current.querySelector(`.${styles.active}`) as HTMLElement;
            if (activeEl) {
                // Scroll the active tab into view horizontally with smooth behavior
                const navScrollLeft = navRef.current.scrollLeft;
                const navWidth = navRef.current.clientWidth;
                const activeOffsetLeft = activeEl.offsetLeft;
                const activeWidth = activeEl.clientWidth;

                if (activeOffsetLeft < navScrollLeft || activeOffsetLeft + activeWidth > navScrollLeft + navWidth) {
                    navRef.current.scrollTo({
                        left: activeOffsetLeft - (navWidth / 2) + (activeWidth / 2),
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [activeSection]);

    const [profileTab, setProfileTab] = useState('Personal Info');
    const [formData, setFormData] = useState({
        name: user?.name || '',
        first_name: (user?.name || '').trim().split(' ')[0] || '',
        last_name: (user?.name || '').trim().split(' ').slice(1).join(' ') || '',
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
                first_name: (user.name || '').trim().split(' ')[0] || '',
                last_name: (user.name || '').trim().split(' ').slice(1).join(' ') || '',
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
        if (activeSection === 'payments' && user) {
            setCardsLoading(true);
            setCardsError(null);
            listCards()
                .then(setSavedCards)
                .catch((e) => setCardsError(e.message || 'Could not load your saved cards.'))
                .finally(() => setCardsLoading(false));
        }
        if (activeSection === 'quotations' && user) {
            fetchQuotations();
        }
    }, [activeSection, user?.id]);

    useEffect(() => {
        if (activeSection === 'myRewards' && user) {
            fetchRewardHistory();
        }
    }, [activeSection, user?.id]);

    const fetchRewardHistory = async () => {
        setLoadingRewardHistory(true);
        try {
            const response = await fetch(`${API_BASE_URL}/users/reward-history`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setRewardHistory(data.data || []);
                setRewardsPage(1);
            }
        } catch (error) {
            console.error('Error fetching reward history:', error);
        } finally {
            setLoadingRewardHistory(false);
        }
    };

    // Localize a reward-history row's description. DB stores English text; map the
    // known patterns to i18n keys so Arabic shows translated. Falls back to raw text.
    const localizeRewardDesc = (row: any): string => {
        const d: string = row?.description || '';
        if (/welcome/i.test(d)) return t('rewards.descWelcome');
        if (/admin/i.test(d) && /remov/i.test(d)) return t('rewards.descAdminRemove');
        if (/admin/i.test(d) && /add/i.test(d)) return t('rewards.descAdminAdd');
        if (row?.order_id && row?.transaction_type === 'redeemed') return t('rewards.descRedeemedOrder', { id: row.order_id });
        if (row?.order_id && row?.transaction_type === 'earned') return t('rewards.descEarnedOrder', { id: row.order_id });
        if (row?.order_id && row?.transaction_type === 'reversed') return t('rewards.descReversedOrder', { id: row.order_id });
        if (row?.order_id && row?.transaction_type === 'refunded') return t('rewards.descRefundedOrder', { id: row.order_id });
        return d;
    };

    // Jump from a points-statement row to the linked order detail.
    const openOrderById = async (orderId: number) => {
        if (!orderId) return;
        setActiveSection('yourOrders');
        router.push('/profile?tab=yourOrders', { scroll: false });
        setLoadingOrderDetails(true);
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) setSelectedOrder(data.data);
        } catch (e) {
            console.error('Failed to open order from points statement', e);
        } finally {
            setLoadingOrderDetails(false);
        }
    };

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
            await generateQuotationPDF(quotation, true, locale === 'ar');
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
            await generateQuotationPDF(quotation, false, locale === 'ar');
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
                    address_type: 'home',
                    address_label: '',
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
            } else {
                setMessage({ type: 'error', text: data.message || (editingAddressId ? t('addresses.error') : t('addresses.addError')) });
            }
        } catch (error) {
            setMessage({ type: 'error', text: editingAddressId ? t('addresses.error') : t('addresses.addError') });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const openAddAddressForm = () => {
        setEditingAddressId(null);
        setOpenAddrMenu(null);
        const fullName = (user?.name || '').trim();
        const hasHome = addresses.some(a => a.address_type === 'home');
        const hasWork = addresses.some(a => a.address_type === 'work');
        const defaultType = !hasHome ? 'home' : !hasWork ? 'work' : 'other';
        setAddressForm({
            address_type: defaultType,
            address_label: '',
            first_name: fullName.split(' ')[0] || '',
            last_name: fullName.split(' ').slice(1).join(' ') || '',
            company_name: '',
            email: user?.email || '',
            address_line1: '',
            address_line2: '',
            city: '',
            state: 'UAE',
            zip_code: '',
            country: 'United Arab Emirates',
            phone: user?.phone_number || '',
            is_default: false
        });
        setShowAddressForm(true);
    };

    const handleEditAddress = (addr: any) => {
        setOpenAddrMenu(null);
        setEditingAddressId(addr.id);
        setAddressForm({
            address_type: addr.address_type || 'other',
            address_label: addr.address_label || '',
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
    const [showOrderSummary, setShowOrderSummary] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const wantSummaryRef = useRef(false);
    // On order change: open summary only if a deep link asked for it, else show detail.
    useEffect(() => { setShowOrderSummary(wantSummaryRef.current); wantSummaryRef.current = false; }, [selectedOrder?.id]);
    const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
    const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [rewardHistory, setRewardHistory] = useState<any[]>([]);
    const [loadingRewardHistory, setLoadingRewardHistory] = useState(false);
    const [rewardsTab, setRewardsTab] = useState<'earn' | 'history'>('earn');
    const [rewardsPage, setRewardsPage] = useState(1);
    const [rewardsFilter, setRewardsFilter] = useState<'all' | 'earned' | 'redeemed' | 'expired'>('all');
    const REWARDS_PER_PAGE = 10;
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [openAddrMenu, setOpenAddrMenu] = useState<number | null>(null);
    const [addressForm, setAddressForm] = useState({
        address_type: 'home',
        address_label: '',
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

    // The profile shows its own card rows, so a row's controls open the manager
    // directly on that action instead of on a second copy of the list.
    const openCardManager = (view: 'list' | 'add' | 'edit' | 'confirmDelete', card: SavedCard | null = null) => {
        setCardManagerView(view);
        setCardManagerTarget(card);
        setCardManagerOpen(true);
    };

    // Making a card the default needs no form, so it happens in place rather than
    // sending the shopper through a dialog to press one button.
    const handleCardSetDefault = async (card: SavedCard) => {
        setCardBusyId(card.id);
        setCardsError(null);
        try {
            await setDefaultCard(card.id);
            setSavedCards(await listCards());
        } catch (e: any) {
            setCardsError(e.message || 'Could not update your default card.');
        } finally {
            setCardBusyId(null);
        }
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
            const name = `${formData.first_name} ${formData.last_name}`.trim();
            await updateUser({ ...formData, name });
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

    const handleDownloadInvoice = async () => {
        if (!selectedOrder) return;
        if (selectedOrder.status === 'cancelled') {
            showNotification(t('orders.invoiceUnavailable'), 'error');
            return;
        }
        if (!selectedOrder.invoice) {
            showNotification(t('orders.invoiceNotReady'), 'error');
            return;
        }
        if (downloadingInvoice) return;
        setDownloadingInvoice(true);
        try {
            const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
            const dataUri = await generateInvoicePDF({
                invoice_number: selectedOrder.invoice.invoice_number,
                order_id: selectedOrder.id,
                customer_name: selectedOrder.receiver_name || user?.name || '',
                given_by_name: selectedOrder.invoice.given_by_name || '',
                final_amount: Number(selectedOrder.invoice.order_total || selectedOrder.final_amount || 0),
                delivery_charge: Number(selectedOrder.delivery_charge) || 0,
                items: selectedOrder.items || []
            });
            const base64 = dataUri.replace(/^data:application\/pdf[^,]*,/, '');
            const byteChars = atob(base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Invoice-${selectedOrder.invoice.invoice_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            showNotification(t('orders.invoiceDownloadError'), 'error');
        } finally {
            setDownloadingInvoice(false);
        }
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
                                        <div className={styles.itemPrice}><CurrencyPrice amount={Number(item.price)} /></div>
                                        <div className={styles.itemActions}>
                                            <button
                                                className={styles.addToCartBtn}
                                                onClick={() => addToCart({
                                                    id: item.id,
                                                    name: item.name,
                                                    name_ar: item.name_ar,
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
            if (selectedOrder && showOrderSummary) {
                const items = selectedOrder.items || [];
                const itemsCount = items.reduce((n: number, it: any) => n + (Number(it.quantity) || 0), 0);
                const itemsValue = parseFloat(selectedOrder.total_amount) || 0;
                const vat = parseFloat(selectedOrder.vat_amount) || 0;
                const orderTotal = parseFloat(selectedOrder.final_amount) || 0;
                const deliveryFee = Math.max(0, Number(selectedOrder.delivery_charge) || 0);
                const pm = (selectedOrder.payment_method || '').toLowerCase();
                const paymentLabel = pm === 'card' ? t('orders.card') : (pm === 'cod' || pm === 'cash') ? t('orders.cashOnDelivery') : t('orders.bankTransfer');
                const addr = selectedOrder.shipping_address;
                const shipmentId = `#${selectedOrder.id}`;
                const cardStyle: React.CSSProperties = { background: '#fff', border: '1.5px solid #d6dde5', borderRadius: '14px', padding: '22px' };
                const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' };
                return (
                    <div className={styles.orderDetailsSection}>
                        <button
                            onClick={() => setShowOrderSummary(false)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, ...(locale === 'ar' ? { flexDirection: 'row-reverse' } : {}) }}
                        >
                            <ChevronLeft size={24} style={locale === 'ar' ? { transform: 'rotate(180deg)' } : {}} />
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{t('orders.orderSummary')}</span>
                        </button>

                        {/* ID + date strip */}
                        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '15px', color: '#475569' }}>
                                {t('orders.orderShipmentId')} <strong style={{ color: '#0f172a' }}>{shipmentId}</strong>
                            </span>
                            <span style={{ fontSize: '15px', color: '#64748b' }}>
                                {t('orders.orderDate')}: {new Date(selectedOrder.created_at).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        </div>

                        {/* Two-column cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                            {/* Order details */}
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 18px' }}>{t('orders.orderDetails')}</h3>
                                <div style={{ ...rowStyle, marginBottom: '12px' }}>
                                    <span style={{ color: '#475569' }}>{t('orders.itemsValue')} <span style={{ color: '#94a3b8', fontSize: '13px' }}>({itemsCount} {itemsCount === 1 ? t('orders.itemSingular') : t('orders.itemPlural')})</span></span>
                                    <span style={{ fontWeight: 600 }}><CurrencyPrice amount={itemsValue} /></span>
                                </div>
                                <div style={{ ...rowStyle, marginBottom: '12px' }}>
                                    <span style={{ color: '#475569' }}>{t('orders.vat')}</span>
                                    <span style={{ fontWeight: 600 }}><CurrencyPrice amount={vat} /></span>
                                </div>
                                <div style={{ ...rowStyle, marginBottom: '16px' }}>
                                    <span style={{ color: '#475569' }}>{t('orders.deliveryCharge')}</span>
                                    {deliveryFee > 0
                                        ? <span style={{ fontWeight: 600 }}><CurrencyPrice amount={deliveryFee} /></span>
                                        : <span style={{ color: '#16a34a', fontWeight: 800 }}>{t('orders.free')}</span>}
                                </div>
                                <div style={{ ...rowStyle, borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>{t('orders.orderTotalLabel')} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '13px' }}>{t('orders.incVat')}</span></span>
                                    <span style={{ fontWeight: 800, fontSize: '17px', color: '#0f172a' }}><CurrencyPrice amount={orderTotal} /></span>
                                </div>
                            </div>

                            {/* Delivery address */}
                            {addr && (
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
                                        {t('orders.deliveryAddress')} <span style={{ color: '#64748b' }}>({addr.address_label || t(`addresses.type${(addr.address_type || 'other').charAt(0).toUpperCase()}${(addr.address_type || 'other').slice(1)}`)})</span>
                                    </h3>
                                    <div style={{ fontSize: '15px', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                                        {selectedOrder.receiver_name || `${addr.first_name || ''} ${addr.last_name || ''}`.trim()}
                                    </div>
                                    <div style={{ fontSize: '15px', color: '#64748b', marginBottom: '6px' }}>
                                        {[addr.address_line1, addr.address_line2, addr.city, addr.country].filter(Boolean).join(', ')}
                                    </div>
                                    {(selectedOrder.receiver_phone || addr.phone) && (
                                        <div style={{ fontSize: '15px', color: '#16a34a', fontWeight: 600 }}>{selectedOrder.receiver_phone || addr.phone}</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Payment + invoice */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>{t('orders.paymentDetails')}</h3>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', borderRadius: '8px', padding: '8px 14px', fontWeight: 600, color: '#334155' }}>
                                    <CreditCard size={16} /> {paymentLabel}
                                </span>
                            </div>
                            <button type="button" onClick={handleDownloadInvoice} disabled={downloadingInvoice || selectedOrder.status === 'cancelled'} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', cursor: selectedOrder.status === 'cancelled' ? 'not-allowed' : 'pointer', opacity: selectedOrder.status === 'cancelled' ? 0.7 : 1, width: '100%', textAlign: locale === 'ar' ? 'right' : 'left', fontFamily: 'inherit' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <FileText size={20} color="#0f172a" />
                                        <strong style={{ fontSize: '17px', color: '#0f172a' }}>{t('orders.viewInvoice')}</strong>
                                    </div>
                                    <span style={{ fontSize: '13px', color: selectedOrder.status === 'cancelled' ? '#ea580c' : (selectedOrder.invoice ? '#64748b' : '#ea580c') }}>
                                        {selectedOrder.status === 'cancelled'
                                            ? t('orders.invoiceUnavailable')
                                            : (selectedOrder.invoice ? t('orders.downloadInvoiceNote') : t('orders.invoiceNotReady'))}
                                    </span>
                                </div>
                                {selectedOrder.status === 'cancelled'
                                    ? null
                                    : (downloadingInvoice
                                        ? <span className={styles.invoiceSpinner} aria-label="Generating invoice" />
                                        : <Download size={20} color="#64748b" style={{ flexShrink: 0 }} />)}
                            </button>
                        </div>

                        {/* Item summary */}
                        {items.length > 0 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>{t('orders.itemSummary')}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #eef2f6', paddingBottom: '14px', marginBottom: '14px' }}>
                                    <div className={`${styles.orderIconWrapper} ${styles[`iconBg_${selectedOrder.status}`]}`}>
                                        <Package size={22} />
                                    </div>
                                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                                        {t(`orders.${selectedOrder.status}`)} {t('orders.on')} {new Date(selectedOrder.updated_at || selectedOrder.created_at).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {items.map((item: any) => {
                                        const variantLine = itemVariantLine(item);
                                        const brand = locale === 'ar' && item.brand_name_ar ? item.brand_name_ar : item.brand_name;
                                        return (
                                            <div key={`os-${item.id}`} style={{ display: 'flex', gap: '16px', border: '1.5px solid #d6dde5', borderRadius: '10px', padding: '14px' }}>
                                                <Link href={item.slug ? `/product/${item.slug}` : '#'} style={{ width: '90px', height: '90px', flexShrink: 0, background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', pointerEvents: item.slug ? 'auto' : 'none' }}>
                                                    {item.image ? <img src={resolveUrl(item.image) || '/assets/mariot-logo2.webp'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/mariot-logo2.webp'; }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Package size={32} /></div>}
                                                </Link>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {brand && <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '2px' }}>{brand}</div>}
                                                    <Link href={item.slug ? `/product/${item.slug}` : '#'} style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#334155', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: item.slug ? 'auto' : 'none' }}>
                                                        {locale === 'ar' && item.name_ar ? item.name_ar : item.name}
                                                    </Link>
                                                    {variantLine && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{variantLine}</div>}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}><CurrencyPrice amount={parseFloat(item.price_at_purchase)} /></span>
                                                        {item.model_number && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('orders.itemId')} {item.model_number}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
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

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '5px' }}>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>{t('orders.orderNumber')}{selectedOrder.id}</h2>
                            {Number(selectedOrder.points_earned) > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    +{Number(selectedOrder.points_earned)} {t('rewards.ptsShort')}
                                </span>
                            )}
                        </div>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                            {t('orders.placedOn')} {new Date(selectedOrder.created_at).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </p>

                        {selectedOrder.status === 'cancelled' ? (
                            <div className={styles.orderCancelledBanner}>{t('orders.cancelled')}</div>
                        ) : (() => {
                            const steps = [
                                { key: 'confirmed', label: t('orders.stepConfirmed') },
                                { key: 'processing', label: t('orders.stepProcessing') },
                                { key: 'shipped', label: t('orders.stepShipped') },
                                { key: 'delivered', label: t('orders.stepDelivered') },
                            ];
                            const flow = ['pending', 'processing', 'shipped', 'delivered'];
                            const current = Math.max(0, flow.indexOf(selectedOrder.status));
                            return (
                                <div className={styles.orderTracker} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                                    {steps.map((s, i) => (
                                        <React.Fragment key={s.key}>
                                            {i > 0 && <div className={`${styles.trackerLine} ${i <= current ? styles.trackerLineActive : ''}`} />}
                                            <div className={styles.trackerStep}>
                                                <div className={`${styles.trackerDot} ${i <= current ? styles.trackerDotActive : ''}`}>
                                                    {i < current && <Check size={14} />}
                                                </div>
                                                <span className={`${styles.trackerLabel} ${i <= current ? styles.trackerLabelActive : ''}`}>{s.label}</span>
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Status + support + address + invoice quick blocks */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '24px 0' }}>
                            {/* Current status row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', border: '1.5px solid #d6dde5', borderRadius: '12px', padding: '14px 18px' }}>
                                <div className={`${styles.orderIconWrapper} ${styles[`iconBg_${selectedOrder.status}`]}`}>
                                    <Package size={22} />
                                </div>
                                <div style={{ fontSize: '15px', color: '#475569' }}>
                                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>{t(`orders.${selectedOrder.status}`)}</strong>
                                    {' '}{t('orders.on')}{' '}
                                    {new Date(selectedOrder.updated_at || selectedOrder.created_at).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-GB', {
                                        weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}
                                </div>
                            </div>

                            {/* Got an issue */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#fff', border: '1.5px solid #d6dde5', borderRadius: '12px', padding: '14px 18px' }}>
                                <strong style={{ fontSize: '15px', color: '#0f172a' }}>{t('orders.gotIssue')}</strong>
                                <a
                                    href={`https://wa.me/97142882777?text=${encodeURIComponent(
                                        (locale === 'ar'
                                            ? `مرحبًا، لدي مشكلة في الطلب رقم ${selectedOrder.id}.`
                                            : `Hello, I have an issue with Order #${selectedOrder.id}.`)
                                        + `\n${t('orders.status')}: ${t(`orders.${selectedOrder.status}`)}`
                                        + `\n${t('orders.total')}: ${selectedOrder.final_amount}`
                                        + (selectedOrder.items?.length
                                            ? `\n${t('orders.itemsInOrder')}: ${selectedOrder.items.map((i: any) => (locale === 'ar' && i.name_ar ? i.name_ar : i.name)).join(', ')}`
                                            : '')
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ flexShrink: 0, padding: '8px 18px', border: '1.5px solid #0056b3', borderRadius: '8px', color: '#0056b3', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
                                >
                                    {t('orders.contactUs')}
                                </a>
                            </div>

                            {/* Delivery address */}
                            {selectedOrder.shipping_address && (
                                <div style={{ background: '#fff', border: '1.5px solid #d6dde5', borderRadius: '12px', padding: '18px' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                                        {t('orders.deliveryAddress')}{' '}
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                                            ({selectedOrder.shipping_address.address_label || t(`addresses.type${(selectedOrder.shipping_address.address_type || 'other').charAt(0).toUpperCase()}${(selectedOrder.shipping_address.address_type || 'other').slice(1)}`)})
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                                        {selectedOrder.receiver_name || `${selectedOrder.shipping_address.first_name || ''} ${selectedOrder.shipping_address.last_name || ''}`.trim()}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                                        {[selectedOrder.shipping_address.address_line1, selectedOrder.shipping_address.address_line2, selectedOrder.shipping_address.city, selectedOrder.shipping_address.country].filter(Boolean).join(', ')}
                                    </div>
                                    {(selectedOrder.receiver_phone || selectedOrder.shipping_address.phone) && (
                                        <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>
                                            {selectedOrder.receiver_phone || selectedOrder.shipping_address.phone}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View invoice summary */}
                            <button type="button" onClick={() => setShowOrderSummary(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#fff', border: '1.5px solid #d6dde5', borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', width: '100%', textAlign: locale === 'ar' ? 'right' : 'left', fontFamily: 'inherit' }}>
                                <strong style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{t('orders.viewInvoiceSummary')}</strong>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                                    {t('orders.findInvoiceHere')}
                                    <ChevronRight size={18} style={locale === 'ar' ? { transform: 'rotate(180deg)' } : {}} />
                                </span>
                            </button>

                            {/* Item summary (screenshot style) */}
                            {selectedOrder.items?.length > 0 && (
                                <div style={{ background: '#fff', border: '1.5px solid #d6dde5', borderRadius: '12px', padding: '18px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>{t('orders.itemSummary')}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedOrder.items.map((item: any) => {
                                            const variantLine = itemVariantLine(item);
                                            const brand = locale === 'ar' && item.brand_name_ar ? item.brand_name_ar : item.brand_name;
                                            return (
                                                <div key={`sum-${item.id}`} style={{ display: 'flex', gap: '16px', border: '1.5px solid #d6dde5', borderRadius: '10px', padding: '14px' }}>
                                                    <Link
                                                        href={item.slug ? `/product/${item.slug}` : '#'}
                                                        style={{ width: '90px', height: '90px', flexShrink: 0, background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', cursor: item.slug ? 'pointer' : 'default', pointerEvents: item.slug ? 'auto' : 'none' }}
                                                    >
                                                        {item.image ? (
                                                            <img src={resolveUrl(item.image) || '/assets/mariot-logo2.webp'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/mariot-logo2.webp'; }} />
                                                        ) : (
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Package size={32} /></div>
                                                        )}
                                                    </Link>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {brand && <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '2px' }}>{brand}</div>}
                                                        <Link
                                                            href={item.slug ? `/product/${item.slug}` : '#'}
                                                            style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#334155', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: item.slug ? 'pointer' : 'default', pointerEvents: item.slug ? 'auto' : 'none' }}
                                                        >
                                                            {locale === 'ar' && item.name_ar ? item.name_ar : item.name}
                                                        </Link>
                                                        {variantLine && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{variantLine}</div>}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                                                                <CurrencyPrice amount={parseFloat(item.price_at_purchase)} />
                                                            </span>
                                                            {item.model_number && (
                                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('orders.itemId')} {item.model_number}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {false && (<>
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
                                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}><CurrencyPrice amount={parseFloat(selectedOrder.final_amount)} /></span>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>{t('orders.itemsInOrder')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                            {selectedOrder.items && selectedOrder.items.map((item: any) => {
                                const isFree = Number(item.is_free_gift) === 1;
                                const parentName = locale === 'ar' && item.bundle_parent_name_ar ? item.bundle_parent_name_ar : item.bundle_parent_name;
                                return (
                                <div key={item.id} style={{ display: 'flex', gap: '15px', padding: '15px', border: '1.5px solid #d6dde5', borderRadius: '8px' }}>
                                    <Link
                                        href={item.slug ? `/product/${item.slug}` : '#'}
                                        style={{ width: '80px', height: '80px', flexShrink: 0, background: '#f8fafc', borderRadius: '6px', overflow: 'hidden', cursor: item.slug ? 'pointer' : 'default', pointerEvents: item.slug ? 'auto' : 'none' }}
                                    >
                                        {item.image ? (
                                            <img src={resolveUrl(item.image) || '/assets/mariot-logo2.webp'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/mariot-logo2.webp'; }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Package size={32} /></div>
                                        )}
                                    </Link>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <Link
                                                href={item.slug ? `/product/${item.slug}` : '#'}
                                                style={{ textDecoration: 'none', color: 'inherit', cursor: item.slug ? 'pointer' : 'default', pointerEvents: item.slug ? 'auto' : 'none' }}
                                            >
                                                {locale === 'ar' && item.name_ar ? item.name_ar : item.name}
                                            </Link>
                                            {isFree && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#10b981', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4 }}>FREE</span>
                                            )}
                                        </h4>
                                        {isFree && parentName && (
                                            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Free gift with {parentName}</div>
                                        )}
                                        {itemVariantLine(item) && (
                                            <div style={{ color: '#475569', fontSize: '12px', marginBottom: '4px' }}>{itemVariantLine(item)}</div>
                                        )}
                                        <div style={{ color: isFree ? '#10b981' : '#64748b', fontSize: '13px', fontWeight: isFree ? 700 : 400 }}>
                                            {isFree ? <>{t('orders.qty')} {item.quantity}  ×  FREE</> : <>{t('orders.qty')} {item.quantity}  ×  <CurrencyPrice amount={parseFloat(item.price_at_purchase)} /></>}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: isFree ? '#10b981' : undefined }}>
                                        {isFree ? 'FREE' : <CurrencyPrice amount={item.quantity * parseFloat(item.price_at_purchase)} />}
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#475569' }}>
                                <span>{t('orders.subtotal')} <small>{t('orders.isTaxIncl')}</small></span>
                                <span><CurrencyPrice amount={parseFloat(selectedOrder.total_amount)} /></span>
                            </div>
                            {(parseFloat(selectedOrder.discount_amount) > 0 || parseFloat(selectedOrder.points_discount) > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#ef4444' }}>
                                    <span>{t('orders.discountApplied')}</span>
                                    <span>- <CurrencyPrice amount={parseFloat(selectedOrder.discount_amount || 0) + parseFloat(selectedOrder.points_discount || 0)} /></span>
                                </div>
                            )}
                            {Number(selectedOrder.points_used) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#475569' }}>
                                    <span>{t('orders.pointsRedeemed')}</span>
                                    <span style={{ color: '#dc2626' }}>- {Number(selectedOrder.points_used)} {t('rewards.ptsShort')}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#475569' }}>
                                <span>{t('orders.vat')}</span>
                                <span><CurrencyPrice amount={parseFloat(selectedOrder.vat_amount)} /></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                <span>{t('orders.totalPaid')}</span>
                                <span><CurrencyPrice amount={parseFloat(selectedOrder.final_amount)} /></span>
                            </div>
                        </div>
                        </>)}
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
                                        <div className={`${styles.orderIconWrapper} ${styles[`iconBg_${order.status}`]}`}>
                                            {order.first_item_image ? (
                                                <img
                                                    src={resolveUrl(order.first_item_image)}
                                                    alt={`${t('orders.orderNumber')}${order.id}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <Package size={24} />
                                            )}
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
                                                <div className={styles.metaSeparator}>|</div>
                                                <div className={styles.orderMetaItem}>
                                                    <div className={styles.totalBlock}>
                                                        <span className={styles.totalLabel}>{t('orders.total')}</span>
                                                        <span className={styles.orderPrice}>
                                                            <CurrencyPrice amount={parseFloat(order.final_amount)} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.orderActions}>
                                        <button
                                            className={`${styles.orderViewBtn} ${styles[`btnBorder_${order.status}`]}`}
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
                                            {loadingOrderDetails && selectedOrder?.id === order.id ? t('common.loading') : (
                                                <div className={styles.btnContent}>
                                                    {t('orders.view')}
                                                    <ChevronRight size={16} />
                                                </div>
                                            )}
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
            const profileTabs = ['Personal Info', 'Business Info', 'Sign-in Info'];

            return (
                <div className={styles.profileSection}>
                    <div className={styles.profileTabs}>
                        {profileTabs.map(tab => (
                            <span
                                key={tab}
                                className={`${styles.profileTab} ${profileTab === tab ? styles.profileTabActive : ''}`}
                                onClick={() => setProfileTab(tab)}
                            >
                                {tab === 'Business Info' ? (tabTranslations['Bussiness Info'] || tab) : (tabTranslations[tab] || tab)}
                            </span>
                        ))}
                    </div>

                    <form onSubmit={handleProfileUpdate} className={styles.profileForm}>
                        {message && (
                            <div className={`${styles.messageAlert} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
                                {message.type === 'success' ? <Check size={18} /> : null}
                                <span>{message.text}</span>
                            </div>
                        )}

                        {profileTab === 'Personal Info' && (
                            <div className={styles.formContentFadeIn}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="first_name" className={styles.formLabel}>{t('profile.firstName')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="text"
                                            id="first_name"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.firstName')}
                                            autoComplete="given-name"
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="last_name" className={styles.formLabel}>{t('profile.lastName')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="text"
                                            id="last_name"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.lastName')}
                                            autoComplete="family-name"
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="phone_number" className={styles.formLabel}>{t('profile.phoneNumber')}</label>
                                    <div className={styles.inputActionGroup}>
                                        <input
                                            type="tel"
                                            id="phone_number"
                                            name="phone_number"
                                            value={formData.phone_number}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.phoneNumber')}
                                            autoComplete="tel"
                                        />
                                        {formData.phone_number && user?.phone_number === formData.phone_number && user?.phone_verified ? (
                                            <span className={styles.verifiedBadge}>
                                                <Check size={16} strokeWidth={2.5} /> {t('profile.verified')}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setOtpOpen(true)}
                                                disabled={!formData.phone_number || formData.phone_number.length < 7}
                                                className={`${styles.actionBtn} ${(!formData.phone_number || formData.phone_number.length < 7) ? styles.actionBtnDisabled : styles.actionBtnPrimary}`}
                                            >
                                                {t('profile.verify')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="email" className={styles.formLabel}>{t('profile.emailAddress')}</label>
                                    <div className={styles.inputActionGroup}>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.emailAddress')}
                                            autoComplete="email"
                                            spellCheck={false}
                                        />
                                        {formData.email && user?.email === formData.email && user?.email_verified ? (
                                            <span className={styles.verifiedBadge}>
                                                <Check size={16} strokeWidth={2.5} /> {t('profile.verified')}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => { setPendingEmail(formData.email); setEmailOtpOpen(true); }}
                                                disabled={!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)}
                                                className={`${styles.actionBtn} ${(!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) ? styles.actionBtnDisabled : styles.actionBtnPrimary}`}
                                            >
                                                {t('profile.verify')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {profileTab === 'Business Info' && (
                            <div className={styles.formContentFadeIn}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="company_name" className={styles.formLabel}>{t('profile.companyName')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="text"
                                            id="company_name"
                                            name="company_name"
                                            value={formData.company_name}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.companyName')}
                                            autoComplete="organization"
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="vat_number" className={styles.formLabel}>{t('profile.vatNumber')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="text"
                                            id="vat_number"
                                            name="vat_number"
                                            value={formData.vat_number}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.vatNumber')}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {profileTab === 'Sign-in Info' && (
                            <div className={styles.formContentFadeIn}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="signin_email" className={styles.formLabel}>{t('profile.emailAddress')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="email"
                                            id="signin_email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.emailAddress')}
                                            autoComplete="email"
                                            spellCheck={false}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="password" className={styles.formLabel}>{t('profile.changePassword')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="password"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className={styles.formInput}
                                            placeholder={t('profile.passwordPlaceholder')}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.submitBtn} disabled={saving}>
                                {saving ? (
                                    <>
                                        <span className={styles.btnSpinner}></span>
                                        {t('profile.saving')}
                                    </>
                                ) : t('profile.save')}
                            </button>
                        </div>
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
                                                        <DirhamSymbol size="1em" />
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
                    <div style={{ marginBottom: '20px', ...(locale === 'ar' ? { textAlign: 'right' } : {}) }}>
                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t('addresses.title')}</h2>
                    </div>

                    <button type="button" className={styles.addrAddDashed} onClick={openAddAddressForm}>
                        <Plus size={20} />
                        <span>{t('addresses.addNew')}</span>
                    </button>

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
                        <>
                        <div className={styles.addrSheetOverlay} onClick={() => setShowAddressForm(false)} />
                        <form onSubmit={handleAddAddress} className={styles.addrForm}>
                            <div className={styles.addrSheetHandle} />
                            <h3 className={styles.addrFormTitle}>{editingAddressId ? t('addresses.edit') : t('addresses.addNew')}</h3>

                            {(() => {
                                const homeTaken = addresses.some(a => a.address_type === 'home' && a.id !== editingAddressId);
                                const workTaken = addresses.some(a => a.address_type === 'work' && a.id !== editingAddressId);
                                const types = [
                                    { key: 'home', label: t('addresses.typeHome'), icon: <Home size={17} />, disabled: homeTaken },
                                    { key: 'work', label: t('addresses.typeWork'), icon: <Building2 size={17} />, disabled: workTaken },
                                    { key: 'other', label: t('addresses.typeOther'), icon: <MapPin size={17} />, disabled: false },
                                ];
                                return (
                                    <div className={styles.addrTypeRow}>
                                        {types.map(tp => (
                                            <button
                                                type="button"
                                                key={tp.key}
                                                disabled={tp.disabled}
                                                className={`${styles.addrTypeBtn} ${addressForm.address_type === tp.key ? styles.addrTypeBtnActive : ''}`}
                                                onClick={() => setAddressForm({ ...addressForm, address_type: tp.key })}
                                            >
                                                {tp.icon}
                                                <span>{tp.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })()}

                            {addressForm.address_type === 'other' && (
                                <div className={styles.addrField} style={{ marginBottom: '14px' }}>
                                    <label className={styles.addrLabel}>{t('addresses.labelName')} <span className={styles.addrReq}>*</span></label>
                                    <input type="text" required className={styles.addrInput} value={addressForm.address_label}
                                        maxLength={100}
                                        onChange={(e) => setAddressForm({ ...addressForm, address_label: e.target.value })}
                                        placeholder={t('addresses.labelNamePlaceholder')} />
                                </div>
                            )}

                            <div className={styles.addrGrid}>
                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.firstName')} <span className={styles.addrReq}>*</span></label>
                                    <input type="text" required className={styles.addrInput} value={addressForm.first_name}
                                        onChange={(e) => setAddressForm({ ...addressForm, first_name: e.target.value })} placeholder="e.g. John" />
                                </div>
                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.lastName')}</label>
                                    <input type="text" className={styles.addrInput} value={addressForm.last_name}
                                        onChange={(e) => setAddressForm({ ...addressForm, last_name: e.target.value })} placeholder="e.g. Doe" />
                                </div>

                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.companyName')}</label>
                                    <input type="text" className={styles.addrInput} value={addressForm.company_name}
                                        onChange={(e) => setAddressForm({ ...addressForm, company_name: e.target.value })} placeholder="Company LLC (Optional)" />
                                </div>
                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.email')} <span className={styles.addrReq}>*</span></label>
                                    <input type="email" required className={styles.addrInput} value={addressForm.email}
                                        onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })} placeholder="john@example.com" />
                                </div>

                                <div className={`${styles.addrField} ${styles.addrFull}`}>
                                    <label className={styles.addrLabel}>{t('addresses.line1')} <span className={styles.addrReq}>*</span></label>
                                    <input type="text" required className={styles.addrInput} value={addressForm.address_line1}
                                        onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })} placeholder={t('addresses.line1Placeholder')} />
                                </div>
                                <div className={`${styles.addrField} ${styles.addrFull}`}>
                                    <label className={styles.addrLabel}>{t('addresses.line2')}</label>
                                    <input type="text" className={styles.addrInput} value={addressForm.address_line2}
                                        onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })} placeholder={t('addresses.line2Placeholder')} />
                                </div>

                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.city')} <span className={styles.addrReq}>*</span></label>
                                    <input type="text" required className={styles.addrInput} value={addressForm.city}
                                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} placeholder={t('addresses.cityPlaceholder')} />
                                </div>
                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.state')}</label>
                                    <input type="text" required className={styles.addrInput} value={addressForm.state}
                                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} placeholder={t('addresses.statePlaceholder')} />
                                </div>
                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.zip')}</label>
                                    <input type="text" className={styles.addrInput} value={addressForm.zip_code}
                                        onChange={(e) => setAddressForm({ ...addressForm, zip_code: e.target.value })} placeholder={t('addresses.zipPlaceholder')} />
                                </div>
                                <div className={styles.addrField}>
                                    <label className={styles.addrLabel}>{t('addresses.phone')} <span className={styles.addrReq}>*</span></label>
                                    <input type="tel" required dir="ltr" className={styles.addrInput} value={addressForm.phone}
                                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} placeholder={t('addresses.phonePlaceholder')} />
                                </div>
                            </div>

                            <label className={styles.addrCheckRow}>
                                <input type="checkbox" checked={addressForm.is_default}
                                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })} />
                                <span>{t('addresses.setAsDefault')}</span>
                            </label>

                            <div className={styles.addrActions}>
                                <button type="button" className={styles.addrCancelBtn} onClick={() => setShowAddressForm(false)}>
                                    {t('addresses.cancel')}
                                </button>
                                <button type="submit" className={styles.addrSubmitBtn} disabled={saving}>
                                    {saving ? (editingAddressId ? t('addresses.updating') : t('addresses.adding')) : (editingAddressId ? t('addresses.update') : t('addresses.add'))}
                                </button>
                            </div>
                        </form>
                        </>
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
                                {addresses.map((addr) => {
                                    const typeLabel = addr.address_type === 'home' ? t('addresses.typeHome') : addr.address_type === 'work' ? t('addresses.typeWork') : (addr.address_label || t('addresses.typeOther'));
                                    const typeIcon = addr.address_type === 'home' ? <Home size={20} /> : addr.address_type === 'work' ? <Building2 size={20} /> : <MapPin size={20} />;
                                    return (
                                    <div key={addr.id} className={`${styles.addressCard} ${addr.is_default ? styles.addressCardDefault : ''}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                                        <div className={styles.addrCardHead}>
                                            <div className={styles.addrCardIcon}>{typeIcon}</div>
                                            <div className={styles.addrCardHeadText}>
                                                <span className={styles.addrCardType}>{typeLabel}</span>
                                                {!!addr.is_default && <span className={styles.addrCardDefaultTag}>{t('addresses.default')}</span>}
                                            </div>
                                            <div className={styles.addrMenuWrap}>
                                                <button
                                                    type="button"
                                                    className={styles.addrMenuBtn}
                                                    aria-label="Options"
                                                    onClick={() => setOpenAddrMenu(openAddrMenu === addr.id ? null : addr.id)}
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>
                                                {openAddrMenu === addr.id && (
                                                    <>
                                                        <div className={styles.addrMenuBackdrop} onClick={() => setOpenAddrMenu(null)} />
                                                        <div className={styles.addrMenu}>
                                                            <button type="button" className={styles.addrMenuItem} onClick={() => handleEditAddress(addr)}>
                                                                <Edit2 size={15} /> {t('addresses.edit')}
                                                            </button>
                                                            <button type="button" className={`${styles.addrMenuItem} ${styles.addrMenuItemDanger}`} onClick={() => { setOpenAddrMenu(null); handleDeleteAddress(addr.id); }}>
                                                                <Trash2 size={15} /> {t('addresses.delete')}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.addrCardBody}>
                                            {!!addr.company_name && <p className={styles.addrCardLine} style={{ fontWeight: 600, color: '#0f172a' }}>{addr.company_name}</p>}
                                            <p className={styles.addrCardLine}>
                                                {addr.address_line1}
                                                {!!addr.address_line2 && <>, {addr.address_line2}</>}
                                            </p>
                                            <p className={styles.addrCardLine}>{[addr.city, addr.state, addr.zip_code].filter(Boolean).join(', ')}</p>
                                            <div className={styles.addrCardContact}>
                                                <span className={styles.addrCardName}>{addr.first_name} {addr.last_name}</span>
                                                {!!addr.phone && (
                                                    <span className={styles.addrCardPhone}>
                                                        <span dir="ltr">{addr.phone}</span>
                                                        <BadgeCheck size={16} className={styles.addrCardVerified} />
                                                    </span>
                                                )}
                                                {!addr.phone && <BadgeCheck size={16} className={styles.addrCardVerified} />}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )
                    }
                </div >
            );
        }

        if (activeSection === 'payments') {
            const cardLabels = {
                newCard: t('payments.cards.useNewCard'), addCard: t('payments.cards.addCard'),
                empty: t('payments.cards.noSavedCards'), defaultBadge: t('payments.cards.defaultBadge'),
                expiredBadge: t('payments.cards.expiredBadge'), expires: t('payments.cards.expires'),
                makeDefault: t('payments.cards.makeDefault'), edit: t('payments.cards.edit'),
                remove: t('payments.cards.remove'), manageTitle: t('payments.cards.manageTitle'),
                addTitle: t('payments.cards.addTitle'), editTitle: t('payments.cards.editTitle'),
                removeTitle: t('payments.cards.removeTitle'), nameOnCard: t('payments.cards.nameOnCard'),
                namePlaceholder: t('payments.cards.namePlaceholder'), cardNumber: t('payments.cards.cardNumber'),
                expiry: t('payments.cards.expiry'), cvc: t('payments.cards.cvc'),
                expiryMonth: t('payments.cards.expiryMonth'), expiryYear: t('payments.cards.expiryYear'),
                setAsDefault: t('payments.cards.setAsDefault'), secureNote: t('payments.cards.secureNote'),
                editHint: t('payments.cards.editHint'), removeConfirm: t('payments.cards.removeConfirm'),
                removeConfirmSub: t('payments.cards.removeConfirmSub'), save: t('payments.cards.save'),
                saving: t('payments.cards.saving'), cancel: t('payments.cards.cancel'),
                add: t('payments.cards.add'), adding: t('payments.cards.adding'),
                removing: t('payments.cards.removing'), done: t('payments.cards.done'),
            };

            return (
                <div className={styles.quotationsContainer}>
                    {/* Saved cards sit above the transaction list: managing how you pay
                        is a live action, the history below it is a record. */}
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t('payments.cards.savedCardsTitle')}</h2>
                        <button
                            type="button"
                            className={styles.manageCardsBtn}
                            onClick={() => openCardManager('add')}
                        >
                            <Plus size={15} />
                            {t('payments.cards.addCard')}
                        </button>
                    </div>

                    <div className={styles.savedCardsWrap}>
                        <SavedCards
                            cards={savedCards}
                            loading={cardsLoading}
                            error={cardsError}
                            mode="manage"
                            busyId={cardBusyId}
                            onEdit={(card) => openCardManager('edit', card)}
                            onDelete={(card) => openCardManager('confirmDelete', card)}
                            onSetDefault={handleCardSetDefault}
                            labels={cardLabels}
                        />
                    </div>

                    <CardManagerModal
                        open={cardManagerOpen}
                        onClose={() => setCardManagerOpen(false)}
                        onChange={setSavedCards}
                        initialView={cardManagerView}
                        initialCard={cardManagerTarget}
                        labels={cardLabels}
                        isRtl={locale === 'ar'}
                    />

                    <div className={styles.sectionHeader} style={{ marginTop: '28px' }}>
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
                                            <CurrencyPrice amount={parseFloat(order.final_amount)} />
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

        if (activeSection === 'myRewards') {
            const profileComplete = !!user?.profile_bonus_awarded;
            const filteredHistory = rewardsFilter === 'all'
                ? rewardHistory
                : rewardHistory.filter((r) => r.transaction_type === rewardsFilter);
            return (
                <div className={styles.quotationsContainer}>
                    <div className={styles.sectionHeader} style={{ marginBottom: 12 }}>
                        <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>{t('nav.myRewards')}</h2>
                    </div>

                    <div className={styles.rewardTabs}>
                        <button
                            type="button"
                            className={`${styles.rewardTab} ${rewardsTab === 'earn' ? styles.rewardTabActive : ''}`}
                            onClick={() => setRewardsTab('earn')}
                        >
                            {t('rewards.earnPoints')}
                        </button>
                        <button
                            type="button"
                            className={`${styles.rewardTab} ${rewardsTab === 'history' ? styles.rewardTabActive : ''}`}
                            onClick={() => setRewardsTab('history')}
                        >
                            {t('rewards.statementTitle')}
                        </button>
                    </div>

                    {rewardsTab === 'earn' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 280px))', gap: 16 }}>
                        {!profileComplete && (
                        <div className={styles.rewardEarnCard} style={{
                            background: '#ffffff',
                            border: '1px solid #94a3b8',
                            borderRadius: 16,
                            padding: '28px 22px 22px',
                            textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                        }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                background: '#f0fdfa',
                                color: '#0d9488',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 14px'
                            }}>
                                <User size={28} strokeWidth={2} />
                            </div>

                            <span style={{
                                display: 'inline-block',
                                background: '#fef9c3',
                                color: '#92400e',
                                padding: '6px 14px',
                                borderRadius: 999,
                                fontSize: 13,
                                fontWeight: 700,
                                marginBottom: 14
                            }}>
                                {t('rewards.bonusChip', { points: 3000 })}
                            </span>

                            <h3 style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#0f172a',
                                margin: '0 0 8px',
                                lineHeight: 1.3
                            }}>
                                {t('rewards.completeProfileTitle')}
                            </h3>

                            <p style={{
                                fontSize: 13,
                                color: '#64748b',
                                lineHeight: 1.55,
                                margin: '0 0 18px'
                            }}>
                                {t('rewards.completeProfileDesc')}
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    if (profileComplete) return;
                                    setActiveSection('profileSecurity');
                                    router.push('/profile?tab=profileSecurity', { scroll: false });
                                }}
                                disabled={profileComplete}
                                aria-disabled={profileComplete}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: profileComplete ? '#dcfce7' : '#f1f5f9',
                                    color: profileComplete ? '#166534' : '#0f172a',
                                    border: profileComplete ? '1px solid #bbf7d0' : 'none',
                                    padding: '10px 18px',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: profileComplete ? 'not-allowed' : 'pointer',
                                    pointerEvents: profileComplete ? 'none' : 'auto',
                                    opacity: profileComplete ? 0.85 : 1
                                }}
                            >
                                {t('rewards.fillProfileCta')}
                                <ArrowUpRight size={16} />
                            </button>
                        </div>
                        )}
                        {profileComplete && (
                            <div className={styles.rewardStatementEmpty} style={{ gridColumn: '1 / -1' }}>
                                {t('rewards.allBonusClaimed')}
                            </div>
                        )}
                    </div>
                    )}

                    {rewardsTab === 'earn' && (
                    <div style={{
                        marginTop: 18,
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                        fontSize: 14,
                        color: '#64748b'
                    }}>
                        <span>{t('rewards.affiliatePrompt')}</span>
                        <Link
                            href="/affiliate-program"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#0d9488',
                                fontWeight: 600,
                                textDecoration: 'underline'
                            }}
                        >
                            {t('rewards.affiliateLink')}
                            <ArrowUpRight size={15} />
                        </Link>
                    </div>
                    )}

                    {rewardsTab === 'history' && (
                        <div className={styles.rewardStatement}>
                        {!loadingRewardHistory && rewardHistory.length > 0 && (
                            <div className={styles.rewardFilters}>
                                {([
                                    ['all', t('rewards.filterAll')],
                                    ['earned', t('rewards.credited')],
                                    ['redeemed', t('rewards.redeemed')]
                                ] as const).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`${styles.rewardFilterChip} ${rewardsFilter === key ? styles.rewardFilterChipActive : ''}`}
                                        onClick={() => { setRewardsFilter(key); setRewardsPage(1); }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {loadingRewardHistory ? (
                            <div className={styles.rewardStatementEmpty}>{t('rewards.statementLoading')}</div>
                        ) : filteredHistory.length === 0 ? (
                            <div className={styles.rewardStatementEmpty}>{t('rewards.statementEmpty')}</div>
                        ) : (
                            <ul className={styles.rewardStatementList}>
                                {filteredHistory.slice((rewardsPage - 1) * REWARDS_PER_PAGE, rewardsPage * REWARDS_PER_PAGE).map((row) => {
                                    const refunded = row.transaction_type === 'refunded';
                                    const expired = row.transaction_type === 'expired';
                                    const reversed = row.transaction_type === 'reversed';
                                    // Credits add points back (earned from purchase, or refunded on cancel).
                                    const credit = row.transaction_type === 'earned' || refunded;
                                    const earned = credit; // icon/colour use the credit flag
                                    const typeLabel = row.transaction_type === 'earned'
                                        ? t('rewards.credited')
                                        : refunded
                                            ? t('rewards.refunded')
                                            : expired
                                                ? t('rewards.expired')
                                                : reversed
                                                    ? t('rewards.reversed')
                                                    : t('rewards.redeemed');
                                    const sign = credit ? '+' : '-';
                                    const dateStr = new Date(row.created_at).toLocaleDateString(
                                        locale === 'ar' ? 'ar-AE' : 'en-GB',
                                        { day: '2-digit', month: 'short', year: 'numeric' }
                                    );
                                    const clickable = !!row.order_id;
                                    return (
                                        <li
                                            key={row.id}
                                            className={`${styles.rewardStatementRow} ${clickable ? styles.rewardStatementRowClickable : ''}`}
                                            onClick={clickable ? () => openOrderById(row.order_id) : undefined}
                                            role={clickable ? 'button' : undefined}
                                            tabIndex={clickable ? 0 : undefined}
                                            onKeyDown={clickable ? (e) => { if (e.key === 'Enter') openOrderById(row.order_id); } : undefined}
                                        >
                                            <span className={`${styles.rewardStatementIcon} ${earned ? styles.rewardCredit : styles.rewardDebit}`}>
                                                {earned ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                            </span>
                                            <div className={styles.rewardStatementMeta}>
                                                <span className={styles.rewardStatementType}>
                                                    {typeLabel}
                                                    {row.order_id ? ` · ${t('rewards.orderRef', { id: row.order_id })}` : ''}
                                                </span>
                                                {row.description && (
                                                    <span className={styles.rewardStatementDesc}>{localizeRewardDesc(row)}</span>
                                                )}
                                                <span className={styles.rewardStatementDate}>{dateStr}</span>
                                            </div>
                                            <span className={`${styles.rewardStatementPoints} ${earned ? styles.rewardCredit : styles.rewardDebit}`}>
                                                {sign}{Math.abs(Number(row.points))} {t('rewards.ptsShort')}
                                            </span>
                                            {clickable && <ChevronRight size={16} className={styles.rewardStatementChevron} />}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {!loadingRewardHistory && filteredHistory.length > REWARDS_PER_PAGE && (() => {
                            const totalPages = Math.ceil(filteredHistory.length / REWARDS_PER_PAGE);
                            return (
                                <div className={styles.rewardPagination}>
                                    <button
                                        type="button"
                                        className={styles.rewardPageBtn}
                                        onClick={() => setRewardsPage(p => Math.max(1, p - 1))}
                                        disabled={rewardsPage <= 1}
                                        aria-label="Previous"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className={styles.rewardPageInfo}>
                                        {t('rewards.pageOf', { page: rewardsPage, total: totalPages })}
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.rewardPageBtn}
                                        onClick={() => setRewardsPage(p => Math.min(totalPages, p + 1))}
                                        disabled={rewardsPage >= totalPages}
                                        aria-label="Next"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            );
                        })()}
                        </div>
                    )}
                </div>
            );
        }

        const currentNavItem = navItems.find(item => item.name === activeSection);
        const sectionDisplayName = currentNavItem ? currentNavItem.translationName : activeSection;

        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                    <Inbox size={60} strokeWidth={1} />
                </div>
                <h3 className={styles.emptyText}>{t('comingSoon', { section: sectionDisplayName })}</h3>
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
                        <div className={styles.userCardInner}>
                            <div className={styles.userAvatar}>
                                <User size={24} />
                            </div>
                            <div className={styles.userInfo}>
                                <h2 className={styles.welcomeText}>
                                    {t('hello', { name: user.name })}
                                </h2>
                                <p className={styles.emailText}>{user.email}</p>
                            </div>
                        </div>
                        <div className={styles.statusIndicator}>
                            <span className={styles.statusDot}></span>
                            {t('activeSession')}
                        </div>
                        <span className={styles.points}>{user.reward_points || 0} {t('points')}</span>
                        <p className={styles.congratsText} dangerouslySetInnerHTML={{
                            __html: t.raw('rewardCongrats').replace('{amount}', ((user.reward_points || 0) * pointRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                        }} />
                    </div>

                    <nav className={styles.nav} ref={navRef}>
                        {navItems.map((item, idx) => (
                            <React.Fragment key={item.name}>
                                {idx === 3 && <div className={styles.divider} />}
                                <button
                                    onClick={() => {
                                        if (item.name === 'sellerDashboard') {
                                            router.push('/sellerDashboard');
                                        } else {
                                            setActiveSection(item.name);
                                            // Update URL to keep it in sync
                                            router.push(`/profile?tab=${item.name}`, { scroll: false });
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

            <OtpVerifyModal
                open={otpOpen}
                onClose={() => setOtpOpen(false)}
                onVerified={async (data) => {
                    await refreshUser();
                    setOtpOpen(false);
                    // When the bonus fires, the Header reward toast covers it —
                    // don't stack a second "verified" notification on top.
                    if (!data?.bonus_awarded) {
                        showNotification(t('profile.verifySuccess') || 'Mobile number verified successfully!', 'success');
                    }
                }}
                phoneNumber={formData.phone_number}
            />

            <EmailOtpModal
                open={emailOtpOpen}
                mode="profile-email"
                newEmail={pendingEmail}
                onClose={() => setEmailOtpOpen(false)}
                onChangeEmail={() => setEmailOtpOpen(false)}
                onVerified={async (data) => {
                    await refreshUser();
                    setEmailOtpOpen(false);
                    if (!data?.bonus_awarded) {
                        showNotification('Email verified successfully', 'success');
                    }
                }}
            />
        </div>
    );
};

export default UserDashboard;

