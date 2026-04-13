'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import styles from '../Auth/Auth.module.css';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_BASE_URL } from '@/config';

const ResetPasswordForm: React.FC = () => {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('auth');

    if (!token) {
        return (
            <div className={styles.authPage}>
                <div className={styles.formSection}>
                    <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <AlertTriangle size={64} color="#ef4444" />
                        </div>
                        <h1 className={styles.authTitle}>{t('invalidTokenTitle')}</h1>
                        <p className={styles.authSubtitle}>{t('invalidTokenMessage')}</p>
                        <Link href="/forgot-password" className={styles.submitBtn} style={{ marginTop: '20px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {t('requestNewLink')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className={styles.authPage}>
                <div className={styles.formSection}>
                    <div className={styles.authContainer} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <CheckCircle size={64} color="#10b981" />
                        </div>
                        <h1 className={styles.authTitle}>{t('passwordResetSuccessTitle')}</h1>
                        <p className={styles.authSubtitle}>{t('passwordResetSuccessMessage')}</p>
                        <Link href="/signin" className={styles.submitBtn} style={{ marginTop: '20px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {t('signInNow')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError(t('passwordMinLength'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.message || t('somethingWentWrong'));
            }
        } catch (err) {
            setError(t('failedConnectServer'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.formSection}>
                <div className={styles.authContainer}>
                    <h1 className={styles.authTitle}>{t('resetPasswordTitle')}</h1>
                    <p className={styles.authSubtitle}>{t('resetPasswordSubtitle')}</p>

                    {error && (
                        <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('newPasswordLabel')}</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.inputField}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <div className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('confirmPasswordLabel')}</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className={styles.inputField}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <div className={styles.passwordToggle} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? t('resettingPassword') : t('resetPasswordButton')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordForm;
