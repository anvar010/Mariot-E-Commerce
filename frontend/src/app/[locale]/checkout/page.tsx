'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useTranslations, useLocale } from 'next-intl';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import Script from 'next/script';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import {
    CreditCard,
    Truck,
    ShieldCheck,
    Lock,
    CreditCard as CardIcon,
    Banknote,
    Clock,
    User,
    Mail,
    Phone,
    MapPin,
    Building,
    ChevronDown,
    ShoppingBag,
    Ticket,
    X as CloseIcon,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import styles from './checkout.module.css';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import OtpVerifyModal from '@/components/shared/OtpVerifyModal/OtpVerifyModal';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');

function CheckoutContent() {
    const stripe = useStripe();
    const elements = useElements();
    const { cartItems, cartTotal, discountAmount, pointsToUse, pointsDiscountAmount, appliedCoupon, clearCart, applyDiscount, removeDiscount } = useCart();
    const { user, token, loading, refreshUser } = useAuth();
    const [otpOpen, setOtpOpen] = useState(false);
    const { showNotification } = useNotification();
    const n = useTranslations('notifications');
    const t = useTranslations('checkout');
    const common = useTranslations('common');
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = useLocale();

    // Handle Tabby redirect statuses (cancel/failure)
    useEffect(() => {
        const tabbyStatus = searchParams.get('tabby_status');
        if (tabbyStatus === 'cancel') {
            showNotification(n('tabbyCancel'), 'error');
        } else if (tabbyStatus === 'failure') {
            showNotification(n('tabbyFailure'), 'error');
        }
    }, [searchParams]);

    const [form, setForm] = useState({
        firstName: user?.name ? user.name.split(' ')[0] : '',
        lastName: user?.name ? user.name.split(' ').slice(1).join(' ') : '',
        companyName: '',
        country: 'United Arab Emirates',
        streetAddress: '',
        additionalAddress: '',
        city: '',
        postcode: '',
        phone: user?.phone_number || '',
        email: user?.email || '',
        orderNotes: ''
    });

    const [paymentMethod, setPaymentMethod] = useState('card');
    const [isProcessing, setIsProcessing] = useState(false);

    const [cardDetails, setCardDetails] = useState({
        name: '',
        number: '',
        expiry: '',
        cvc: ''
    });

    const [couponCode, setCouponCode] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
    const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
    const [userAddresses, setUserAddresses] = useState<any[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<number | string>('');
    const [activeBrandsPopup, setActiveBrandsPopup] = useState<number | null>(null);
    const [activeProductsPopup, setActiveProductsPopup] = useState<number | null>(null);
    const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
    const addressDropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addressDropdownRef.current && !addressDropdownRef.current.contains(event.target as Node)) {
                setIsAddressDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddressDropdownToggle = () => setIsAddressDropdownOpen(!isAddressDropdownOpen);

    const handleAddressOptionClick = (addr: any) => {
        setSelectedAddressId(addr.id);
        setIsAddressDropdownOpen(false);

        // Populate form fields directly from the saved address
        setForm(prev => ({
            ...prev,
            firstName: addr.first_name || '',
            lastName: addr.last_name || '',
            companyName: addr.company_name || '',
            email: addr.email || '',
            streetAddress: addr.address_line1 || '',
            additionalAddress: addr.address_line2 || '',
            city: addr.city || '',
            postcode: addr.zip_code || '',
            phone: addr.phone || '',
            country: addr.country || 'United Arab Emirates'
        }));
    };

    const handleNewAddressClick = () => {
        setSelectedAddressId('');
        setIsAddressDropdownOpen(false);
        setForm(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            companyName: '',
            streetAddress: '',
            additionalAddress: '',
            city: '',
            postcode: '',
            phone: '',
            email: ''
        }));
    };

    // Calculate final processing totals early so useEffects can use them
    const finalTotal = cartTotal;

    const fetchAddresses = async () => {
        if (!user) return;
        setLoadingAddresses(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/addresses`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setUserAddresses(data.data || []);
                // If there's a default address, pre-fill it!
                const defaultAddr = data.data.find((a: any) => a.is_default);
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setForm(prev => ({
                        ...prev,
                        firstName: defaultAddr.first_name || '',
                        lastName: defaultAddr.last_name || '',
                        companyName: defaultAddr.company_name || '',
                        email: defaultAddr.email || '',
                        streetAddress: defaultAddr.address_line1 || '',
                        additionalAddress: defaultAddr.address_line2 || '',
                        city: defaultAddr.city || '',
                        postcode: defaultAddr.zip_code || '',
                        phone: defaultAddr.phone || '',
                        country: defaultAddr.country || 'United Arab Emirates'
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
        } finally {
            setLoadingAddresses(false);
        }
    };

    const fetchCoupons = async () => {
        setIsLoadingCoupons(true);
        try {
            const res = await fetch(`${API_BASE_URL}/coupons`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setAvailableCoupons(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
        } finally {
            setIsLoadingCoupons(false);
        }
    };

    useEffect(() => {
        if (showCouponModal) {
            fetchCoupons();
        }
    }, [showCouponModal]);

    useEffect(() => {
        if (!loading && !user && !token) {
            router.push(`/signin?redirectTo=/checkout&reason=purchase`);
        }
    }, [user, token, loading, router, locale]);

    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    // Force re-render of Tabby Promo if coming back to the tab
    useEffect(() => {
        if (paymentMethod === 'tabby' && typeof window !== 'undefined' && (window as any).TabbyPromo) {
            setTimeout(() => {
                const tabbyElement = document.getElementById('TabbyPromoPayment');
                if (tabbyElement && !tabbyElement.innerHTML) {
                    try {
                        new (window as any).TabbyPromo({
                            selector: '#TabbyPromoPayment',
                            currency: 'AED',
                            price: finalTotal,
                            installmentsCount: 4,
                            lang: locale === 'ar' ? 'ar' : 'en',
                            source: 'checkout',
                            publicKey: process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || 'pk_test_b6ac7af8-c300-4eb6-9ba6-a19ae3bf84de',
                            merchantCode: 'MARIOT'
                        });
                    } catch (e) {
                        console.error('Tabby Promo Re-init Error', e);
                    }
                }
            }, 50); // Small delay to guarantee React has committed the DOM node
        }
    }, [paymentMethod, finalTotal, locale]);



    const handleApplyCoupon = async (e: React.FormEvent | string) => {
        if (typeof e !== 'string' && e) e.preventDefault();
        const codeToApply = typeof e === 'string' ? e : couponCode.trim();

        if (!codeToApply) return;

        setIsApplyingCoupon(true);
        try {
            const success = await applyDiscount(codeToApply);
            if (success) {
                setCouponCode('');
                setShowCouponModal(false);
            }
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('localhost:5000')) {
            return url.replace('http://localhost:5000', BASE_URL);
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;

        if (name === 'number') {
            value = value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
        }

        if (name === 'expiry') {
            value = value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
            }
        }

        if (name === 'cvc') {
            value = value.replace(/\D/g, '').slice(0, 4);
        }

        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            showNotification(n('checkoutSignin'), 'error');
            return;
        }

        if (cartItems.length === 0) {
            showNotification(n('cartEmpty'), 'error');
            return;
        }

        if (!user?.phone_verified) {
            setOtpOpen(true);
            return;
        }

        setIsProcessing(true);

        try {
            if (paymentMethod === 'card') {
                if (!stripe || !elements) {
                    showNotification(t('processing'), 'error'); // Fallback error if Stripe isn't ready
                    setIsProcessing(false);
                    return;
                }
                if (!cardDetails.name) {
                    showNotification(n('cardDetailsRequired'), 'error');
                    setIsProcessing(false);
                    return;
                }
            }

            const orderData = {
                items: cartItems.map(item => ({
                    product_id: item.id,
                    variant_id: item.variant_id ?? null,
                    quantity: item.quantity,
                    price: item.price
                })),
                shipping_address_id: selectedAddressId || 1, // Use selected if exists, 1 is placeholder
                payment_method: paymentMethod,
                points_to_use: pointsToUse,
                discount_amount: discountAmount + pointsDiscountAmount,
                coupon_id: appliedCoupon?.id,
                billing_details: {
                    ...form,
                    name: `${form.firstName} ${form.lastName}`
                },
                locale: locale
            };

            const res = await fetch(`${API_BASE_URL}/orders`, {
                credentials: "include",
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const data = await res.json();

            if (data.success) {
                // Stripe Card Payment handling
                if (data.requires_payment && data.client_secret) {
                    const cardNumberElement = elements?.getElement(CardNumberElement);
                    if (cardNumberElement && stripe) {
                        const { error, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
                            payment_method: {
                                card: cardNumberElement,
                                billing_details: {
                                    name: cardDetails.name,
                                    email: form.email || undefined,
                                    phone: form.phone || undefined,
                                    address: {
                                        city: form.city || undefined,
                                        country: 'AE',
                                        line1: form.streetAddress || undefined,
                                        line2: form.additionalAddress || undefined,
                                        postal_code: form.postcode || undefined,
                                    }
                                }
                            }
                        });

                        if (error) {
                            showNotification(error.message || n('orderFailed'), 'error');
                            setIsProcessing(false);
                            return;
                        }

                        if (paymentIntent && paymentIntent.status === 'succeeded') {
                            await clearCart();
                            showNotification(n('orderSuccess'));
                            router.push(`/checkoutsuccess?orderId=${data.data?.id || ''}`);
                            return;
                        }
                    }
                }
                // Dev Mock handling
                else if (data.payment_mock) {
                    await clearCart();
                    showNotification(n('mockPaymentSuccess'));
                    router.push(`/checkoutsuccess?orderId=${data.data?.id || ''}`);
                    return;
                }
                // If payment method requires redirect (like Tabby)
                else if (data.requires_redirect && data.redirect_url) {
                    showNotification(t('redirectingToPayment'), 'info');
                    window.location.href = data.redirect_url;
                } else {
                    // Only clear frontend cart immediately if it's a direct completion (like Bank Transfer)
                    await clearCart();
                    showNotification(n('orderSuccess'));
                    router.push(`/checkoutsuccess?orderId=${data.data?.id || ''}`);
                }
            } else {
                const errorMsg = data.error_details?.error ? `${data.message}: ${data.error_details.error}` : (data.message || n('orderFailed'));
                showNotification(errorMsg, 'error');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            showNotification(n('checkoutError'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    // VAT is already included in prices, so cartTotal is our final payment amount

    // Calculate the VAT breakdown (1/21 of total)
    const vatAmount = (cartTotal * (5 / 105)); // 5% VAT inclusive
    if (loading || (!user && !token)) {
        return (
            <div className={styles.checkoutPage}>
                <Header />
                <div className={styles.loaderContainer}>
                    <div className={styles.spinner}></div>
                    <p>{t('processing') || 'Loading...'}</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.checkoutPage}>
            <Header />

            <div className={styles.checkoutContainer}>
                <div className={styles.checkoutHeader}>
                    <h1>{t('title')}</h1>
                    <p>{t('subtitle')}</p>
                </div>

                <form className={styles.checkoutLayout} onSubmit={handlePlaceOrder}>
                    <div className={styles.leftColumn}>
                        {/* Step 1: Shipping Information */}
                        <div className={styles.checkoutSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.stepNumber}>1</div>
                                <h2 className={styles.sectionTitle}>{t('shippingInfo')}</h2>
                            </div>

                            {user && userAddresses.length > 0 && (
                                <div className={styles.addressSelectorBox}>
                                    <label className={styles.addressSelectorLabel}>
                                        {t('savedAddress')}
                                    </label>
                                    <div className={styles.addressDropdownWrapper} ref={addressDropdownRef}>
                                        <div
                                            className={`${styles.customDropdownTrigger} ${isAddressDropdownOpen ? styles.triggerActive : ''}`}
                                            onClick={handleAddressDropdownToggle}
                                        >
                                            <div className={styles.triggerContent}>
                                                <MapPin size={18} className={styles.triggerIcon} />
                                                <span className={styles.triggerText}>
                                                    {selectedAddressId
                                                        ? userAddresses.find(a => a.id.toString() === selectedAddressId.toString())?.address_line1
                                                        : `-- ${t('newAddress')} --`}
                                                </span>
                                            </div>
                                            <ChevronDown size={18} className={`${styles.chevronIcon} ${isAddressDropdownOpen ? styles.chevronRotate : ''}`} />
                                        </div>

                                        <AnimatePresence>
                                            {isAddressDropdownOpen && (
                                                <motion.div
                                                    className={styles.addressDropdownMenu}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div
                                                        className={`${styles.addressOption} ${!selectedAddressId ? styles.optionSelected : ''}`}
                                                        onClick={handleNewAddressClick}
                                                    >
                                                        <span className={styles.newAddrLabel}>-- {t('newAddress')} --</span>
                                                        {!selectedAddressId && <Check size={16} className={styles.selectedCheck} />}
                                                    </div>

                                                    {userAddresses.map(addr => (
                                                        <div
                                                            key={addr.id}
                                                            className={`${styles.addressOption} ${selectedAddressId === addr.id ? styles.optionSelected : ''}`}
                                                            onClick={() => handleAddressOptionClick(addr)}
                                                        >
                                                            <div className={styles.optionInfo}>
                                                                <div className={styles.optionHeader}>
                                                                    <span className={styles.optionName}>
                                                                        {addr.first_name} {addr.last_name}
                                                                        {addr.is_default && <span className={styles.defaultPill}>★ {t('default')}</span>}
                                                                    </span>
                                                                </div>
                                                                <span className={styles.optionAddress}>
                                                                    {addr.address_line1}, {addr.city}
                                                                </span>
                                                            </div>
                                                            {selectedAddressId === addr.id && <Check size={16} className={styles.selectedCheck} />}
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>{t('firstName')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="firstName" value={form.firstName} onChange={handleInputChange} required placeholder="e.g. John" />
                                        <User className={styles.inputIcon} size={15} />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('lastName')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="lastName" value={form.lastName} onChange={handleInputChange} required placeholder="e.g. Doe" />
                                        <User className={styles.inputIcon} size={15} />
                                    </div>
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>{t('companyOptional')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="companyName" value={form.companyName} onChange={handleInputChange} placeholder="e.g. ACME Corp" />
                                        <Building className={styles.inputIcon} size={15} />
                                    </div>
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>{t('country')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <select className={styles.formSelect} name="country" value={form.country} onChange={handleInputChange} required>
                                            <option value="United Arab Emirates">United Arab Emirates</option>
                                            <option value="Saudi Arabia">Saudi Arabia</option>
                                            <option value="Oman">Oman</option>
                                            <option value="Bahrain">Bahrain</option>
                                            <option value="Kuwait">Kuwait</option>
                                        </select>
                                        <MapPin className={styles.inputIcon} size={15} />
                                    </div>
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>{t('streetAddress')} <span>*</span></label>
                                    <div className={styles.streetAddressWrapper}>
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <input className={styles.formInput} type="text" name="streetAddress" placeholder={t('houseNumberPlaceholder')} value={form.streetAddress} onChange={handleInputChange} required />
                                            <MapPin className={styles.inputIcon} size={15} />
                                        </div>
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <input className={styles.formInput} type="text" name="additionalAddress" placeholder={t('apartmentPlaceholder')} value={form.additionalAddress} onChange={handleInputChange} />
                                            <Building className={styles.inputIcon} size={15} />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('city')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="city" value={form.city} onChange={handleInputChange} required placeholder="e.g. Dubai" />
                                        <MapPin className={styles.inputIcon} size={15} />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('postcode')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="postcode" value={form.postcode} onChange={handleInputChange} placeholder="00000" />
                                        <MapPin className={styles.inputIcon} size={15} />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('phone')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="tel" name="phone" value={form.phone} onChange={handleInputChange} required placeholder="+971 -- --- ----" dir="ltr" />
                                        <Phone className={styles.inputIcon} size={15} />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('email')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="email" name="email" value={form.email} onChange={handleInputChange} required placeholder="john@example.com" />
                                        <Mail className={styles.inputIcon} size={15} />
                                    </div>
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>{t('orderNotes')}</label>
                                    <div className={styles.inputWrapper}>
                                        <textarea className={styles.formTextarea} name="orderNotes" placeholder={t('orderNotesPlaceholder')} value={form.orderNotes} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Payment Method */}
                        <div className={styles.checkoutSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.stepNumber}>2</div>
                                <h2 className={styles.sectionTitle}>{t('paymentMethod')}</h2>
                            </div>

                            <div className={styles.paymentGrid}>
                                {/* Card Payment */}
                                <div className={`${styles.paymentTab} ${paymentMethod === 'card' ? styles.active : ''}`} onClick={() => setPaymentMethod('card')}>
                                    <div className={styles.radioDot}>
                                        <div className={styles.radioDotInner}></div>
                                    </div>
                                    <div className={styles.tabText}>
                                        <span className={styles.tabTitle}>{t('cardTitle')}</span>
                                        <span className={styles.tabDesc}>{t('cardDesc')}</span>
                                    </div>
                                    <div className={styles.tabIcon}>
                                        <CreditCard size={20} />
                                    </div>
                                </div>
                                {paymentMethod === 'card' && (
                                    <div className={styles.tabContent} onClick={(e) => e.stopPropagation()}>
                                        <div className={styles.cardSecureHeader}>
                                            <div className={styles.secureHeaderLeft}>
                                                <Lock size={14} />
                                                <span>{t('cardSecureHeader')}</span>
                                            </div>
                                            <div className={styles.secureHeaderLogos}>
                                                <img src="/assets/visa-logo.svg" alt="Visa" />
                                                <img src="/assets/mastercard-logo.svg" alt="Mastercard" />
                                            </div>
                                        </div>

                                        <div className={styles.cardFormContent}>
                                            <div className={styles.fieldGroup}>
                                                <label className={styles.fieldLabel}>
                                                    {t('cardName')} <span className={styles.requiredMark}>*</span>
                                                </label>
                                                <div className={styles.cardInputWrapper}>
                                                    <User size={16} className={styles.fieldLeadingIcon} />
                                                    <input
                                                        className={styles.cardTextInput}
                                                        type="text"
                                                        name="name"
                                                        value={cardDetails.name}
                                                        onChange={handleCardChange}
                                                        placeholder={t('placeholderName')}
                                                        autoComplete="cc-name"
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.fieldGroup}>
                                                <label className={styles.fieldLabel}>
                                                    {t('cardNumber')} <span className={styles.requiredMark}>*</span>
                                                </label>
                                                <div className={styles.cardNumberContainer}>
                                                    <CreditCard size={16} className={styles.fieldLeadingIcon} />
                                                    <div className={styles.stripeElementWrapper}>
                                                        <CardNumberElement options={{
                                                            showIcon: true,
                                                            placeholder: t('placeholderCard'),
                                                            style: {
                                                                base: {
                                                                    fontSize: '15px',
                                                                    color: '#0f172a',
                                                                    fontFamily: 'Inter, sans-serif',
                                                                    fontWeight: '500',
                                                                    '::placeholder': { color: '#cbd5e1' },
                                                                    iconColor: '#16a1db',
                                                                },
                                                                invalid: { color: '#dc2626', iconColor: '#dc2626' },
                                                            },
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.splitRow}>
                                                <div className={styles.fieldGroup}>
                                                    <label className={styles.fieldLabel}>
                                                        {t('cardExpiry')} <span className={styles.requiredMark}>*</span>
                                                    </label>
                                                    <div className={styles.expiryWrapper}>
                                                        <div className={styles.stripeElementWrapper}>
                                                            <CardExpiryElement options={{
                                                                placeholder: 'MM / YY',
                                                                style: {
                                                                    base: {
                                                                        fontSize: '15px',
                                                                        color: '#0f172a',
                                                                        fontFamily: 'Inter, sans-serif',
                                                                        fontWeight: '500',
                                                                        '::placeholder': { color: '#cbd5e1' },
                                                                    },
                                                                    invalid: { color: '#dc2626' },
                                                                },
                                                            }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.fieldGroup}>
                                                    <label className={styles.fieldLabel}>
                                                        {t('cardCvc')} <span className={styles.requiredMark}>*</span>
                                                    </label>
                                                    <div className={styles.cvcWrapper}>
                                                        <div className={styles.stripeElementWrapper}>
                                                            <CardCvcElement options={{
                                                                placeholder: '•••',
                                                                style: {
                                                                    base: {
                                                                        fontSize: '15px',
                                                                        color: '#0f172a',
                                                                        fontFamily: 'Inter, sans-serif',
                                                                        fontWeight: '500',
                                                                        '::placeholder': { color: '#cbd5e1' },
                                                                    },
                                                                    invalid: { color: '#dc2626' },
                                                                },
                                                            }} />
                                                        </div>
                                                        <div className={styles.cvcIcon}>
                                                            <CreditCard size={16} />
                                                        </div>
                                                    </div>
                                                    <span className={styles.fieldHelp}>{t('cvcHelp')}</span>
                                                </div>
                                            </div>

                                            <div className={styles.cardSecureFooter}>
                                                <ShieldCheck size={14} />
                                                <span>{t('securePaymentNotice')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bank Transfer */}
                                <div className={`${styles.paymentTab} ${paymentMethod === 'bank' ? styles.active : ''}`} onClick={() => setPaymentMethod('bank')}>
                                    <div className={styles.radioDot}>
                                        <div className={styles.radioDotInner}></div>
                                    </div>
                                    <div className={styles.tabText}>
                                        <span className={styles.tabTitle}>{t('bankTitle')}</span>
                                        <span className={styles.tabDesc}>{t('bankDesc')}</span>
                                    </div>
                                    <div className={styles.tabIcon}>
                                        <Banknote size={20} />
                                    </div>
                                </div>
                                {paymentMethod === 'bank' && (
                                    <div className={styles.tabContent}>
                                        <div className={styles.bankDetails}>
                                            <div className={styles.bankCard}>
                                                <div className={styles.bankRow}>
                                                    <span className={styles.bankLabel}>{t('bankAccountName')}</span>
                                                    <span className={styles.bankValue}>MARIOT KITCHEN EQUIP</span>
                                                </div>
                                                <div className={styles.bankRow}>
                                                    <span className={styles.bankLabel}>{t('bankAccountNumber')}</span>
                                                    <span className={styles.bankValue}>17671626</span>
                                                </div>
                                                <div className={styles.bankRow}>
                                                    <span className={styles.bankLabel}>{t('bankIban')}</span>
                                                    <span className={styles.bankValue}>AE54 0500 0000 0001 7671 626</span>
                                                </div>
                                                <div className={styles.bankRow}>
                                                    <span className={styles.bankLabel}>{t('bankSwift')}</span>
                                                    <span className={styles.bankValue}>ABDIAEAD</span>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '16px', lineHeight: '1.5' }}>
                                                {t('bankInstruction')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Tabby */}
                                <div className={`${styles.paymentTab} ${paymentMethod === 'tabby' ? styles.active : ''}`} onClick={() => setPaymentMethod('tabby')}>
                                    <div className={styles.radioDot}>
                                        <div className={styles.radioDotInner}></div>
                                    </div>
                                    <div className={styles.tabText}>
                                        <span className={styles.tabTitle}>{t('tabbyTitle')}</span>
                                        <span className={styles.tabDesc}>{t('tabbyDesc')}</span>
                                    </div>
                                    <div className={styles.tabbyBrand}>
                                        <img src="/assets/Tabby.webp" alt="Tabby" className={styles.tabbyLogoLarge} />
                                    </div>
                                </div>

                                {/* Tabby Promo - Shown when Tabby is selected as payment */}
                                {paymentMethod === 'tabby' && (
                                    <div className={styles.tabContent}>
                                        <div className={styles.tabbyPromoWrapper}>
                                            <Script
                                                src="https://checkout.tabby.ai/tabby-promo.js"
                                                strategy="lazyOnload"
                                                onLoad={() => {
                                                    if (typeof window !== 'undefined' && (window as any).TabbyPromo) {
                                                        try {
                                                            new (window as any).TabbyPromo({
                                                                selector: '#TabbyPromoPayment',
                                                                currency: 'AED',
                                                                price: finalTotal,
                                                                installmentsCount: 4,
                                                                lang: locale === 'ar' ? 'ar' : 'en',
                                                                source: 'checkout',
                                                                publicKey: process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || 'pk_test_b6ac7af8-c300-4eb6-9ba6-a19ae3bf84de',
                                                                merchantCode: 'MARIOT'
                                                            });
                                                        } catch (e) {
                                                            console.error('Tabby Promo Error', e);
                                                        }
                                                    }
                                                }}
                                            />
                                            <div id="TabbyPromoPayment"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.rightColumn}>
                        <div className={styles.summaryContainer}>
                            <div className={styles.summaryCard}>
                                <h2 className={styles.summaryTitle}>{t('reviewOrder')}</h2>

                                <div className={styles.couponSection}>
                                    {appliedCoupon ? (
                                        <div className={styles.appliedCouponBox}>
                                            <div className={styles.appliedCouponInfo}>
                                                <span className={styles.couponCodeTag}>{appliedCoupon.code}</span>
                                                <span className={styles.couponSuccessText}>{t('couponSuccess')}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeDiscount}
                                                className={styles.removeCouponBtn}
                                            >
                                                {common('delete')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.couponWrapper}>
                                            <div className={styles.couponForm}>
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleApplyCoupon(couponCode.trim());
                                                        }
                                                    }}
                                                    placeholder="Enter coupon code"
                                                    className={styles.couponInput}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleApplyCoupon(couponCode.trim())}
                                                    className={styles.applyCouponBtn}
                                                    disabled={!couponCode.trim() || isApplyingCoupon}
                                                >
                                                    {isApplyingCoupon ? t('processing').split('...')[0] : common('confirm')}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.viewCouponsBtn}
                                                onClick={() => setShowCouponModal(true)}
                                            >
                                                <Ticket size={14} />
                                                {t('viewAvailableCoupons')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.itemList}>
                                    {cartItems.map(item => (
                                        <div key={item.id} className={styles.itemRow}>
                                            <img src={resolveUrl(item.image)} alt={item.name} className={styles.itemImg} />
                                            <div className={styles.itemDetails}>
                                                <div className={styles.itemName}>{item.name}</div>
                                                <div className={styles.itemMeta}>Qty: {item.quantity}</div>
                                            </div>
                                            <div className={styles.itemPrice}>
                                                AED {(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.totalsGrid}>
                                    <div className={styles.totalRow}>
                                        <span>{common('subtotal')}</span>
                                        <span>{common('currency')} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    {discountAmount > 0 && (
                                        <div className={`${styles.totalRow} ${styles.discount}`}>
                                            <span>{t('couponDiscount')}</span>
                                            <span>- {common('currency')} {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    {pointsDiscountAmount > 0 && (
                                        <div className={`${styles.totalRow} ${styles.discount}`}>
                                            <span>{t('pointsRedeemed')}</span>
                                            <span>- {common('currency')} {pointsDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    <div className={styles.totalRow}>
                                        <span>{common('shipping')}</span>
                                        <span className={styles.freeText}>{common('free')}</span>
                                    </div>

                                    <div className={styles.totalRow}>
                                        <span>{common('taxableAmount')} (Excl. VAT)</span>
                                        <span>{common('currency')} {(finalTotal / 1.05).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className={styles.totalRow}>
                                        <span>{common('vat')} (5%)</span>
                                        <span>{common('currency')} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className={styles.grandTotalRow}>
                                        <span>{common('total')}</span>
                                        <span>{common('currency')} {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Tabby Promo in Checkout - Disabled per user request */}
                                    {false && (
                                        <div className={styles.tabbyPromoCheckout} style={{ marginTop: '20px', marginBottom: '10px' }}>
                                            <Script
                                                src="https://checkout.tabby.ai/tabby-promo.js"
                                                strategy="lazyOnload"
                                                onLoad={() => {
                                                    if (typeof window !== 'undefined' && (window as any).TabbyPromo) {
                                                        try {
                                                            new (window as any).TabbyPromo({
                                                                selector: '#TabbyPromoCheckout',
                                                                currency: 'AED',
                                                                price: finalTotal,
                                                                installmentsCount: 4,
                                                                lang: locale === 'ar' ? 'ar' : 'en',
                                                                source: 'checkout',
                                                                publicKey: process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || 'pk_test_b6ac7af8-c300-4eb6-9ba6-a19ae3bf84de',
                                                                merchantCode: 'MARIOT'
                                                            });
                                                        } catch (e) {
                                                            console.error('Tabby Promo Error', e);
                                                        }
                                                    }
                                                }}
                                            />
                                            <div id="TabbyPromoCheckout"></div>
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className={styles.checkoutBtn} disabled={isProcessing || cartItems.length === 0}>
                                    {isProcessing ? (
                                        <Clock size={20} className={styles.animateSpin} />
                                    ) : (
                                        <ShieldCheck size={20} />
                                    )}
                                    {isProcessing ? t('processing') : t('completePurchase')}
                                </button>

                                <div className={styles.trustBadges}>
                                    <img src="/assets/visa-logo.svg" alt="Visa" className={`${styles.trustBadge} ${styles.visaBadge}`} />
                                    <img src="/assets/mastercard-logo.svg" alt="Mastercard" className={styles.trustBadge} />
                                    <img src="/assets/apple-pay-logo.svg" alt="Apple Pay" className={styles.trustBadge} />
                                    <img src="/assets/google-pay-logo.svg" alt="Google Pay" className={styles.trustBadge} />
                                </div>

                                <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '16px' }}>
                                    <Lock size={10} style={{ marginInlineEnd: '4px', display: 'inline' }} />
                                    {t('securePaymentNotice')}
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Coupon Selection Modal */}
            <AnimatePresence>
                {showCouponModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowCouponModal(false)}>
                        <motion.div
                            className={styles.couponModal}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.modalHeader}>
                                <div className={styles.modalTitleRow}>
                                    <Ticket size={24} className={styles.modalIcon} />
                                    <h3>{t('availableCoupons')}</h3>
                                </div>
                                <button className={styles.closeModal} onClick={() => setShowCouponModal(false)}>
                                    <CloseIcon size={20} />
                                </button>
                            </div>

                            <div className={styles.couponList}>
                                {isLoadingCoupons ? (
                                    <div className={styles.modalLoader}>
                                        <div className={styles.tinySpinner}></div>
                                        <span>{t('loadingCoupons')}</span>
                                    </div>
                                ) : availableCoupons.length > 0 ? (
                                    availableCoupons.map((coupon) => {
                                        const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
                                        const isInactive = !(coupon.status === 'active' || coupon.is_active === 1 || coupon.is_active === true);
                                        const isDisabled = isExpired || isInactive;

                                        return (
                                            <div key={coupon.id} className={`${styles.couponItem} ${isDisabled ? styles.expiredCoupon : ''}`}>
                                                <div className={styles.couponMain}>
                                                    <div className={styles.couponCodeRow}>
                                                        <div className={styles.couponCodeDisplay}>{coupon.code}</div>
                                                        {isExpired && <span className={styles.expiredBadge}>{t('expired')}</span>}
                                                        {!isExpired && isInactive && <span className={styles.expiredBadge}>{t('inactive')}</span>}
                                                    </div>
                                                    <div className={styles.couponDetails}>
                                                        <p className={styles.couponValue}>
                                                            {coupon.discount_type === 'percentage'
                                                                ? `${Number(coupon.discount_value).toFixed(0)}% ${common('off')}`
                                                                : `${common('currency')} ${Number(coupon.discount_value).toFixed(0)} ${common('off')}`}
                                                        </p>
                                                        <p className={styles.couponMinOrder}>
                                                            {t('minOrder', { currency: common('currency'), amount: coupon.min_order_amount })}
                                                        </p>
                                                        <div className={styles.couponRestrictions}>
                                                            {coupon.applicable_brands && (
                                                                <div className={styles.restrictionTag}>
                                                                    {t('validForOnly')}
                                                                    <span
                                                                        className={styles.restrictionLink}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveProductsPopup(null);
                                                                            setActiveBrandsPopup(activeBrandsPopup === coupon.id ? null : coupon.id);
                                                                        }}
                                                                    >
                                                                        {t('selectedBrands')}
                                                                    </span>
                                                                    {activeBrandsPopup === coupon.id && (
                                                                        <div className={styles.restrictionPopup} onClick={e => e.stopPropagation()}>
                                                                            <div className={styles.popupHeader}>
                                                                                <span>{t('applicableBrands')}</span>
                                                                                <CloseIcon size={12} className={styles.closePopup} onClick={() => setActiveBrandsPopup(null)} />
                                                                            </div>
                                                                            <div className={styles.popupTags}>
                                                                                {(() => {
                                                                                    try {
                                                                                        const brands = typeof coupon.applicable_brands === 'string' ? JSON.parse(coupon.applicable_brands) : coupon.applicable_brands;
                                                                                        return Array.isArray(brands) ? brands.map((b: string) => <span key={b} className={styles.popupTag}>{b}</span>) : null;
                                                                                    } catch (e) { return null; }
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {coupon.applicable_products && (
                                                                <div className={styles.restrictionTag}>
                                                                    {coupon.applicable_brands ? ' & ' : t('validForOnly') + ' '}
                                                                    <span
                                                                        className={styles.restrictionLink}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveBrandsPopup(null);
                                                                            setActiveProductsPopup(activeProductsPopup === coupon.id ? null : coupon.id);
                                                                        }}
                                                                    >
                                                                        {t('selectedProducts')}
                                                                    </span>
                                                                    {activeProductsPopup === coupon.id && (
                                                                        <div className={styles.restrictionPopup} onClick={e => e.stopPropagation()}>
                                                                            <div className={styles.popupHeader}>
                                                                                <span>{t('applicableProducts')}</span>
                                                                                <CloseIcon size={12} className={styles.closePopup} onClick={() => setActiveProductsPopup(null)} />
                                                                            </div>
                                                                            <div className={styles.popupTags}>
                                                                                {(() => {
                                                                                    try {
                                                                                        const prods = typeof coupon.applicable_products === 'string' ? JSON.parse(coupon.applicable_products) : coupon.applicable_products;
                                                                                        return Array.isArray(prods) ? prods.map((p: string) => <span key={p} className={styles.popupTag}>{p}</span>) : null;
                                                                                    } catch (e) { return null; }
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {!coupon.applicable_brands && !coupon.applicable_products && (
                                                                <span className={styles.allBrandsLabel}>{t('validSitewide')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className={styles.useCouponBtn}
                                                    onClick={() => handleApplyCoupon(coupon.code)}
                                                    disabled={isApplyingCoupon || isDisabled}
                                                >
                                                    {t('useCoupon')}
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className={styles.noCoupons}>
                                        <p>{t('noCoupons')}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Footer />
            <FloatingActions />

            <OtpVerifyModal
                open={otpOpen}
                onClose={() => setOtpOpen(false)}
                onVerified={async () => {
                    await refreshUser();
                    setOtpOpen(false);
                    showNotification('Mobile verified — you can now complete your purchase.', 'success');
                }}
                phoneNumber={user?.phone_number}
                title="Verify your mobile number to continue"
                description="Your mobile number is not verified. Please verify to place your order. We will send a 6-digit OTP via WhatsApp."
            />
        </div >
    );
}

export default function CheckoutPage() {
    return (
        <Elements stripe={stripePromise}>
            <CheckoutContent />
        </Elements>
    );
}
