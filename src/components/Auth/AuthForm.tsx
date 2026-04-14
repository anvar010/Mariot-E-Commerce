'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './Auth.module.css';
import { EyeOff, Eye, Mail, Lock, User as UserIcon, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { useNotification } from '@/context/NotificationContext';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

interface AuthFormProps {
    type: 'signin' | 'signup';
}

const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSuspended, setIsSuspended] = useState(false);

    const { login, googleLogin, register, loading, error: authError } = useAuth();
    const { showNotification } = useNotification();
    const t = useTranslations('notifications');
    const tAuth = useTranslations('auth');
    const searchParams = useSearchParams();

    const redirectTo = searchParams.get('redirectTo') || '/';
    const reason = searchParams.get('reason');

    const isSignIn = type === 'signin';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSuspended(false);

        try {
            if (isSignIn) {
                await login({ email, password }, redirectTo);
                showNotification(t('authSuccess'), 'success', { title: t('success') });
            } else {
                await register({ name, email, password }, redirectTo);
                showNotification(t('authRegister'), 'success', { title: t('success') });
            }
        } catch (err: any) {
            if (err.message?.includes('suspended')) {
                setIsSuspended(true);
                setFormError(tAuth('accountSuspendedDesc'));
            } else {
                const displayMsg = isSignIn ? t('authError') : (err.message || t('error'));
                setFormError(displayMsg);
                showNotification(displayMsg, 'error', { title: t('error') });
            }
        }
    };

    const googleLoginHandler = useGoogleLogin({
        flow: 'implicit',
        prompt: 'select_account',
        onSuccess: async (tokenResponse) => {
            try {
                await googleLogin(tokenResponse.access_token, redirectTo);
                showNotification(t('googleSuccess'), 'success', { title: 'Google Login' });
            } catch (err: any) {
                console.error(err);
                if (err.message?.includes('suspended')) {
                    setIsSuspended(true);
                    setFormError(tAuth('accountSuspendedDesc'));
                } else {
                    setFormError(t('googleError'));
                    showNotification(t('googleError'), 'error', { title: 'Google Login' });
                }
            }
        },
        onError: () => {
            console.error('Login Failed');
            setFormError(t('googleError'));
        }
    });

    return (
        <div className={styles.authPage}>
            {/* Aesthetic Image Section (Visible on Large Screens) */}
            {/* <div className={styles.imageSection}>
                <h2>Experience the best in Coffee & Kitchen.</h2>
                <p>Join thousands of professionals and enthusiasts who trust Mariot for their premium kitchen equipment.</p>
            </div> */}

            <div className={styles.formSection}>
                <div className={styles.authContainer}>
                    <h1 className={styles.authTitle}>
                        {isSignIn ? tAuth('welcomeBack') : tAuth('getStarted')}
                    </h1>

                    <p className={styles.authSubtitle}>
                        {isSignIn ? (
                            <>{tAuth('newToMariot')} <Link href={`/signup${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}${reason ? `${redirectTo !== '/' ? '&' : '?'}reason=${reason}` : ''}`} className={styles.link}>{tAuth('createAnAccount')}</Link></>
                        ) : (
                            <>{tAuth('alreadyHaveAccount')} <Link href={`/signin${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}${reason ? `${redirectTo !== '/' ? '&' : '?'}reason=${reason}` : ''}`} className={styles.link}>{tAuth('signIn')}</Link></>
                        )}
                    </p>

                    {reason === 'purchase' && (
                        <div style={{
                            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                            border: '1px solid #fcd34d',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                            <div style={{
                                background: '#f59e0b',
                                color: 'white',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <ShoppingCart size={20} />
                            </div>
                            <div>
                                <h4 style={{ color: '#92400e', fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0' }}>{tAuth('oneLastStep')}</h4>
                                <p style={{ color: '#b45309', fontSize: '13px', margin: 0, fontWeight: 500 }}>{tAuth('signInToPurchase')}</p>
                            </div>
                        </div>
                    )}

                    {isSuspended ? (
                        <div style={{
                            background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
                            border: '1px solid #fca5a5',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚫</div>
                            <h3 style={{ color: '#dc2626', fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>{tAuth('accountSuspended')}</h3>
                            <p style={{ color: '#7c2d12', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                                {tAuth('accountSuspendedDesc')}
                            </p>
                        </div>
                    ) : (formError || authError) && (
                        <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
                            {(formError?.toLowerCase() === 'not authorized' || authError?.toLowerCase() === 'not authorized')
                                ? t('authError')
                                : (formError || authError)}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isSignIn && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{tAuth('fullNameLabel')}</label>
                                <div className={styles.inputWrapper}>
                                    <UserIcon className={styles.inputIcon} size={18} />
                                    <input
                                        type="text"
                                        className={styles.inputField}
                                        placeholder={tAuth('fullNamePlaceholder')}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{tAuth('emailAddressLabel')}</label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={18} />
                                <input
                                    type="email"
                                    className={styles.inputField}
                                    placeholder={tAuth('emailPlaceholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{tAuth('passwordLabel')}</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.inputField}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <div className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </div>
                            </div>
                            {isSignIn && (
                                <Link href="/forgot-password" className={styles.forgotPassword}>
                                    {tAuth('forgotPassword')}
                                </Link>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? tAuth('loading') : (isSignIn ? tAuth('signIn') : tAuth('createAccount'))}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span className={styles.dividerText}>{tAuth('orContinueWith')}</span>
                    </div>

                    <button className={styles.googleBtn} type="button" onClick={() => googleLoginHandler()}>
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className={styles.googleIcon}
                        />
                        <span>{tAuth('signInWithGoogle')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthForm;
