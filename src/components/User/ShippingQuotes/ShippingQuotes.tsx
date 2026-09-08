'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Truck, Check, X, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import Loader from '@/components/shared/Loader/Loader';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import styles from './ShippingQuotes.module.css';

/**
 * The customer's side of a shipping quote: see what delivery will cost, then accept or
 * decline it.
 *
 * Accepting does not pay. It marks the quote agreed, which is what allows the order to be
 * created when payment completes -- so the price a shopper agreed to is the price charged.
 */

interface QuoteItem {
    id: number;
    name: string;
    model: string | null;
    image: string | null;
    quantity: number;
    price_at_request: string | number;
    product_removed: number;
}

interface Quote {
    id: number;
    reference: string;
    status: 'pending' | 'quoted' | 'accepted' | 'declined' | 'expired' | 'ordered';
    country: string;
    state: string | null;
    city: string | null;
    address_line1: string | null;
    subtotal: string | number;
    vat_amount: string | number;
    delivery_charge: string | number | null;
    quoted_total: string | number | null;
    admin_note: string | null;
    item_count?: number;
    items?: QuoteItem[];
    created_at: string;
    expires_at: string | null;
    expired?: boolean;
}

const resolveImage = (path: string | null): string => {
    if (!path) return '/assets/placeholder.png';
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

interface Props {
    /** Quote id from ?quote= on the email deep link, opened on arrival. */
    focusId?: string | null;
}

const ShippingQuotes: React.FC<Props> = ({ focusId }) => {
    const t = useTranslations('shippingQuotes');
    const locale = useLocale();
    // Arabic readers get Arabic numerals and month names, as everywhere else on the site.
    const dateLocale = locale === 'ar' ? 'ar-AE' : 'en-GB';
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<number | null>(null);
    const [detail, setDetail] = useState<Quote | null>(null);
    const [acting, setActing] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/shipping-quotes/my`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) setQuotes(data.data || []);
        } catch (err) {
            console.error('Failed to load shipping quotes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openQuote = async (id: number) => {
        setOpenId(id);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/shipping-quotes/${id}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) setDetail(data.data);
        } catch (err) {
            console.error('Failed to load quote', err);
        }
    };

    // Deep link from the "your quote is ready" email.
    useEffect(() => {
        if (focusId) openQuote(Number(focusId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusId]);

    const respond = async (accept: boolean) => {
        if (!detail) return;
        setActing(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/shipping-quotes/${detail.id}/respond`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ accept }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.message || t('actionFailed'));
                return;
            }
            setDetail(d => (d ? { ...d, ...data.data } : d));
            load();
        } catch {
            setError(t('actionFailed'));
        } finally {
            setActing(false);
        }
    };

    const statusLabel = (q: Quote) => {
        if (q.status === 'quoted' && q.expired) return t('status.expired');
        return t(`status.${q.status}`);
    };

    if (loading) return <div className={styles.loaderWrap}><Loader /></div>;

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('title')}</h2>
                <span className={styles.count}>{quotes.length}</span>
            </div>

            {quotes.length === 0 ? (
                <div className={styles.empty}>
                    <Truck size={56} strokeWidth={1} />
                    <h3>{t('empty')}</h3>
                    <p>{t('emptyHint')}</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {quotes.map(q => (
                        <div key={q.id} className={styles.card}>
                            <div className={styles.cardMain}>
                                <div className={styles.iconWrap}><Truck size={22} /></div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.ref}>{q.reference}</span>
                                    <span className={styles.meta}>
                                        {[q.city, q.country].filter(Boolean).join(', ')} · {q.item_count ?? q.items?.length ?? 0} {t('items')}
                                    </span>
                                    <span className={styles.meta}>
                                        {new Date(q.created_at).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.cardRight}>
                                <span className={`${styles.status} ${styles[q.status]}`}>{statusLabel(q)}</span>
                                {q.quoted_total != null && (
                                    <span className={styles.total}><CurrencyPrice amount={Number(q.quoted_total) || 0} /></span>
                                )}
                                <button className={styles.viewBtn} onClick={() => openQuote(q.id)}>
                                    {q.status === 'quoted' && !q.expired ? t('reviewAndAccept') : t('view')}
                                </button>
                                {/* An accepted quote is waiting on payment and nothing else,
                                    so the way to pay belongs on the row itself. */}
                                {q.status === 'accepted' && (
                                    <Link href={`/checkout?quote=${q.id}`} className={styles.payBtnSmall}>
                                        <CreditCard size={15} /> {t('payNow')}
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {openId !== null && detail && (
                <div className={styles.overlay} onClick={() => { setOpenId(null); setDetail(null); }}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHead}>
                            <div>
                                <h3>{detail.reference}</h3>
                                <span className={`${styles.status} ${styles[detail.status]}`}>{statusLabel(detail)}</span>
                            </div>
                            <button
                                className={styles.closeBtn}
                                onClick={() => { setOpenId(null); setDetail(null); }}
                                aria-label={t('close')}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.items}>
                                {(detail.items || []).map(item => (
                                    <div key={item.id} className={styles.item}>
                                        <img src={resolveImage(item.image)} alt="" />
                                        <div>
                                            <span className={styles.itemName}>{item.name}</span>
                                            {Number(item.product_removed) === 1 && (
                                                <span className={styles.removed}>
                                                    <AlertTriangle size={12} /> {t('productRemoved')}
                                                </span>
                                            )}
                                            <span className={styles.meta}>×{item.quantity}</span>
                                        </div>
                                        <span className={styles.itemPrice}><CurrencyPrice amount={Number(item.price_at_request) || 0} /></span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.totals}>
                                <div><span>{t('goods')}</span><span><CurrencyPrice amount={Number(detail.subtotal) || 0} /></span></div>
                                <div><span>{t('vat')}</span><span><CurrencyPrice amount={Number(detail.vat_amount) || 0} /></span></div>
                                <div>
                                    <span>
                                        {t('delivery')}
                                        {/* Says what the figure already covers, so nobody is
                                            expecting a customs bill on the doorstep. */}
                                        <em className={styles.deliveryNote}>{t('deliveryIncludes')}</em>
                                    </span>
                                    <span>
                                        {detail.delivery_charge != null
                                            ? <CurrencyPrice amount={Number(detail.delivery_charge) || 0} />
                                            : <em className={styles.awaiting}>{t('awaitingPrice')}</em>}
                                    </span>
                                </div>
                                {detail.quoted_total != null && (
                                    <div className={styles.grand}>
                                        <span>{t('total')}</span><span><CurrencyPrice amount={Number(detail.quoted_total) || 0} /></span>
                                    </div>
                                )}
                            </div>

                            {detail.admin_note && <p className={styles.note}>{detail.admin_note}</p>}

                            {detail.status === 'pending' && (
                                <p className={styles.pendingMsg}>
                                    <Clock size={15} /> {t('pendingMessage')}
                                </p>
                            )}

                            {detail.status === 'quoted' && detail.expires_at && !detail.expired && (
                                <p className={styles.expiryMsg}>
                                    {t('holdsUntil', { date: new Date(detail.expires_at).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }) })}
                                </p>
                            )}

                            {detail.expired && detail.status === 'quoted' && (
                                <p className={styles.expiredMsg}>{t('expiredMessage')}</p>
                            )}

                            {error && <p className={styles.error}>{error}</p>}

                            {/* Only a live, priced quote can be answered. */}
                            {detail.status === 'quoted' && !detail.expired && (
                                <div className={styles.actions}>
                                    <button
                                        className={styles.declineBtn}
                                        onClick={() => respond(false)}
                                        disabled={acting}
                                    >
                                        <X size={16} /> {t('decline')}
                                    </button>
                                    <button
                                        className={styles.acceptBtn}
                                        onClick={() => respond(true)}
                                        disabled={acting}
                                    >
                                        <Check size={16} /> {acting ? t('working') : t('accept')}
                                    </button>
                                </div>
                            )}

                            {detail.status === 'accepted' && (
                                <>
                                    <p className={styles.acceptedMsg}>{t('acceptedMessage')}</p>
                                    {/* Pays from the quote's own snapshot, not the basket --
                                        the cart may have moved on since it was accepted. */}
                                    <Link
                                        href={`/checkout?quote=${detail.id}`}
                                        className={styles.payBtn}
                                    >
                                        <CreditCard size={17} /> {t('proceedToCheckout')}
                                    </Link>
                                </>
                            )}

                            {detail.status === 'ordered' && (
                                <p className={styles.acceptedMsg}>{t('orderedMessage')}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingQuotes;
