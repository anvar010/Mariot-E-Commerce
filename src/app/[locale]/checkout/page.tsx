'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useTranslations } from 'next-intl';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
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
    ChevronRight,
    ShoppingBag,
    Ticket,
    X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, BASE_URL } from '@/config';
import styles from './checkout.module.css';

export default function CheckoutPage() {
    const { cartItems, cartTotal, discountAmount, pointsToUse, pointsDiscountAmount, appliedCoupon, clearCart, applyDiscount, removeDiscount } = useCart();
    const { user, token } = useAuth();
    const { showNotification } = useNotification();
    const n = useTranslations('notifications');
    const t = useTranslations('checkout');
    const common = useTranslations('common');
    const router = useRouter();

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

    const fetchAddresses = async () => {
        if (!user) return;
        setLoadingAddresses(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/addresses`, { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setUserAddresses(data.data || []);
                // If there's a default address, pre-fill it!
                const defaultAddr = data.data.find((a: any) => a.is_default);
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setForm(prev => ({
                        ...prev,
                        streetAddress: defaultAddr.address_line1,
                        additionalAddress: defaultAddr.address_line2 || '',
                        city: defaultAddr.city,
                        postcode: defaultAddr.zip_code || '',
                        phone: defaultAddr.phone || prev.phone,
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
            const res = await fetch(`${API_BASE_URL}/coupons`, { credentials: "include" });
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
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    const handleAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const addrId = e.target.value;
        setSelectedAddressId(addrId);

        if (addrId === '') {
            // "Enter New Address" selected
            setForm(prev => ({
                ...prev,
                streetAddress: '',
                additionalAddress: '',
                city: '',
                postcode: '',
            }));
            return;
        }

        const selected = userAddresses.find(a => a.id.toString() === addrId);
        if (selected) {
            setForm(prev => ({
                ...prev,
                streetAddress: selected.address_line1,
                additionalAddress: selected.address_line2 || '',
                city: selected.city,
                postcode: selected.zip_code || '',
                phone: selected.phone || prev.phone,
                country: selected.country || 'United Arab Emirates'
            }));
        }
    };

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

        setIsProcessing(true);

        try {
            if (paymentMethod === 'card') {
                if (!cardDetails.name || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvc) {
                    showNotification(n('cardDetailsRequired'), 'error');
                    setIsProcessing(false);
                    return;
                }
            }

            const orderData = {
                items: cartItems.map(item => ({
                    product_id: item.id,
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
                }
            };

            const res = await fetch(`${API_BASE_URL}/orders`, {
                credentials: "include",
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const data = await res.json();

            if (data.success) {
                showNotification(n('orderSuccess'));
                clearCart();
                router.push(`/checkoutsuccess?orderId=${data.data?.id || ''}`);
            } else {
                showNotification(data.message || n('orderFailed'), 'error');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            showNotification(n('checkoutError'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const vatAmount = cartTotal * 0.05;
    const finalTotal = cartTotal + vatAmount;

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
                                <div className={styles.formGroup} style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
                                        {t('savedAddress')}
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        value={selectedAddressId}
                                        onChange={handleAddressSelect}
                                        style={{ backgroundColor: 'white' }}
                                    >
                                        <option value="">-- {t('newAddress')} --</option>
                                        {userAddresses.map(addr => (
                                            <option key={addr.id} value={addr.id}>
                                                {addr.address_line1}, {addr.city} {addr.is_default ? '(Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>{t('firstName')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="firstName" value={form.firstName} onChange={handleInputChange} required placeholder="e.g. John" />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{t('lastName')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="lastName" value={form.lastName} onChange={handleInputChange} required placeholder="e.g. Doe" />
                                    </div>
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>{t('companyOptional')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="companyName" value={form.companyName} onChange={handleInputChange} placeholder="e.g. ACME Corp" />
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
                                    </div>
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>{t('streetAddress')} <span>*</span></label>
                                    <div className={styles.inputWrapper} style={{ flexDirection: 'column', gap: '10px' }}>
                                        <input className={styles.formInput} type="text" name="streetAddress" placeholder={t('houseNumberPlaceholder')} value={form.streetAddress} onChange={handleInputChange} required />
                                        <input className={styles.formInput} type="text" name="additionalAddress" placeholder={t('apartmentPlaceholder')} value={form.additionalAddress} onChange={handleInputChange} />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('city')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="city" value={form.city} onChange={handleInputChange} required placeholder="e.g. Dubai" />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('postcode')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="postcode" value={form.postcode} onChange={handleInputChange} placeholder="00000" />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('phone')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="tel" name="phone" value={form.phone} onChange={handleInputChange} required placeholder="+971 -- --- ----" dir="ltr" />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('email')} <span>*</span></label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="email" name="email" value={form.email} onChange={handleInputChange} required placeholder="john@example.com" />
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
                                        <div className={styles.cardFormGrid}>
                                            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                                <label className={styles.fieldLabel}>{t('cardName')}</label>
                                                <input className={styles.modernInput} type="text" name="name" placeholder={t('placeholderName')} value={cardDetails.name} onChange={handleCardChange} />
                                            </div>
                                            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                                <label className={styles.fieldLabel}>{t('cardNumber')}</label>
                                                <div className={styles.inputWrapper}>
                                                    <input className={styles.modernInput} style={{ fontFamily: 'monospace', letterSpacing: '1px' }} type="text" name="number" placeholder={t('placeholderCard')} value={cardDetails.number} onChange={handleCardChange} />
                                                    <Lock size={16} className={styles.cardIcon} />
                                                </div>
                                            </div>
                                            <div className={styles.fieldGroup}>
                                                <label className={styles.fieldLabel}>{t('cardExpiry')}</label>
                                                <input className={styles.modernInput} type="text" name="expiry" placeholder="MM / YY" value={cardDetails.expiry} onChange={handleCardChange} />
                                            </div>
                                            <div className={styles.fieldGroup}>
                                                <label className={styles.fieldLabel}>{t('cardCvc')}</label>
                                                <input className={styles.modernInput} type="text" name="cvc" placeholder="123" value={cardDetails.cvc} onChange={handleCardChange} />
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
                                                AED {(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.totalsGrid}>
                                    <div className={styles.totalRow}>
                                        <span>{common('subtotal')}</span>
                                        <span>{common('currency')} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {discountAmount > 0 && (
                                        <div className={`${styles.totalRow} ${styles.discount}`}>
                                            <span>{t('couponDiscount')}</span>
                                            <span>- {common('currency')} {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    {pointsDiscountAmount > 0 && (
                                        <div className={`${styles.totalRow} ${styles.discount}`}>
                                            <span>{t('pointsRedeemed')}</span>
                                            <span>- {common('currency')} {pointsDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    <div className={styles.totalRow}>
                                        <span>{common('shipping')}</span>
                                        <span style={{ color: '#059669', fontWeight: '600' }}>{common('free')}</span>
                                    </div>

                                    <div className={styles.totalRow}>
                                        <span>{common('vat')} (5%)</span>
                                        <span>{common('currency')} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className={styles.grandTotalRow}>
                                        <span>{common('total')}</span>
                                        <span>{common('currency')} {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
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
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={styles.trustBadge} id="visa">
                                        <polygon fill="#1565c0" points="17.202 32.269 21.087 32.269 23.584 16.732 19.422 16.732"></polygon>
                                        <path fill="#1565c0" d="M13.873 16.454l-3.607 11.098-.681-3.126c-1.942-4.717-5.272-6.659-5.272-6.659l3.456 14.224h4.162l5.827-15.538H13.873zM44.948 16.454h-4.162l-6.382 15.538h3.884l.832-2.22h4.994l.555 2.22H48L44.948 16.454zM39.954 26.997l2.22-5.826 1.11 5.826H39.954zM28.855 20.893c0-.832.555-1.665 2.497-1.665 1.387 0 2.775 1.11 2.775 1.11l.832-3.329c0 0-1.942-.832-3.607-.832-4.162 0-6.104 2.22-6.104 4.717 0 4.994 5.549 4.162 5.549 6.659 0 .555-.277 1.387-2.497 1.387s-3.884-.832-3.884-.832l-.555 3.329c0 0 1.387.832 4.162.832 2.497.277 6.382-1.942 6.382-5.272C34.405 23.113 28.855 22.836 28.855 20.893z"></path>
                                    </svg>
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className={styles.trustBadge} />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className={styles.trustBadge} />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg" alt="Google Pay" className={styles.trustBadge} />
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
                                        <span>Fetching best offers...</span>
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
                                                        {isExpired && <span className={styles.expiredBadge}>Expired</span>}
                                                        {!isExpired && isInactive && <span className={styles.expiredBadge}>Inactive</span>}
                                                    </div>
                                                    <div className={styles.couponDetails}>
                                                        <p className={styles.couponValue}>
                                                            {coupon.discount_type === 'percentage'
                                                                ? `${Number(coupon.discount_value).toFixed(0)}% OFF`
                                                                : `AED ${Number(coupon.discount_value).toFixed(0)} OFF`}
                                                        </p>
                                                        <p className={styles.couponMinOrder}>
                                                            Min. Order: AED {coupon.min_order_amount}
                                                        </p>
                                                        <div className={styles.couponRestrictions}>
                                                            {coupon.applicable_brands && (
                                                                <div className={styles.restrictionTag}>
                                                                    Valid for only
                                                                    <span
                                                                        className={styles.restrictionLink}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveProductsPopup(null);
                                                                            setActiveBrandsPopup(activeBrandsPopup === coupon.id ? null : coupon.id);
                                                                        }}
                                                                    >
                                                                        selected brands
                                                                    </span>
                                                                    {activeBrandsPopup === coupon.id && (
                                                                        <div className={styles.restrictionPopup} onClick={e => e.stopPropagation()}>
                                                                            <div className={styles.popupHeader}>
                                                                                <span>Applicable Brands</span>
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
                                                                    {coupon.applicable_brands ? ' & ' : 'Valid for only '}
                                                                    <span
                                                                        className={styles.restrictionLink}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveBrandsPopup(null);
                                                                            setActiveProductsPopup(activeProductsPopup === coupon.id ? null : coupon.id);
                                                                        }}
                                                                    >
                                                                        selected products
                                                                    </span>
                                                                    {activeProductsPopup === coupon.id && (
                                                                        <div className={styles.restrictionPopup} onClick={e => e.stopPropagation()}>
                                                                            <div className={styles.popupHeader}>
                                                                                <span>Applicable Products</span>
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
                                                                <span className={styles.allBrandsLabel}>Valid for site-wide products</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className={styles.useCouponBtn}
                                                    onClick={() => handleApplyCoupon(coupon.code)}
                                                    disabled={isApplyingCoupon || isDisabled}
                                                >
                                                    {isDisabled ? 'Use' : 'Use'}
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className={styles.noCoupons}>
                                        <p>No coupons available at the moment.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Footer />
            <FloatingActions />
        </div >
    );
}
