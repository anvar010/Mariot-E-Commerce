'use client';

import React, { useState, useEffect } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
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
import Script from 'next/script';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import { customDimParts } from '@/utils/customDimensions';
import { resolveUrl } from '@/utils/resolveUrl';
import styles from './CartDrawer.module.css';
import qStyles from './CartDrawer.quotation.module.css';

const CartDrawer = () => {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('cart');
    const tNotif = useTranslations('notifications');
    const tDim = useTranslations('product');
    const isArabic = locale === 'ar';

    // Render the per-item attribute pills. For customizable products we have a
    // structured custom_dimensions map → localize the dimension labels + unit.
    // Otherwise fall back to the pre-built variant_label string.
    const renderItemPills = (item: any) => {
        const parts = customDimParts(item?.custom_dimensions, tDim);
        if (parts.length > 0) {
            return parts.map((part, i) => (
                <span key={i} className={styles.itemVariant}>{part}</span>
            ));
        }
        if (item?.variant_label) {
            return item.variant_label.split(' / ').map((part: string, i: number) => (
                <span key={i} className={styles.itemVariant}>{part}</span>
            ));
        }
        return null;
    };
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
        deliveryTotal,
        discountAmount,
        appliedCoupon,
        applyDiscount,
        removeDiscount,
        pointsToUse,
        pointsDiscountAmount,
        applyPoints,
        removePoints,
        clearCart
    } = useCart();

    // Local States
    const [couponCode, setCouponCode] = useState('');
    const [pointsInput, setPointsInput] = useState<number | string>(pointsToUse > 0 ? pointsToUse : '');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [showCoupons, setShowCoupons] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

    // Gift-trim modal: when a bundle parent's qty drops below the number of free
    // gifts attached, force the user to pick which gifts to drop.
    type GiftKey = { id: string | number; variant_id: number | null; custom_signature: string | null };
    type GiftTrim = {
        parentId: string | number;
        parentVariantId: number | null;
        parentCustomSig: string | null;
        newQty: number;
        excess: number;
        gifts: Array<any>;
        selected: GiftKey[];
    };
    const [giftTrim, setGiftTrim] = useState<GiftTrim | null>(null);

    const giftKeyEq = (a: GiftKey, b: GiftKey) =>
        String(a.id) === String(b.id)
        && (a.variant_id ?? null) === (b.variant_id ?? null)
        && (a.custom_signature ?? null) === (b.custom_signature ?? null);

    // Quotation States
    const [showQuotationPopup, setShowQuotationPopup] = useState(false);
    const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
    const [quotationForm, setQuotationForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone_number || '',
        vat_number: user?.vat_number || ''
    });

    // Update quotation form when user data loads or changes
    useEffect(() => {
        if (user) {
            setQuotationForm(prev => ({
                ...prev,
                name: prev.name || user.name || '',
                email: prev.email || user.email || '',
                phone: prev.phone || user.phone_number || '',
                vat_number: prev.vat_number || user.vat_number || ''
            }));
        }
    }, [user]);

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
                    const res = await fetch(`${API_BASE_URL}/coupons/available`, { credentials: "include", headers: getAuthHeaders() });
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
            // Prices are VAT-exclusive. subtotal = pre-discount items total; apply the
            // coupon + reward-points discount, then add 5% VAT on the discounted amount.
            const itemsSubtotal = subtotal;
            const totalDiscount = Number((discountAmount + pointsDiscountAmount).toFixed(2));
            const finalTaxable = Math.max(0, itemsSubtotal - totalDiscount); // == cartTotal
            const finalVat = finalTaxable * 0.05;

            // 1. Save quotation to database first
            const res = await fetch(`${API_BASE_URL}/quotations`, {
                credentials: "include",
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    locale,
                    customer_name: quotationForm.name,
                    customer_email: quotationForm.email,
                    customer_phone: quotationForm.phone,
                    vat_number: quotationForm.vat_number,
                    items: cartItems.map(it => ({ ...it, image: resolveUrl(it.image) })),
                    subtotal: Number(itemsSubtotal.toFixed(2)),
                    discount_amount: totalDiscount,
                    coupon_discount: Number(discountAmount.toFixed(2)),
                    points_discount: Number(pointsDiscountAmount.toFixed(2)),
                    coupon_code: appliedCoupon?.code || null,
                    points_used: Number(pointsToUse) || 0,
                    tax_amount: Number(finalVat.toFixed(2)),
                    total_amount: Number((finalTaxable + finalVat).toFixed(2))
                })
            });

            const data = await res.json();
            if (data.success) {
                // 2. Generate PDF using the returned quotation ref/data
                const pdfDataUri = await generateQuotationPDF(data.data, true, isArabic);

                // 3. Send the generated PDF to the backend so the email includes it as attachment
                if (pdfDataUri) {
                    fetch(`${API_BASE_URL}/quotations/${data.data.id}/send-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pdf_base64: pdfDataUri, locale })
                    }).catch(err => console.error('[Quotation] Failed to send email with PDF:', err));
                }

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
        if (!user || !token) {
            setIsDrawerOpen(false);
            router.push(`/signin?redirectTo=/checkout&reason=purchase`);
            return;
        }
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={styles.headerBadge}>
                                {cartCount} {cartCount === 1 ? t('item') : t('items')}
                            </div>
                            {cartItems.length > 0 && (
                                <button className={styles.clearCartBtn} onClick={() => setShowClearConfirm(true)}>
                                    <Trash2 size={12} />
                                    {t('clearCart')}
                                </button>
                            )}
                        </div>
                    </div>

                    {showClearConfirm && (
                        <div className={styles.clearConfirmBox}>
                            <p className={styles.clearConfirmText}>{t('clearCartConfirm')}</p>
                            <div className={styles.clearConfirmActions}>
                                <button className={styles.clearConfirmCancel} onClick={() => setShowClearConfirm(false)}>{t('cancel')}</button>
                                <button className={styles.clearConfirmOk} onClick={() => { clearCart(); setShowClearConfirm(false); }}>{t('clearCart')}</button>
                            </div>
                        </div>
                    )}

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
                                {(() => {
                                    // Build groups: each parent is shown with its bundled gifts in a single container.
                                    const parents = cartItems.filter((it: any) => !it.is_free_gift);
                                    const gifts = cartItems.filter((it: any) => it.is_free_gift);
                                    const groups: Array<{ parent: any; gifts: any[] }> = parents.map(p => ({
                                        parent: p,
                                        gifts: gifts.filter(g => g.bundle_parent_id != null && Number(g.bundle_parent_id) === Number(p.id))
                                    }));
                                    // Orphan gifts (parent removed elsewhere) rendered standalone with no parent.
                                    const orphans = gifts.filter(g => !parents.some(p => Number(p.id) === Number(g.bundle_parent_id)));
                                    orphans.forEach(o => groups.push({ parent: o, gifts: [] }));
                                    return groups;
                                })().map(({ parent, gifts: bundleGifts }) => {
                                    const isBundle = bundleGifts.length > 0;
                                    const groupKey = `${parent.id}-${parent.variant_id ?? 'base'}-${parent.custom_signature ?? ''}-${parent.is_free_gift ? 'gift' : 'main'}`;

                                    const renderRow = (item: any, opts: { compact?: boolean } = {}) => {
                                        const isGift = Boolean(item.is_free_gift);
                                        return (
                                            <div
                                                key={`row-${item.id}-${isGift ? 'g' : 'm'}`}
                                                className={styles.cartItem}
                                                style={opts.compact ? { borderBottom: 'none', paddingBottom: 0 } : undefined}
                                            >
                                                <div className={styles.itemImg} onClick={() => { setIsDrawerOpen(false); router.push(`/product/${item.slug}`); }}>
                                                    <img
                                                        src={resolveUrl(item.image) || '/assets/mariot-logo2.webp'}
                                                        alt={item.name}
                                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/mariot-logo2.webp'; }}
                                                    />
                                                    {!isGift && <span className={styles.itemCountBadge}>{item.quantity}</span>}
                                                </div>
                                                <div className={styles.itemDetails}>
                                                    <div className={styles.itemNameRow}>
                                                        <div className={styles.itemNameMain}>
                                                            <h4 className={styles.itemName}>{isArabic && item.name_ar ? item.name_ar : item.name}</h4>
                                                            {(item.custom_dimensions || item.variant_label) && (
                                                                <div className={styles.itemVariantList}>
                                                                    {renderItemPills(item)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.brand && <p className={styles.itemBrand}>{item.brand}</p>}
                                                    <div className={styles.itemPrice}>
                                                        {isGift ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                {Number(item.original_price) > 0 && (
                                                                    <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: 12 }}>
                                                                        <CurrencyPrice amount={Number(item.original_price)} />
                                                                    </span>
                                                                )}
                                                                <span style={{ color: '#16a34a', fontWeight: 700 }}>{isArabic ? 'مجاناً' : 'FREE'}</span>
                                                            </span>
                                                        ) : (
                                                            <span><CurrencyPrice amount={Number(item.price)} /></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    };

                                    if (!isBundle) {
                                        // Standalone item — keep original layout with per-row qty + trash.
                                        const item = parent;
                                        const isGift = Boolean(item.is_free_gift);
                                        return (
                                            <div key={groupKey} className={styles.cartItem}>
                                                <div className={styles.itemImg} onClick={() => { setIsDrawerOpen(false); router.push(`/product/${item.slug}`); }}>
                                                    <img
                                                        src={resolveUrl(item.image) || '/assets/mariot-logo2.webp'}
                                                        alt={item.name}
                                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/mariot-logo2.webp'; }}
                                                    />
                                                    <span className={styles.itemCountBadge}>{item.quantity}</span>
                                                </div>
                                                <div className={styles.itemDetails}>
                                                    <div className={styles.itemNameRow}>
                                                        <div className={styles.itemNameMain}>
                                                            <h4 className={styles.itemName}>{isArabic && item.name_ar ? item.name_ar : item.name}</h4>
                                                            {(item.custom_dimensions || item.variant_label) && (
                                                                <div className={styles.itemVariantList}>
                                                                    {renderItemPills(item)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!isGift && (
                                                            <button className={styles.removeBtn} onClick={() => removeFromCart(item.id, item.variant_id ?? null, item.custom_signature ?? null)}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {item.brand && <p className={styles.itemBrand}>{item.brand}</p>}
                                                    <div className={styles.itemPrice}>
                                                        {isGift ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                {Number(item.original_price) > 0 && (
                                                                    <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: 12 }}>
                                                                        <CurrencyPrice amount={Number(item.original_price)} />
                                                                    </span>
                                                                )}
                                                                <span style={{ color: '#16a34a', fontWeight: 700 }}>{isArabic ? 'مجاناً' : 'FREE'}</span>
                                                            </span>
                                                        ) : (
                                                            <span><CurrencyPrice amount={Number(item.price)} /></span>
                                                        )}
                                                    </div>
                                                    {!isGift && (
                                                        <div className={styles.qtySelectRow}>
                                                            <span className={styles.qtyLabel}>{t('qty')}</span>
                                                            <select
                                                                value={item.quantity}
                                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value), item.variant_id ?? null, item.custom_signature ?? null)}
                                                                className={styles.qtySelect}
                                                            >
                                                                {[...Array(10)].map((_, i) => (
                                                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Bundle: parent + gifts in one bordered container with shared footer.
                                    const bundleTotal = Number(parent.price) * Number(parent.quantity);
                                    return (
                                        <div key={groupKey} className={styles.bundleGroup}>
                                            {renderRow(parent)}
                                            {bundleGifts.map(g => (
                                                <React.Fragment key={`gift-${g.id}`}>
                                                    <div className={styles.bundleDivider} />
                                                    {renderRow(g, { compact: true })}
                                                </React.Fragment>
                                            ))}
                                            <div className={styles.bundleDivider} />
                                            <div className={styles.bundleFooter}>
                                                <div className={styles.bundleFooterTotal}>
                                                    <span>{isArabic ? 'إجمالي الحزمة' : 'Bundle Total'}</span>
                                                    <strong><CurrencyPrice amount={bundleTotal} /></strong>
                                                </div>
                                                <div className={styles.bundleFooterActions}>
                                                    <div className={styles.bundleQtyBox}>
                                                        <span className={styles.qtyLabel}>{t('qty')}</span>
                                                        <select
                                                            value={parent.quantity}
                                                            onChange={(e) => {
                                                                const newQty = parseInt(e.target.value);
                                                                // Site rule: at most one free gift per main-product unit.
                                                                // If the user drops parent qty below the number of attached gifts,
                                                                // ask them which gifts to remove before applying the qty change.
                                                                const excess = bundleGifts.length - newQty;
                                                                if (excess > 0) {
                                                                    setGiftTrim({
                                                                        parentId: parent.id,
                                                                        parentVariantId: parent.variant_id ?? null,
                                                                        parentCustomSig: parent.custom_signature ?? null,
                                                                        newQty,
                                                                        excess,
                                                                        gifts: bundleGifts,
                                                                        selected: []
                                                                    });
                                                                    return;
                                                                }
                                                                updateQuantity(parent.id, newQty, parent.variant_id ?? null, parent.custom_signature ?? null);
                                                            }}
                                                            className={styles.qtySelect}
                                                        >
                                                            {[...Array(10)].map((_, i) => (
                                                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button
                                                        className={styles.bundleRemoveBtn}
                                                        onClick={() => removeFromCart(parent.id, parent.variant_id ?? null, parent.custom_signature ?? null)}
                                                        aria-label="Remove bundle"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                                <X size={14} /> {t('removePoints')}
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
                                    <span><CurrencyPrice amount={subtotal} /></span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className={styles.discountRow}>
                                        <span>{t('couponDiscount')}</span>
                                        <span>- <CurrencyPrice amount={discountAmount} /></span>
                                    </div>
                                )}
                                {pointsDiscountAmount > 0 && (
                                    <div className={styles.discountRow}>
                                        <span>{t('pointsDiscount')}</span>
                                        <span>- <CurrencyPrice amount={pointsDiscountAmount} /></span>
                                    </div>
                                )}
                                <div className={styles.totalRow}>
                                    <span>{t('taxableAmount')} (Excl. VAT)</span>
                                    <span><CurrencyPrice amount={cartTotal} /></span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>{t('vatAmount')} (5%)</span>
                                    <span><CurrencyPrice amount={cartTotal * 0.05} /></span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>{isArabic ? 'رسوم التوصيل' : 'Delivery charge'}</span>
                                    {deliveryTotal > 0
                                        ? <span><CurrencyPrice amount={deliveryTotal} /></span>
                                        : <span style={{ color: '#16a34a', fontWeight: 700 }}>{isArabic ? 'مجاني' : 'FREE'}</span>}
                                </div>
                                <div className={styles.finalTotal}>
                                    <CurrencyPrice amount={cartTotal * 1.05 + deliveryTotal} />
                                </div>

                                {/* Tabby Promo in Cart
                                <div className={styles.tabbyPromoCart} style={{ marginTop: '15px' }}>
                                    <Script
                                        src="https://checkout.tabby.ai/tabby-promo.js"
                                        strategy="lazyOnload"
                                        onLoad={() => {
                                            if (typeof window !== 'undefined' && (window as any).TabbyPromo) {
                                                try {
                                                    new (window as any).TabbyPromo({
                                                        selector: '#TabbyPromoCart',
                                                        currency: 'AED',
                                                        price: cartTotal,
                                                        installmentsCount: 4,
                                                        lang: locale === 'ar' ? 'ar' : 'en',
                                                        source: 'cart',
                                                        publicKey: process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || 'pk_test_b6ac7af8-c300-4eb6-9ba6-a19ae3bf84de',
                                                        merchantCode: 'MARIOT'
                                                    });
                                                } catch (e) {
                                                    console.error('Tabby Promo Error', e);
                                                }
                                            }
                                        }}
                                    />
                                    <div id="TabbyPromoCart"></div>
                                </div> */}
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
                    style={{ zIndex: 30004 }}
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

            {/* Gift-trim modal — fires when the user reduces a bundle's parent qty
                below the number of attached free gifts. User must pick which gifts to drop. */}
            {giftTrim && (
                <div className={styles.giftTrimOverlay} onClick={() => setGiftTrim(null)}>
                    <div className={styles.giftTrimModal} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.giftTrimClose} onClick={() => setGiftTrim(null)} aria-label="Close">
                            <X size={18} />
                        </button>
                        <h3 className={styles.giftTrimTitle}>
                            {isArabic ? 'تم تغيير الكمية' : 'Quantity changed'}
                        </h3>
                        <p className={styles.giftTrimText}>
                            {isArabic
                                ? `قمت بتقليل الكمية إلى ${giftTrim.newQty}. لا يمكن الاحتفاظ إلا بهدية مجانية واحدة لكل قطعة. الرجاء اختيار ${giftTrim.excess} هدية لإزالتها:`
                                : `You reduced the quantity to ${giftTrim.newQty}. Only one free gift is allowed per unit. Please choose ${giftTrim.excess} gift${giftTrim.excess > 1 ? 's' : ''} to remove:`}
                        </p>
                        <div className={styles.giftTrimList}>
                            {giftTrim.gifts.map(g => {
                                const key: GiftKey = { id: g.id, variant_id: g.variant_id ?? null, custom_signature: g.custom_signature ?? null };
                                const isChecked = giftTrim.selected.some(s => giftKeyEq(s, key));
                                const canCheckMore = giftTrim.selected.length < giftTrim.excess;
                                return (
                                    <label
                                        key={`${g.id}-${g.variant_id ?? 'base'}-${g.custom_signature ?? ''}`}
                                        className={`${styles.giftTrimRow} ${isChecked ? styles.giftTrimRowOn : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={!isChecked && !canCheckMore}
                                            onChange={() => {
                                                setGiftTrim(prev => {
                                                    if (!prev) return prev;
                                                    const exists = prev.selected.some(s => giftKeyEq(s, key));
                                                    const nextSelected = exists
                                                        ? prev.selected.filter(s => !giftKeyEq(s, key))
                                                        : (prev.selected.length < prev.excess ? [...prev.selected, key] : prev.selected);
                                                    return { ...prev, selected: nextSelected };
                                                });
                                            }}
                                        />
                                        <img className={styles.giftTrimImg} src={resolveUrl(g.image) || '/assets/mariot-logo2.webp'} alt={g.name} />
                                        <span className={styles.giftTrimName}>{g.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className={styles.giftTrimActions}>
                            <button className={styles.giftTrimCancel} onClick={() => setGiftTrim(null)}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                className={styles.giftTrimConfirm}
                                disabled={giftTrim.selected.length !== giftTrim.excess}
                                onClick={async () => {
                                    const trim = giftTrim;
                                    setGiftTrim(null);
                                    // Remove the chosen gifts first, then apply the new parent qty.
                                    for (const k of trim.selected) {
                                        await removeFromCart(k.id, k.variant_id, k.custom_signature, true);
                                    }
                                    updateQuantity(trim.parentId, trim.newQty, trim.parentVariantId, trim.parentCustomSig);
                                }}
                            >
                                {isArabic ? 'تأكيد' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quotation Popup Modal */}
            <div
                className={`${qStyles.quotationOverlay} ${showQuotationPopup ? qStyles.quotationOverlayOpen : ''}`}
                onClick={() => setShowQuotationPopup(false)}
            />
            <div className={`${qStyles.quotationPopup} ${showQuotationPopup ? qStyles.quotationPopupOpen : ''}`}>
                <div className={qStyles.quotationHeader}>
                    <h3>{t('downloadQuotationTitle')}</h3>
                    <button className={qStyles.closeQuotationBtn} onClick={() => setShowQuotationPopup(false)} aria-label="Close quotation">
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