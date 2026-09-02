'use client';

import React, { useState, useEffect, useRef } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
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
    Check,
    Home,
    Building2,
    MoreHorizontal,
    BadgeCheck,
    Plus,
    Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, TABBY_ENABLED, SHIPPING_QUOTES_ENABLED } from '@/config';
import { settlementFeeFor } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { formatCustomDims } from '@/utils/customDimensions';
import { resolveUrl } from '@/utils/resolveUrl';
import styles from './checkout.module.css';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import SavedCards from '@/components/Payment/SavedCards';
import CardManagerModal from '@/components/Payment/CardManagerModal';
import WalletExpressCheckout from '@/components/Payment/WalletExpressCheckout';
import { SavedCard, listCards } from '@/utils/paymentMethodsApi';
import OtpVerifyModal from '@/components/shared/OtpVerifyModal/OtpVerifyModal';
import AddressBookSheet from '@/components/Checkout/AddressBookSheet';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');

function CheckoutContent() {
    const stripe = useStripe();
    const elements = useElements();
    const { cartItems, cartTotal, deliveryTotal, discountAmount, pointsToUse, pointsDiscountAmount, appliedCoupon, clearCart, applyDiscount, removeDiscount, applyPoints, removePoints } = useCart();
    const { user, token, loading, refreshUser } = useAuth();
    const [otpOpen, setOtpOpen] = useState(false);
    const { showNotification } = useNotification();
    const n = useTranslations('notifications');
    const t = useTranslations('checkout');
    const common = useTranslations('common');
    const tProd = useTranslations('product');
    const otpT = useTranslations('otpModal');
    const cardsT = useTranslations('checkout.cards');

    // One bag of strings for both the inline list and the manager modal, so the
    // two can never drift apart.
    const cardLabels = {
        newCard: cardsT('useNewCard'), addCard: cardsT('addCard'), empty: cardsT('noSavedCards'),
        defaultBadge: cardsT('defaultBadge'), expiredBadge: cardsT('expiredBadge'), expires: cardsT('expires'),
        makeDefault: cardsT('makeDefault'), edit: cardsT('edit'), remove: cardsT('remove'),
        manageTitle: cardsT('manageTitle'), addTitle: cardsT('addTitle'), editTitle: cardsT('editTitle'),
        removeTitle: cardsT('removeTitle'), nameOnCard: cardsT('nameOnCard'), namePlaceholder: cardsT('namePlaceholder'),
        cardNumber: cardsT('cardNumber'), expiry: cardsT('expiry'), cvc: cardsT('cvc'),
        expiryMonth: cardsT('expiryMonth'), expiryYear: cardsT('expiryYear'), setAsDefault: cardsT('setAsDefault'),
        secureNote: cardsT('secureNote'), editHint: cardsT('editHint'),
        removeConfirm: cardsT('removeConfirm'), removeConfirmSub: cardsT('removeConfirmSub'),
        save: cardsT('save'), saving: cardsT('saving'), cancel: cardsT('cancel'),
        add: cardsT('add'), adding: cardsT('adding'), removing: cardsT('removing'), done: cardsT('done'),
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = useLocale();

    // Handle Tabby / Tamara redirect statuses (cancel/failure)
    useEffect(() => {
        const tabbyStatus = searchParams.get('tabby_status');
        if (tabbyStatus === 'cancel') {
            showNotification(n('tabbyCancel'), 'error');
        } else if (tabbyStatus === 'failure') {
            showNotification(n('tabbyFailure'), 'error');
        }

        const tamaraStatus = searchParams.get('tamara_status');
        if (tamaraStatus === 'cancel') {
            showNotification(n('tamaraCancel'), 'error');
        } else if (tamaraStatus === 'failure') {
            showNotification(n('tamaraFailure'), 'error');
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
        orderNotes: '',
        // How this address is saved to the account once the order is placed.
        addressType: 'home',
        addressLabel: ''
    });

    // Empty until the shopper picks one: Complete Purchase stays disabled until both a
    // payment method and a delivery method have been chosen deliberately.
    const [paymentMethod, setPaymentMethod] = useState('');

    // Saved cards. selectedCardId === null means "pay with a new card", which is
    // also the only possible state for a guest or a shopper with nothing saved.
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [cardsLoading, setCardsLoading] = useState(false);
    const [saveCard, setSaveCard] = useState(false);
    const [cardManagerOpen, setCardManagerOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Delivery options, quoted live from the carriers for the selected address.
    const [shippingMethods, setShippingMethods] = useState<any[]>([]);
    const [selectedShipping, setSelectedShipping] = useState<string>('');
    const [shippingLoading, setShippingLoading] = useState(false);
    const [shippingError, setShippingError] = useState('');

    const [cardDetails, setCardDetails] = useState({
        name: '',
        number: '',
        expiry: '',
        cvc: ''
    });

    const [couponCode, setCouponCode] = useState('');
    const [pointsInput, setPointsInput] = useState<number | string>(pointsToUse > 0 ? pointsToUse : '');
    const [showPointsBox, setShowPointsBox] = useState(pointsToUse > 0);
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
    const [addressSheetOpen, setAddressSheetOpen] = useState(false);
    const addressDropdownRef = useRef<HTMLDivElement>(null);

    // Order receiver (who will be at the door) — defaults to the registered user.
    const [receiverName, setReceiverName] = useState(user?.name || '');
    const [receiverPhone, setReceiverPhone] = useState(user?.phone_number || '');
    const [editingReceiver, setEditingReceiver] = useState(false);
    const [recvCode, setRecvCode] = useState('+971');
    const [recvNumber, setRecvNumber] = useState('');
    const [codeOpen, setCodeOpen] = useState(false);
    const [snapReceiver, setSnapReceiver] = useState({ name: '', phone: '' });

    const dialCodes = [
        { code: '+971', label: 'UAE' },
        { code: '+966', label: 'Saudi Arabia' },
        { code: '+968', label: 'Oman' },
        { code: '+973', label: 'Bahrain' },
        { code: '+965', label: 'Kuwait' },
        { code: '+974', label: 'Qatar' },
        { code: '+91', label: 'India' },
    ];

    const openReceiverEdit = () => {
        setSnapReceiver({ name: receiverName, phone: receiverPhone });
        const m = (receiverPhone || '').match(/^(\+\d{1,4})[\s-]?(.*)$/);
        setRecvCode(m ? m[1] : '+971');
        setRecvNumber(m ? m[2].trim() : (receiverPhone || ''));
        setCodeOpen(false);
        setEditingReceiver(true);
    };

    const saveReceiver = () => {
        setReceiverPhone(`${recvCode} ${recvNumber}`.trim());
        setEditingReceiver(false);
    };

    const cancelReceiver = () => {
        setReceiverName(snapReceiver.name);
        setReceiverPhone(snapReceiver.phone);
        setCodeOpen(false);
        setEditingReceiver(false);
    };

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

        // Receiver follows the selected address (each address has its own contact)
        setReceiverName(`${addr.first_name || ''} ${addr.last_name || ''}`.trim());
        setReceiverPhone(addr.phone || '');
        setEditingReceiver(false);
    };

    const goToAddressManager = () => {
        setAddressSheetOpen(true);
    };

    // Keep checkout's selection valid when addresses change inside the sheet
    // (e.g. the selected one was deleted). Falls back to default → first.
    const handleAddressesChange = (list: any[]) => {
        setUserAddresses(list);
        const stillThere = list.find(a => a.id.toString() === selectedAddressId.toString());
        if (!stillThere) {
            const fallback = list.find(a => a.is_default) || list[0];
            if (fallback) {
                handleAddressOptionClick(fallback);
            } else {
                setSelectedAddressId('');
            }
        }
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

    const selectedShippingMethod = shippingMethods.find(m => m.code === selectedShipping) || null;
    const shippingCost = Number(selectedShippingMethod?.price || 0);

    // Calculate final processing totals early so useEffects can use them
    // Prices are VAT-exclusive — add 5% VAT on top of the discounted total (cartTotal),
    // then add per-product delivery charges (delivery is not VAT-taxed) and the carrier's
    // charge for the chosen delivery method.
    const preFeeTotal = cartTotal * 1.05 + deliveryTotal + shippingCost;
    // BNPL providers keep a slice of what they settle; that cost is passed on as its own
    // line. Computed from the same rule the server uses, so the figure shown here is the
    // figure charged -- the server still recomputes it and its answer is authoritative.
    const settlementFee = settlementFeeFor(paymentMethod, preFeeTotal);
    const finalTotal = preFeeTotal + settlementFee;

    // Re-quote whenever the destination or the cart changes. The previous selection is
    // cleared first: a price quoted for one address must never be charged for another.
    useEffect(() => {
        const destination = (() => {
            const saved = userAddresses.find(a => a.id?.toString() === selectedAddressId?.toString());
            if (saved) return { country: saved.country, city: saved.city, zip_code: saved.zip_code, state: saved.state };
            if (form.country) return { country: form.country, city: form.city, zip_code: form.postcode };
            return null;
        })();

        if (!SHIPPING_QUOTES_ENABLED || !destination?.country || cartItems.length === 0) {
            setShippingMethods([]);
            setSelectedShipping('');
            return;
        }

        let cancelled = false;
        setShippingLoading(true);
        setShippingError('');
        setSelectedShipping('');

        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/shipping/quote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cartItems.map(i => ({ id: i.id, quantity: i.quantity })),
                        destination,
                    }),
                });
                const data = await res.json();
                if (cancelled) return;

                if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                    setShippingMethods(data.data);
                    // Cheapest first from the API; pre-selecting the only option saves a click
                    // without making a price choice on the shopper's behalf.
                    if (data.data.length === 1) setSelectedShipping(data.data[0].code);
                } else {
                    setShippingMethods([]);
                    setShippingError(data.message || t('shippingUnavailable'));
                }
            } catch {
                if (!cancelled) {
                    setShippingMethods([]);
                    setShippingError(t('shippingUnavailable'));
                }
            } finally {
                if (!cancelled) setShippingLoading(false);
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAddressId, userAddresses, cartItems, form.country, form.city, form.postcode]);

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
                // Pre-select the default address, else fall back to the first saved one.
                const defaultAddr = data.data.find((a: any) => a.is_default) || data.data[0];
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
                    setReceiverName(`${defaultAddr.first_name || ''} ${defaultAddr.last_name || ''}`.trim());
                    setReceiverPhone(defaultAddr.phone || '');
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

    // user may resolve after the form's useState init ran with empty values.
    // Backfill identity fields from the profile, without clobbering anything
    // the shopper already typed.
    useEffect(() => {
        if (!user) return;
        const fullName = (user.name || '').trim();
        setForm(prev => ({
            ...prev,
            firstName: prev.firstName || fullName.split(' ')[0] || '',
            lastName: prev.lastName || fullName.split(' ').slice(1).join(' ') || '',
            email: prev.email || user.email || '',
            phone: prev.phone || user.phone_number || ''
        }));
        setReceiverName((prev: string) => prev || user.name || '');
        setReceiverPhone((prev: string) => prev || user.phone_number || '');
    }, [user]);

    // Force re-render of Tabby Promo if coming back to the tab
    // Load saved cards once there is a signed-in shopper. Guests never call this;
    // the endpoint is authenticated and would just 401.
    useEffect(() => {
        if (!user) {
            setSavedCards([]);
            setSelectedCardId(null);
            return;
        }
        let cancelled = false;
        setCardsLoading(true);
        listCards()
            .then((cards) => {
                if (cancelled) return;
                setSavedCards(cards);
                // Preselect the default card, but never an expired one — that would
                // put the shopper one click from a guaranteed decline.
                const preferred = cards.find(c => c.is_default && !c.is_expired) || cards.find(c => !c.is_expired);
                setSelectedCardId(preferred ? preferred.id : null);
            })
            .catch(() => { if (!cancelled) setSavedCards([]); })
            .finally(() => { if (!cancelled) setCardsLoading(false); });
        return () => { cancelled = true; };
    }, [user?.id]);

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

    // One payload builder for both routes into checkout: the Place Order button
    // and the wallet sheet. They must send the server an identical order — the only
    // difference is that a wallet supplies the payment method itself, so the
    // saved-card fields do not apply.
    /**
     * Saves the address typed on this page to the shopper's account and returns its id.
     *
     * Until now a shopper without a saved address had theirs thrown away: the order went out
     * with shipping_address_id 1, a hardcoded placeholder pointing at somebody else's row.
     * Saving it here means the order references the real address and the shopper does not
     * retype it next time. A failure is not fatal -- the order still carries the same details
     * in billing_details -- so checkout continues rather than blocking on a save.
     */
    const saveTypedAddress = async (): Promise<number | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/addresses`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address_type: form.addressType || 'home',
                    address_label: form.addressType === 'other' ? form.addressLabel.trim() : '',
                    first_name: form.firstName,
                    last_name: form.lastName,
                    company_name: form.companyName,
                    email: form.email,
                    address_line1: form.streetAddress,
                    address_line2: form.additionalAddress,
                    city: form.city,
                    state: 'UAE',
                    zip_code: form.postcode,
                    country: form.country,
                    phone: form.phone,
                    is_default: true,
                }),
            });
            const data = await res.json();
            if (data?.success) {
                const id = data.data?.id ?? data.id ?? null;
                if (id) {
                    setSelectedAddressId(id);
                    fetchAddresses();
                }
                return id;
            }
            console.warn('[checkout] address not saved:', data?.message);
        } catch (err) {
            console.warn('[checkout] address save failed:', err);
        }
        return null;
    };

    const buildOrderData = (overrides: Record<string, any> = {}) => ({
        items: cartItems.map(item => ({
            product_id: item.id,
            variant_id: item.variant_id ?? null,
            quantity: item.quantity,
            price: item.price,
            custom_dimensions: item.custom_dimensions || null,
            custom_label: item.variant_label || null
        })),
        shipping_address_id: overrides.shipping_address_id ?? (selectedAddressId || 1),
        payment_method: paymentMethod,
        // Either charge a card the shopper already saved, or offer to keep the
        // one being entered now. Never both.
        payment_method_id: paymentMethod === 'card' ? selectedCardId : null,
        save_card: paymentMethod === 'card' && !selectedCardId && saveCard,
        // Sent for the record; the server re-quotes rather than trusting this price.
        shipping_method: selectedShippingMethod?.code || null,
        shipping_carrier: selectedShippingMethod?.carrier || null,
        shipping_cost: shippingCost,
        points_to_use: pointsToUse,
        discount_amount: discountAmount + pointsDiscountAmount,
        coupon_id: appliedCoupon?.id,
        billing_details: {
            ...form,
            name: (user && userAddresses.length > 0 && receiverName.trim())
                ? receiverName.trim()
                : `${form.firstName} ${form.lastName}`.trim(),
            phone: (user && userAddresses.length > 0 && receiverPhone.trim())
                ? receiverPhone.trim()
                : form.phone
        },
        locale: locale,
        ...overrides,
    });

    // ── Wallet checkout (Apple Pay / Google Pay) ─────────────────────────────
    // The wallet sheet has already collected the card by the time this runs, so
    // the order is created here and its PaymentIntent handed straight back for
    // confirmation. Nothing about the card form is involved.
    const walletValidate = () => {
        if (cartItems.length === 0) return n('orderFailed');
        if (!token) return n('checkoutSignin');
        if (SHIPPING_QUOTES_ENABLED && !selectedShipping) return t('selectShippingFirst');

        // The wallet sheet bypasses the form, so the browser's own `required` validation
        // never runs -- without this the shopper could pay with no delivery address at all
        // and the order would be created with empty shipping details.
        const hasSavedAddress = Boolean(user && userAddresses.length > 0 && selectedAddressId);
        if (!hasSavedAddress) {
            const missing = !form.firstName?.trim() || !form.streetAddress?.trim()
                || !form.city?.trim() || !form.phone?.trim() || !form.email?.trim();
            if (missing) return t('walletAddressRequired');
        }
        return null;
    };

    const walletCreateOrder = async () => {
        const res = await fetch(`${API_BASE_URL}/orders`, {
            credentials: 'include',
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            // A wallet always pays by card, whatever tab happens to be selected, and
            // never saves the card: the shopper keeps it in their wallet already.
            body: JSON.stringify(buildOrderData({
                payment_method: 'card',
                payment_method_id: null,
                save_card: false,
            })),
        });
        const data = await res.json();
        if (!data.success || !data.client_secret) {
            throw new Error(data.message || n('orderFailed'));
        }
        return { clientSecret: data.client_secret, orderId: data.data?.id };
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

        // The button is disabled without these, but a form can still be submitted by keyboard.
        if (SHIPPING_QUOTES_ENABLED && !selectedShipping) {
            showNotification(t('selectShippingFirst'), 'error');
            return;
        }

        if (!paymentMethod) {
            showNotification(t('selectPaymentFirst'), 'error');
            return;
        }

        // A signed-in shopper with nothing in their address book is typing one now: file it
        // under the type they chose, and hang this order off the saved row rather than the
        // placeholder id.
        let savedAddressId: number | null = null;
        if (user && userAddresses.length === 0) {
            savedAddressId = await saveTypedAddress();
        }

        // DISABLED: WhatsApp OTP phone verification – re-enable when ready
        // if (!user?.phone_verified) {
        //     setOtpOpen(true);
        //     return;
        // }

        setIsProcessing(true);

        try {
            if (paymentMethod === 'card') {
                if (!stripe || !elements) {
                    showNotification(t('processing'), 'error'); // Fallback error if Stripe isn't ready
                    setIsProcessing(false);
                    return;
                }
                // A saved card carries its own billing details; only a freshly typed
                // card needs the name field filled in.
                if (!selectedCardId && !cardDetails.name) {
                    showNotification(n('cardDetailsRequired'), 'error');
                    setIsProcessing(false);
                    return;
                }
                if (selectedCardId) {
                    const chosen = savedCards.find(c => c.id === selectedCardId);
                    if (chosen?.is_expired) {
                        showNotification(cardsT('cardExpiredError'), 'error');
                        setIsProcessing(false);
                        return;
                    }
                }
            }

            const orderData = buildOrderData(savedAddressId ? { shipping_address_id: savedAddressId } : {});

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
                    // Paying with a saved card confirms against the id the server
                    // authorised (data.payment_method_id), not the card fields — those
                    // are empty in that case. A new card confirms against the Element.
                    const savedId = data.payment_method_id || null;

                    if ((savedId || cardNumberElement) && stripe) {
                        const { error, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, savedId ? {
                            payment_method: savedId,
                        } : {
                            payment_method: {
                                card: cardNumberElement!,
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
                            // The order has already changed the reward balance server-side;
                            // without this the header keeps showing the pre-order figure until
                            // a full page load, and checkout would offer points already spent.
                            await refreshUser();
                            showNotification(n('orderSuccess'));
                            router.push(`/checkoutsuccess?orderId=${data.data?.id || ''}`);
                            return;
                        }
                    }
                }
                // Dev Mock handling
                else if (data.payment_mock) {
                    await clearCart();
                    await refreshUser();
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
                    await refreshUser();
                    showNotification(n('orderSuccess'));
                    router.push(`/checkoutsuccess?orderId=${data.data?.id || ''}`);
                }
            } else {
                // if (data.type === 'PHONE_NOT_VERIFIED') {
                //     setOtpOpen(true);
                //     showNotification(otpT('checkoutDesc'), 'error');
                // } else {
                    const errorMsg = data.error_details?.error ? `${data.message}: ${data.error_details.error}` : (data.message || n('orderFailed'));
                    showNotification(errorMsg, 'error');
                // }
            }

        } catch (error) {
            console.error('Checkout error:', error);
            showNotification(n('checkoutError'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    // Prices are VAT-exclusive — 5% VAT is added on top of the discounted total (cartTotal).
    const vatAmount = cartTotal * 0.05;
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

                {(() => {
                    const selAddr = userAddresses.find(a => a.id.toString() === selectedAddressId.toString());
                    if (!user || !selAddr) return null;
                    const icon = selAddr.address_type === 'home' ? <Home size={20} /> : selAddr.address_type === 'work' ? <Building2 size={20} /> : <MapPin size={20} />;
                    // A custom-labelled address shows its own name: "Deliver to Warehouse",
                    // not "Deliver to Other". The address book and the dashboard already
                    // read it this way; this banner was the one place that didn't.
                    const typeLabel = selAddr.address_type === 'home' ? t('typeHome')
                        : selAddr.address_type === 'work' ? t('typeWork')
                        : (selAddr.address_label?.trim() || t('typeOther'));
                    return (
                        <div className={styles.deliverBanner} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                            <div className={styles.deliverIcon}>{icon}</div>
                            <div className={styles.deliverText}>
                                <span className={styles.deliverTitle}>{t('deliverTo')} {typeLabel}</span>
                                <span className={styles.deliverAddr}>{selAddr.address_line1}</span>
                            </div>
                            <button type="button" className={styles.deliverEdit} onClick={goToAddressManager}>
                                {t('editAddress')}
                            </button>
                        </div>
                    );
                })()}

                {user && userAddresses.length > 0 && (
                    <div className={styles.receiverCard} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                        <h3 className={styles.receiverHeading}>{t('whoReceives')}</h3>

                        {!editingReceiver ? (
                            <div className={styles.receiverRow}>
                                <div className={styles.receiverIcon}><Phone size={18} /></div>
                                <div className={styles.receiverInfo}>
                                    <span className={styles.receiverName}>{receiverName}</span>
                                    <span className={styles.receiverPhone} dir="ltr">{receiverPhone}</span>
                                </div>
                                <button type="button" className={styles.receiverChange} onClick={openReceiverEdit}>
                                    {t('changeReceiver')}
                                </button>
                            </div>
                        ) : (
                            <div className={styles.receiverForm}>
                                <p className={styles.receiverFormTitle}>{t('someoneElse')}</p>
                                <label className={styles.receiverFieldLabel}>{t('addReceiverContact')}</label>
                                <input
                                    type="text"
                                    className={styles.receiverNameInput}
                                    value={receiverName}
                                    onChange={(e) => setReceiverName(e.target.value)}
                                    placeholder={t('namePlaceholder')}
                                />
                                <div className={styles.receiverPhoneRow} dir="ltr">
                                    <div className={styles.receiverCodeWrap}>
                                        <button type="button" className={styles.receiverCodeBtn} onClick={() => setCodeOpen(!codeOpen)}>
                                            <span dir="ltr">{recvCode}</span>
                                            <ChevronDown size={16} className={codeOpen ? styles.codeChevronOpen : ''} />
                                        </button>
                                        {codeOpen && (
                                            <>
                                                <div className={styles.codeBackdrop} onClick={() => setCodeOpen(false)} />
                                                <div className={styles.codeMenu}>
                                                    {dialCodes.map(dc => (
                                                        <button
                                                            type="button"
                                                            key={dc.code}
                                                            className={`${styles.codeItem} ${recvCode === dc.code ? styles.codeItemActive : ''}`}
                                                            onClick={() => { setRecvCode(dc.code); setCodeOpen(false); }}
                                                        >
                                                            <span className={styles.codeItemCode} dir="ltr">{dc.code}</span>
                                                            <span className={styles.codeItemLabel}>{dc.label}</span>
                                                            {recvCode === dc.code && <Check size={15} className={styles.codeItemCheck} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className={styles.receiverNumberWrap}>
                                        <input
                                            type="tel"
                                            dir="ltr"
                                            className={styles.receiverNumberInput}
                                            value={recvNumber}
                                            onChange={(e) => setRecvNumber(e.target.value)}
                                            placeholder="-- --- ----"
                                        />
                                        {!!recvNumber && (
                                            <button type="button" className={styles.receiverClear} onClick={() => setRecvNumber('')} aria-label="Clear">
                                                <CloseIcon size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.receiverActions}>
                                    <button type="button" className={styles.receiverCancelBtn} onClick={cancelReceiver}>
                                        {common('cancel')}
                                    </button>
                                    <button type="button" className={styles.receiverSaveBtn} onClick={saveReceiver}>
                                        {t('saveReceiver')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {SHIPPING_QUOTES_ENABLED && (shippingLoading || shippingMethods.length > 0 || shippingError) && (
                    <div className={styles.shippingCard} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                        <h3 className={styles.shippingHeading}>{t('shippingMethod')}</h3>

                        {shippingLoading && (
                            <div className={styles.shippingLoading}>
                                <Clock size={16} className={styles.animateSpin} />
                                <span>{t('shippingLoading')}</span>
                            </div>
                        )}

                        {!shippingLoading && shippingError && (
                            <p className={styles.shippingError}>{shippingError}</p>
                        )}

                        {!shippingLoading && shippingMethods.map((method) => {
                            const isSelected = selectedShipping === method.code;
                            const days = method.min_days && method.max_days
                                ? (method.min_days === method.max_days
                                    ? `${method.min_days}`
                                    : `${method.min_days}-${method.max_days}`)
                                : null;

                            return (
                                <label
                                    key={method.code}
                                    className={`${styles.shippingOption} ${isSelected ? styles.shippingOptionActive : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="shippingMethod"
                                        value={method.code}
                                        checked={isSelected}
                                        onChange={() => setSelectedShipping(method.code)}
                                    />
                                    <span className={styles.shippingOptionBody}>
                                        <span className={styles.shippingOptionTop}>
                                            <span className={styles.shippingOptionName}>
                                                {locale === 'ar' && method.label_ar ? method.label_ar : method.label}
                                            </span>
                                            {method.carrier && (
                                                <span className={styles.shippingCarrier}>{method.carrier}</span>
                                            )}
                                        </span>
                                        {days && (
                                            <span className={styles.shippingDays}>{t('shippingDays', { days })}</span>
                                        )}
                                        <span className={styles.shippingPrice}>
                                            <CurrencyPrice amount={Number(method.price)} />
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}

                <form className={styles.checkoutLayout} onSubmit={handlePlaceOrder}>
                    <div className={styles.leftColumn}>
                        {/* Step 1: Shipping Information — only for users without a saved address */}
                        {!(user && userAddresses.length > 0) && (
                        <div className={styles.checkoutSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.stepNumber}>1</div>
                                <h2 className={styles.sectionTitle}>{t('shippingInfo')}</h2>
                            </div>

                            {/* Where this address is filed on the account. Only offered to a
                                signed-in shopper, because a guest has no account to save to. */}
                            {user && (
                                <div className={styles.saveAsBlock}>
                                    <span className={styles.saveAsLabel}>{t('saveAddressAs')}</span>
                                    <div className={styles.saveAsRow}>
                                        {[
                                            { key: 'home', label: t('typeHome'), icon: <Home size={16} /> },
                                            { key: 'work', label: t('typeWork'), icon: <Building2 size={16} /> },
                                            { key: 'other', label: t('typeOther'), icon: <MapPin size={16} /> },
                                        ].map(tp => (
                                            <button
                                                type="button"
                                                key={tp.key}
                                                className={`${styles.saveAsBtn} ${form.addressType === tp.key ? styles.saveAsBtnActive : ''}`}
                                                onClick={() => setForm(prev => ({ ...prev, addressType: tp.key }))}
                                            >
                                                {tp.icon}
                                                <span>{tp.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {form.addressType === 'other' && (
                                        <div className={styles.formGroup} style={{ marginTop: 12 }}>
                                            <label>{t('addressLabelName')} <span>*</span></label>
                                            <div className={styles.inputWrapper}>
                                                <input
                                                    className={styles.formInput}
                                                    type="text"
                                                    name="addressLabel"
                                                    maxLength={100}
                                                    value={form.addressLabel}
                                                    onChange={handleInputChange}
                                                    required
                                                    placeholder={t('addressLabelPlaceholder')}
                                                />
                                                <MapPin className={styles.inputIcon} size={15} />
                                            </div>
                                        </div>
                                    )}
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
                                    <label>{t('lastName')}</label>
                                    <div className={styles.inputWrapper}>
                                        <input className={styles.formInput} type="text" name="lastName" value={form.lastName} onChange={handleInputChange} placeholder="e.g. Doe" />
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
                                        <input className={styles.formInput} type="tel" name="phone" value={form.phone} onChange={handleInputChange} required placeholder="+971 -- --- ----" dir="ltr" style={locale === 'ar' ? { paddingInlineStart: '12px', paddingInlineEnd: '42px' } : undefined} />
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
                        )}

                        {/* Step 2: Payment Method */}
                        <div className={styles.checkoutSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.stepNumber}>2</div>
                                <h2 className={styles.sectionTitle}>{t('paymentMethod')}</h2>
                            </div>

                            {/* Apple Pay / Google Pay. Renders nothing unless the visitor
                                actually has a usable wallet, so it costs nothing when it
                                cannot be used. Sits above the payment tabs because a wallet
                                skips every field below it. */}
                            <WalletExpressCheckout
                                amount={finalTotal}
                                validate={walletValidate}
                                onCreateOrder={walletCreateOrder}
                                onSuccess={async (orderId) => {
                                    await clearCart();
                                    await refreshUser();
                                    showNotification(n('orderSuccess'));
                                    router.push(`/checkoutsuccess?orderId=${orderId || ''}`);
                                }}
                                onError={(msg) => showNotification(msg, 'error')}
                                heading={t('cards.expressCheckout')}
                                dividerText={t('cards.orPayAnotherWay')}
                                isRtl={locale === 'ar'}
                            />

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

                                        {/* Saved cards. Guests and shoppers with nothing saved skip
                                            straight to the card form below. */}
                                        {user && (savedCards.length > 0 || cardsLoading) && (
                                            <div className={styles.savedCardsBlock}>
                                                <div className={styles.savedCardsHead}>
                                                    <div>
                                                        <span className={styles.savedCardsTitle}>{cardsT('savedCardsTitle')}</span>
                                                        <span className={styles.savedCardsSub}>{cardsT('savedCardsSub')}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className={styles.manageCardsBtn}
                                                        onClick={() => setCardManagerOpen(true)}
                                                    >
                                                        <Settings2 size={14} />
                                                        {cardsT('manageCards')}
                                                    </button>
                                                </div>

                                                <SavedCards
                                                    cards={savedCards}
                                                    loading={cardsLoading}
                                                    mode="select"
                                                    selectedId={selectedCardId}
                                                    onSelect={setSelectedCardId}
                                                    showNewCardRow
                                                    labels={cardLabels}
                                                />
                                            </div>
                                        )}

                                        {/* The card form only appears when a new card is being entered;
                                            a saved card needs none of these fields. */}
                                        {!selectedCardId && (
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

                                            {/* Offer to keep this card. Only for signed-in shoppers:
                                                a guest has no account to attach it to. */}
                                            {user && (
                                                <label className={styles.saveCardRow}>
                                                    <input
                                                        type="checkbox"
                                                        checked={saveCard}
                                                        onChange={(e) => setSaveCard(e.target.checked)}
                                                    />
                                                    <span>
                                                        <span className={styles.saveCardLabel}>{cardsT('saveCardPrompt')}</span>
                                                        <span className={styles.saveCardNote}>{cardsT('saveCardNote')}</span>
                                                    </span>
                                                </label>
                                            )}

                                            <div className={styles.cardSecureFooter}>
                                                <ShieldCheck size={14} />
                                                <span>{t('securePaymentNotice')}</span>
                                            </div>
                                        </div>
                                        )}

                                        {/* Nothing saved yet, but signed in — let them add a card
                                            from here rather than sending them to their profile. */}
                                        {user && savedCards.length === 0 && !cardsLoading && (
                                            <button
                                                type="button"
                                                className={styles.manageCardsInline}
                                                onClick={() => setCardManagerOpen(true)}
                                            >
                                                <Settings2 size={14} />
                                                {cardsT('manageCards')}
                                            </button>
                                        )}
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

                                {TABBY_ENABLED && (<>
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
                                </>)}

                                {/* Tamara */}
                                <div className={`${styles.paymentTab} ${paymentMethod === 'tamara' ? styles.active : ''}`} onClick={() => setPaymentMethod('tamara')}>
                                    <div className={styles.radioDot}>
                                        <div className={styles.radioDotInner}></div>
                                    </div>
                                    <div className={styles.tabText}>
                                        <span className={styles.tabTitle}>{t('tamaraTitle')}</span>
                                        <span className={styles.tabDesc}>{t('tamaraDesc')}</span>
                                    </div>
                                    <div className={styles.tabbyBrand}>
                                        <span className={styles.tamaraWordmark}>tamara</span>
                                    </div>
                                </div>

                                {paymentMethod === 'tamara' && (
                                    <div className={styles.tabContent}>
                                        <p className={styles.tamaraNote}>{t('tamaraNote')}</p>
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

                                {user && (user.reward_points || 0) > 0 && (
                                    <div className={styles.couponSection}>
                                        {pointsToUse > 0 ? (
                                            <div className={styles.appliedCouponBox}>
                                                <div className={styles.appliedCouponInfo}>
                                                    <span className={styles.couponCodeTag}>
                                                        {pointsToUse.toFixed(0)} {t('ptShort')}
                                                    </span>
                                                    <span className={styles.couponSuccessText}>{t('pointsApplied')}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { removePoints(); setPointsInput(''); }}
                                                    className={styles.removeCouponBtn}
                                                >
                                                    {common('delete')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={styles.couponWrapper}>
                                                <button
                                                    type="button"
                                                    className={styles.viewCouponsBtn}
                                                    onClick={() => setShowPointsBox(v => !v)}
                                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                                >
                                                    <span>{t('applyPointsForDiscount')}</span>
                                                    <ChevronDown size={16} className={showPointsBox ? styles.codeChevronOpen : ''} />
                                                </button>
                                                {showPointsBox && (
                                                <>
                                                <div style={{ fontSize: 13, color: '#64748b', margin: '10px 0 8px' }}>
                                                    {t('availablePoints')}: {(user.reward_points || 0).toLocaleString()} {t('ptShort')}
                                                </div>
                                                <div className={styles.couponForm}>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={user.reward_points || 0}
                                                        value={pointsInput}
                                                        onChange={(e) => setPointsInput(e.target.value === '' ? '' : Math.max(0, Math.min(Number(e.target.value), user.reward_points || 0)))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const p = Number(pointsInput);
                                                                if (p > 0) applyPoints(p);
                                                            }
                                                        }}
                                                        placeholder={t('pointsPlaceholder')}
                                                        className={styles.couponInput}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPointsInput(user.reward_points || 0)}
                                                        className={styles.viewCouponsBtn}
                                                        style={{ padding: '0 12px', whiteSpace: 'nowrap' }}
                                                    >
                                                        {t('pointsMax')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { const p = Number(pointsInput); if (p > 0) applyPoints(p); }}
                                                        className={styles.applyCouponBtn}
                                                        disabled={!Number(pointsInput)}
                                                    >
                                                        {t('applyPoints')}
                                                    </button>
                                                </div>
                                                </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={styles.itemList}>
                                    {cartItems.map(item => (
                                        <div key={`${item.id}-${item.variant_id ?? 'base'}-${item.custom_signature ?? ''}`} className={styles.itemRow}>
                                            <img
                                                src={resolveUrl(item.image) || '/assets/mariot-logo2.webp'}
                                                alt={item.name}
                                                className={styles.itemImg}
                                                style={item.slug ? { cursor: 'pointer' } : undefined}
                                                onClick={() => item.slug && router.push(`/product/${item.slug}`)}
                                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/mariot-logo2.webp'; }}
                                            />
                                            <div className={styles.itemDetails}>
                                                <div
                                                    className={styles.itemName}
                                                    style={item.slug ? { cursor: 'pointer' } : undefined}
                                                    onClick={() => item.slug && router.push(`/product/${item.slug}`)}
                                                >
                                                    {locale === 'ar' && item.name_ar ? item.name_ar : item.name}
                                                </div>
                                                {(item.custom_dimensions && Object.keys(item.custom_dimensions).length > 0) ? (
                                                    <div style={{ fontSize: 12, color: '#64748b' }}>{formatCustomDims(item.custom_dimensions, tProd)}</div>
                                                ) : item.variant_label ? (
                                                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.variant_label}</div>
                                                ) : null}
                                                <div className={styles.itemMeta}>Qty: {item.quantity}</div>
                                            </div>
                                            <div className={styles.itemPrice}>
                                                <CurrencyPrice amount={item.price * item.quantity} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.totalsGrid}>
                                    <div className={styles.totalRow}>
                                        <span>{common('subtotal')}</span>
                                        <span><CurrencyPrice amount={subtotal} /></span>
                                    </div>

                                    {discountAmount > 0 && (
                                        <div className={`${styles.totalRow} ${styles.discount}`}>
                                            <span>{t('couponDiscount')}</span>
                                            <span>- <CurrencyPrice amount={discountAmount} /></span>
                                        </div>
                                    )}

                                    {pointsDiscountAmount > 0 && (
                                        <div className={`${styles.totalRow} ${styles.discount}`}>
                                            <span>{t('pointsRedeemed')}</span>
                                            <span>- <CurrencyPrice amount={pointsDiscountAmount} /></span>
                                        </div>
                                    )}

                                    <div className={styles.totalRow}>
                                        <span>{common('shipping')}</span>
                                        <span className={styles.freeText}>{common('free')}</span>
                                    </div>

                                    <div className={styles.totalRow}>
                                        <span>{common('taxableAmount')} (Excl. VAT)</span>
                                        <span><CurrencyPrice amount={cartTotal} /></span>
                                    </div>

                                    <div className={styles.totalRow}>
                                        <span>{common('vat')} (5%)</span>
                                        <span><CurrencyPrice amount={vatAmount} /></span>
                                    </div>

                                    <div className={styles.totalRow}>
                                        <span>{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery charge'}</span>
                                        {deliveryTotal > 0
                                            ? <span><CurrencyPrice amount={deliveryTotal} /></span>
                                            : <span style={{ color: '#16a34a', fontWeight: 700 }}>{locale === 'ar' ? 'مجاني' : 'FREE'}</span>}
                                    </div>

                                    {settlementFee > 0 && (
                                        <div className={styles.totalRow}>
                                            <span>{common('settlementFee')}</span>
                                            <span><CurrencyPrice amount={settlementFee} /></span>
                                        </div>
                                    )}

                                    <div className={styles.grandTotalRow}>
                                        <span>{common('total')}</span>
                                        <span><CurrencyPrice amount={finalTotal} /></span>
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

                                {!isProcessing && cartItems.length > 0 && ((SHIPPING_QUOTES_ENABLED && !selectedShipping) || !paymentMethod) && (
                                    <p className={styles.checkoutBlockedHint}>
                                        {SHIPPING_QUOTES_ENABLED && !selectedShipping && !paymentMethod
                                            ? t('selectShippingAndPayment')
                                            : SHIPPING_QUOTES_ENABLED && !selectedShipping
                                                ? t('selectShippingFirst')
                                                : t('selectPaymentFirst')}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className={styles.checkoutBtn}
                                    disabled={isProcessing || cartItems.length === 0 || (SHIPPING_QUOTES_ENABLED && !selectedShipping) || !paymentMethod}
                                >
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

            <AddressBookSheet
                open={addressSheetOpen}
                onClose={() => setAddressSheetOpen(false)}
                user={user}
                selectedAddressId={selectedAddressId}
                onAddressesChange={handleAddressesChange}
                onSelect={(addr) => {
                    handleAddressOptionClick(addr);
                    setAddressSheetOpen(false);
                }}
            />

            <Footer />
            <FloatingActions />

            <OtpVerifyModal
                open={otpOpen}
                onClose={() => setOtpOpen(false)}
                onVerified={async () => {
                    await refreshUser();
                    setOtpOpen(false);
                    showNotification(otpT('checkoutSuccess'), 'success');
                }}
                phoneNumber={user?.phone_number}
                title={otpT('checkoutTitle')}
                description={otpT('checkoutDesc')}
            />

            {/* Card manager, reachable from the payment section so a shopper can
                add, edit or remove a card without abandoning a filled-in order. */}
            <CardManagerModal
                open={cardManagerOpen}
                onClose={() => setCardManagerOpen(false)}
                // With nothing saved yet the list screen is an empty box with one
                // button on it, so go straight to the form the shopper came for.
                initialView={savedCards.length === 0 ? 'add' : 'list'}
                isRtl={locale === 'ar'}
                labels={cardLabels}
                onChange={(cards) => {
                    setSavedCards(cards);
                    // A card removed while it was the chosen one must not stay selected,
                    // or checkout would post a pm_ that no longer exists.
                    setSelectedCardId((current) => {
                        if (current && cards.some(c => c.id === current && !c.is_expired)) return current;
                        const fallback = cards.find(c => c.is_default && !c.is_expired) || cards.find(c => !c.is_expired);
                        return fallback ? fallback.id : null;
                    });
                }}
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
