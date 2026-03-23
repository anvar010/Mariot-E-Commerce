'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    ChevronLeft,
    Download,
    Ticket,
    Coins,
    CheckCircle,
    User,
    Mail,
    Phone,
    HelpCircle,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import styles from './CartDrawer.module.css';
import qStyles from './CartDrawer.quotation.module.css';

const CartDrawer = () => {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('cart');
    const tNotif = useTranslations('notifications');
    const isArabic = locale === 'ar';
    const { user, token } = useAuth();
    const { showNotification } = useNotification();

    // Cart Context
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        isDrawerOpen,
        setIsDrawerOpen,
        cartCount,
        cartTotal,
        subtotal,
        discountAmount,
        appliedCoupon,
        applyDiscount,
        removeDiscount,
        pointsToUse,
        pointsDiscountAmount,
        applyPoints,
        removePoints
    } = useCart();

    // Local States
    const [couponCode, setCouponCode] = useState('');
    const [pointsInput, setPointsInput] = useState<number | string>(pointsToUse > 0 ? pointsToUse : '');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [showCoupons, setShowCoupons] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

    // Quotation States
    const [showQuotationPopup, setShowQuotationPopup] = useState(false);
    const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
    const [quotationForm, setQuotationForm] = useState({
        name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone_number || '',
        vat_number: user?.vat_number || ''
    });

    // Sync points input with pointsToUse from context
    useEffect(() => {
        if (pointsToUse > 0) {
            setPointsInput(pointsToUse);
        } else {
            setPointsInput('');
        }
    }, [pointsToUse]);

    // Event listener for opening drawer from other components
    useEffect(() => {
        const handleOpenDrawer = () => setIsDrawerOpen(true);
        window.addEventListener('OPEN_CART_DRAWER', handleOpenDrawer);
        return () => window.removeEventListener('OPEN_CART_DRAWER', handleOpenDrawer);
    }, [setIsDrawerOpen]);

    // Fetch available coupons when needed
    useEffect(() => {
        if (showCoupons) {
            const fetchCoupons = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/coupons/available`, { credentials: "include" });
                    const data = await res.json();
                    if (data.success) {
                        setAvailableCoupons(data.data);
                    }
                } catch (err) {
                    console.error("Failed to fetch coupons", err);
                }
            };
            fetchCoupons();
        }
    }, [showCoupons]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsApplyingCoupon(true);
        const success = await applyDiscount(couponCode);
        if (success) setCouponCode('');
        setIsApplyingCoupon(false);
    };

    const handleUsePoints = () => {
        const points = Number(pointsInput);
        if (isNaN(points) || points <= 0) return;
        applyPoints(points);
        setPointsInput('');
    };

    const handleDownloadQuotation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartItems.length === 0) return;

        setIsGeneratingQuote(true);
        try {
            // Calculate correct values to match UI inclusive logic
            const finalTaxable = cartTotal / 1.05;
            const finalVat = cartTotal - finalTaxable;

            // 1. Save quotation to database first
            const res = await fetch(`${API_BASE_URL}/quotations`, {
                credentials: "include",
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: quotationForm.name,
                    customer_email: quotationForm.email,
                    customer_phone: quotationForm.phone,
                    vat_number: quotationForm.vat_number,
                    items: cartItems,
                    subtotal: Number(finalTaxable.toFixed(2)),
                    tax_amount: Number(finalVat.toFixed(2)),
                    total_amount: Number(cartTotal.toFixed(2))
                })
            });

            const data = await res.json();
            if (data.success) {
                // 2. Generate PDF using the returned quotation ref/data
                await generateQuotationPDF(data.data, true);
                showNotification(tNotif('quotationSuccess'));
                setShowQuotationPopup(false);
            } else {
                showNotification(data.message || 'Failed to generate quotation', 'error');
            }
        } catch (err: any) {
            console.error("Quotation error:", err);
            showNotification(err.message || 'Something went wrong', 'error');
        } finally {
            setIsGeneratingQuote(false);
        }
    };

    const handleCheckout = () => {
        setIsDrawerOpen(false);
        router.push('/checkout');
    };

    return (
        <>
            {/* Main Drawer Overlay */}
            <div
                className={`${styles.overlay} ${isDrawerOpen ? styles.overlayOpen : ''}`}
                onClick={() => setIsDrawerOpen(false)}
            />

            {/* Main Drawer */}
            <div className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}>
                <div className={styles.header}>
                    <div className={styles.continueShopping} onClick={() => setIsDrawerOpen(false)}>
                        {isArabic ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        <span>{t('continueShopping')}</span>
                    </div>
                    <div className={styles.closeBtn} onClick={() => setIsDrawerOpen(false)}>
                        <X size={20} color="white" />
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.helpBanner}>
                        <div className={styles.helpText}>
                            <HelpCircle size={20} />
                            <span>{t('helpTitle')}</span>
                        </div>
                        <a href="https://wa.me/971501234567" target="_blank" rel="noopener noreferrer" className={styles.expertLink}>
                            <span>{t('talkExpert')}</span>
                        </a>
                    </div>

                    <div className={styles.cartTitleRow}>
                        <h2 className={styles.cartTitle}>{t('title')}</h2>
                        <div className={styles.headerBadge}>
                            {cartCount} {cartCount === 1 ? t('item') : t('items')}
                        </div>
                    </div>

                    {cartItems.length === 0 ? (
                        <div className={styles.emptyCart}>
                            <div className={styles.emptyIcon}>
                                <ShoppingCart size={80} />
                            </div>
                            <p>{t('emptyCart')}</p>
                        </div>
                    ) : (
                        <>
                            {subtotal >= 1000 && (
                                <div className={styles.freeShipping}>
                                    <CheckCircle size={16} />
                                    <span>{t('freeShippingQualify')}</span>
                                </div>
                            )}

                            <div className={styles.itemsList}>
                                {cartItems.map((item) => (
                                    <div key={item.id} className={styles.cartItem}>
                                        <div className={styles.itemImg} onClick={() => { setIsDrawerOpen(false); router.push(`/product/${item.slug}`); }}>
                                            <img
                                                src={item.image || '/assets/placeholder-image.webp'}
                                                alt={item.name}
                                            />
                                        </div>
                                        <div className={styles.itemDetails}>
                                            <div className={styles.itemNameRow}>
                                                <div className={styles.itemNameMain}>
                                                    <h4 className={styles.itemName}>{item.name}</h4>
                                                    <span className={styles.itemCountBadge}>{item.quantity}</span>
                                                </div>
                                                <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            {item.brand && <p className={styles.itemBrand}>{item.brand}</p>}
                                            <div className={styles.itemPrice}>
                                                <span>AED {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className={styles.qtySelectRow}>
                                                <span className={styles.qtyLabel}>{t('qty')}</span>
                                                <select
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                                    className={styles.qtySelect}
                                                >
                                                    {[...Array(10)].map((_, i) => (
                                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Coupons Section */}
                            <div className={styles.section}>
                                <div className={styles.couponHeader}>
                                    <h4 className={styles.sectionLabel}>{t('haveCoupon')}</h4>
                                    <button className={styles.viewCouponsBtn} onClick={() => setShowCoupons(true)}>
                                        <Ticket size={14} />
                                        <span>{t('viewCoupons')}</span>
                                    </button>
                                </div>
                                <div className={styles.couponRow}>
                                    <div className={styles.couponInputWrapper}>
                                        <input
                                            type="text"
                                            placeholder={t('couponPlaceholder')}
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <button
                                        className={styles.applyBtn}
                                        onClick={handleApplyCoupon}
                                        disabled={isApplyingCoupon || !couponCode.trim()}
                                    >
                                        {isApplyingCoupon ? '...' : t('apply')}
                                    </button>
                                </div>
                                {appliedCoupon && (
                                    <div className={styles.appliedCoupon}>
                                        <span className={styles.couponName}>
                                            <CheckCircle size={14} style={{ marginInlineEnd: '5px' }} />
                                            {appliedCoupon.code}
                                        </span>
                                        <button className={styles.removeCouponBtn} onClick={() => removeDiscount()}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Reward Points Section */}
                            {user && user.reward_points > 0 && (
                                <div className={styles.section}>
                                    <h4 className={styles.sectionLabel}>{t('rewardTitle')}</h4>
                                    <div className={styles.pointsBox}>
                                        <div className={styles.pointsInfo}>
                                            {t('available')}: <span>{user.reward_points.toLocaleString()} pt</span>
                                            {pointsToUse > 0 && <span className={styles.appliedBadge}>({pointsToUse.toFixed(0)} pt {t('applied')})</span>}
                                        </div>
                                        <div className={styles.pointsInputRow}>
                                            <div className={styles.pointsInputWrapper}>
                                                <input
                                                    type="number"
                                                    placeholder={t('pointsPlaceholder')}
                                                    value={pointsInput}
                                                    onChange={(e) => setPointsInput(e.target.value)}
                                                />
                                                <span className={styles.maxBtn} onClick={() => setPointsInput(user.reward_points)}>
                                                    {t('max')}
                                                </span>
                                            </div>
                                            <button className={styles.usePointsBtn} onClick={handleUsePoints}>
                                                {t('usePoints')}
                                            </button>
                                        </div>
                                        {pointsToUse > 0 && (
                                            <button className={styles.removeCouponBtn} onClick={() => removePoints()} style={{ marginTop: '10px' }}>
                                                <X size={14} /> Remove Points
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Totals Section */}
                            <div className={styles.totals}>
                                <h3 className={styles.totalTitle}>{t('cartTotal')}</h3>
                                <div className={styles.totalRow}>
                                    <span>{t('subtotal')}</span>
                                    <span>AED {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className={styles.discountRow}>
                                        <span>{t('couponDiscount')}</span>
                                        <span>- AED {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {pointsDiscountAmount > 0 && (
                                    <div className={styles.discountRow}>
                                        <span>{t('pointsDiscount')}</span>
                                        <span>- AED {pointsDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className={styles.totalRow}>
                                    <span>{t('taxableAmount')} (Excl. VAT)</span>
                                    <span>AED {(cartTotal / 1.05).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>{t('vatAmount')} (5%)</span>
                                    <span>AED {(cartTotal - (cartTotal / 1.05)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className={styles.finalTotal}>
                                    AED {cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.footer}>
                    {cartItems.length > 0 && (
                        <>
                            <button
                                className={styles.downloadQuotationBtn}
                                onClick={() => setShowQuotationPopup(true)}
                                disabled={isGeneratingQuote}
                            >
                                <Download size={20} />
                                <span>{t('downloadQuotation')}</span>
                            </button>
                            <button className={styles.checkoutBtn} onClick={handleCheckout}>
                                <span>{t('checkout')}</span>
                                {isArabic ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Coupons Drawer Overlay */}
            {showCoupons && (
                <div
                    className={`${styles.overlay} ${styles.overlayOpen}`}
                    style={{ zIndex: 2004 }}
                    onClick={() => setShowCoupons(false)}
                />
            )}

            {/* Coupons Selection Drawer */}
            <div className={`${styles.couponDrawer} ${showCoupons ? styles.couponDrawerOpen : ''}`}>
                <div className={styles.header}>
                    <div className={styles.continueShopping} onClick={() => setShowCoupons(false)}>
                        {isArabic ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        <span>{t('backToCart')}</span>
                    </div>
                </div>
                <div className={styles.content}>
                    <h3 className={styles.cartTitle}>{t('availableCoupons')}</h3>
                    <div className={styles.couponList} style={{ marginTop: '20px' }}>
                        {availableCoupons.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b' }}>{t('noCoupons')}</p>
                        ) : (
                            availableCoupons.map((coupon) => (
                                <div
                                    key={coupon.id}
                                    className={styles.couponCard}
                                    onClick={() => { setCouponCode(coupon.code); setShowCoupons(false); }}
                                >
                                    <div className={styles.couponCode}>{coupon.code}</div>
                                    <div className={styles.couponDesc}>{coupon.description}</div>
                                    <div className={styles.couponExpiry}>
                                        {t('expires')}: {coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : t('noExpiry')}
                                    </div>
                                    {coupon.is_sitewide ? (
                                        <span className={styles.allBrandsLabel}>{t('validSitewide')}</span>
                                    ) : (
                                        <div className={styles.restrictionText}>
                                            {coupon.brand_ids ? t('validBrands') : t('validProducts')}
                                        </div>
                                    )}
                                    <button className={styles.useCouponBtn}>{t('useCode')}</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quotation Popup Modal */}
            <div
                className={`${qStyles.quotationOverlay} ${showQuotationPopup ? qStyles.quotationOverlayOpen : ''}`}
                onClick={() => setShowQuotationPopup(false)}
            />
            <div className={`${qStyles.quotationPopup} ${showQuotationPopup ? qStyles.quotationPopupOpen : ''}`}>
                <div className={qStyles.quotationHeader}>
                    <h3>{t('downloadQuotationTitle')}</h3>
                    <button className={qStyles.closeQuotationBtn} onClick={() => setShowQuotationPopup(false)}>
                        <X size={18} />
                    </button>
                </div>
                <div className={qStyles.quotationContent}>
                    <form onSubmit={handleDownloadQuotation}>
                        <div className={qStyles.floatingField}>
                            <input
                                id="q-name"
                                type="text"
                                placeholder=" "
                                required
                                value={quotationForm.name}
                                onChange={(e) => setQuotationForm({ ...quotationForm, name: e.target.value })}
                            />
                            <label htmlFor="q-name">{t('fullName')} <span className={qStyles.required}>*</span></label>
                        </div>
                        <div className={qStyles.floatingField}>
                            <input
                                id="q-email"
                                type="email"
                                placeholder=" "
                                required
                                value={quotationForm.email}
                                onChange={(e) => setQuotationForm({ ...quotationForm, email: e.target.value })}
                            />
                            <label htmlFor="q-email">{t('email')} <span className={qStyles.required}>*</span></label>
                        </div>
                        <div className={qStyles.floatingField}>
                            <input
                                id="q-phone"
                                type="text"
                                placeholder=" "
                                required
                                value={quotationForm.phone}
                                onChange={(e) => setQuotationForm({ ...quotationForm, phone: e.target.value })}
                            />
                            <label htmlFor="q-phone">{t('phone')} <span className={qStyles.required}>*</span></label>
                        </div>
                        <div className={qStyles.floatingField}>
                            <input
                                id="q-vat"
                                type="text"
                                placeholder=" "
                                value={quotationForm.vat_number}
                                onChange={(e) => setQuotationForm({ ...quotationForm, vat_number: e.target.value })}
                            />
                            <label htmlFor="q-vat">{t('vatNumber')}</label>
                        </div>
                        <button
                            type="submit"
                            className={qStyles.downloadBtn}
                            disabled={isGeneratingQuote}
                        >
                            {isGeneratingQuote ? t('generating') : t('download')}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default CartDrawer;