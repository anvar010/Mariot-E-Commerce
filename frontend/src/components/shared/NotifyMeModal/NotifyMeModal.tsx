'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, BellRing, Check } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';
import styles from './NotifyMeModal.module.css';

interface Props {
    open: boolean;
    onClose: () => void;
    productId: number | string;
    productName: string;
    /** Optional label like "Red / Large" — present only for variant products */
    variantLabel?: string;
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const NotifyMeModal: React.FC<Props> = ({ open, onClose, productId, productName, variantLabel }) => {
    const { user } = useAuth();
    const locale = useLocale();
    const isArabic = locale === 'ar';

    const [email, setEmail] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setEmail(user?.email || '');
        setDone(false);
        setError(null);
        // Focus the email field after the modal animates in
        setTimeout(() => inputRef.current?.focus(), 80);
    }, [open, user?.email]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEmail(email)) {
            setError(isArabic ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address.');
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/products/${productId}/notify-me`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), variantLabel: variantLabel || '' })
            });
            const data = await res.json();
            if (data.success) {
                setDone(true);
            } else {
                setError(data.message || 'Could not save your subscription.');
            }
        } catch {
            setError(isArabic ? 'تعذر الحفظ. حاول مرة أخرى.' : 'Could not save your subscription. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
            <div
                className={styles.card}
                onClick={(e) => e.stopPropagation()}
                style={{ direction: isArabic ? 'rtl' : 'ltr', textAlign: isArabic ? 'right' : 'left' }}
            >
                <button className={styles.close} onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                {done ? (
                    <div className={styles.successWrap}>
                        <div className={styles.successCircle}>
                            <Check size={32} strokeWidth={3} />
                        </div>
                        <h2 className={styles.title}>
                            {isArabic ? 'تم تسجيلك!' : "You're on the list!"}
                        </h2>
                        <p className={styles.body}>
                            {isArabic
                                ? 'سنرسل لك بريدًا إلكترونيًا عند توفر المنتج مرة أخرى.'
                                : "We'll email you the moment this product is back in stock."}
                        </p>
                        <button className={styles.primaryBtn} onClick={onClose}>
                            {isArabic ? 'تم' : 'Done'}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.formWrap}>
                        <div className={styles.iconCircle}>
                            <BellRing size={26} />
                        </div>
                        <h2 className={styles.title}>
                            {isArabic ? 'أعلمني عند التوفر' : 'Notify me when available'}
                        </h2>
                        <p className={styles.body}>
                            {variantLabel
                                ? (isArabic
                                    ? `سنراقب "${productName}" بالخيار المحدد ونرسل بريدًا واحدًا فور إعادة التخزين.`
                                    : `We'll watch ${productName} in the selected option and send a single email the moment it's back in stock.`)
                                : (isArabic
                                    ? `نضع ${productName} في قائمة المراقبة الخاصة بك. سنرسل لك بريدًا إلكترونيًا واحدًا فور إعادة التخزين.`
                                    : `We'll watch ${productName} for you and send a single email the moment it's back in stock.`)}
                        </p>
                        {variantLabel && (
                            <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                letterSpacing: '0.4px',
                                textTransform: 'uppercase',
                                marginBottom: '14px'
                            }}>
                                {variantLabel}
                            </span>
                        )}

                        <label className={styles.label}>
                            <span>{isArabic ? 'البريد الإلكتروني' : 'Email address'}</span>
                            <input
                                ref={inputRef}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                disabled={submitting}
                                required
                            />
                        </label>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                            {submitting
                                ? (isArabic ? 'جاري الحفظ…' : 'Saving…')
                                : (isArabic ? 'أعلمني' : 'Notify Me')}
                        </button>

                        <p className={styles.fineprint}>
                            {isArabic
                                ? 'نرسل بريدًا إلكترونيًا واحدًا فقط — لا رسائل ترويجية.'
                                : "One-time email — no marketing, no spam."}
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default NotifyMeModal;
