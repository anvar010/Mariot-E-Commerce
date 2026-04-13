'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './Auth.module.css';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_BASE_URL } from '@/config';

const ForgotPasswordForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('auth');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                setSubmitted(true);
            } else {
                setError(data.message || t('somethingWentWrong'));
            }
        } catch (err) {
            setError(t('failedConnectServer'));
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className={styles.authPage}>
                <div className={styles.formSection}>
                    <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <CheckCircle size={64} color="#10b981" />
                        </div>
                        <h1 className={styles.authTitle}>{t('resetSuccessTitle')}</h1>
                        <p className={styles.authSubtitle}>
                            {t('resetSuccessMessage', { email })}
                        </p>
                        <Link href="/signin" className={styles.submitBtn} style={{ marginTop: '20px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {t('backToSignIn')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.authPage}>
            <div className={styles.formSection}>
                <div className={styles.authContainer}>
                    <h1 className={styles.authTitle}>{t('forgotPasswordTitle')}</h1>
                    <p className={styles.authSubtitle}>{t('forgotPasswordSubtitle')}</p>

                    {error && (
                        <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('emailLabel')}</label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={18} />
                                <input
                                    type="email"
                                    className={styles.inputField}
                                    placeholder={t('emailPlaceholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? t('sending') : t('resetButton')}
                        </button>
                    </form>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <Link href="/signin" className={styles.link} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <ArrowLeft size={16} />
                            {t('backToSignIn')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordForm;
