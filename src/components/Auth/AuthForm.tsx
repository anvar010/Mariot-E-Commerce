'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './Auth.module.css';
import { EyeOff, Eye, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { useNotification } from '@/context/NotificationContext';
import { useTranslations } from 'next-intl';

interface AuthFormProps {
    type: 'signin' | 'signup';
}

const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const { login, googleLogin, register, loading, error: authError } = useAuth();
    const { showNotification } = useNotification();
    const t = useTranslations('notifications');

    const isSignIn = type === 'signin';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        try {
            if (isSignIn) {
                await login({ email, password });
                showNotification(t('authSuccess'), 'success', { title: t('success') });
            } else {
                await register({ name, email, password });
                showNotification(t('authRegister'), 'success', { title: t('success') });
            }
        } catch (err: any) {
            const displayMsg = isSignIn ? t('authError') : (err.message || t('error'));
            setFormError(displayMsg);
            showNotification(displayMsg, 'error', { title: t('error') });
        }
    };

    const googleLoginHandler = useGoogleLogin({
        flow: 'implicit',
        prompt: 'select_account',
        onSuccess: async (tokenResponse) => {
            try {
                await googleLogin(tokenResponse.access_token);
                showNotification(t('googleSuccess'), 'success', { title: 'Google Login' });
            } catch (err: any) {
                console.error(err);
                setFormError(t('googleError'));
                showNotification(t('googleError'), 'error', { title: 'Google Login' });
            }
        },
        onError: () => {
            console.error('Login Failed');
            setFormError('Google Login Failed');
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
                        {isSignIn ? 'Welcome Back' : 'Get Started'}
                    </h1>

                    <p className={styles.authSubtitle}>
                        {isSignIn ? (
                            <>New to Mariot? <Link href="/signup" className={styles.link}>Create an account</Link></>
                        ) : (
                            <>Already have an account? <Link href="/signin" className={styles.link}>Sign in</Link></>
                        )}
                    </p>

                    {(formError || authError) && (
                        <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
                            {(formError?.toLowerCase() === 'not authorized' || authError?.toLowerCase() === 'not authorized')
                                ? t('authError')
                                : (formError || authError)}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isSignIn && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Full Name</label>
                                <div className={styles.inputWrapper}>
                                    <UserIcon className={styles.inputIcon} size={18} />
                                    <input
                                        type="text"
                                        className={styles.inputField}
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email Address</label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={18} />
                                <input
                                    type="email"
                                    className={styles.inputField}
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Password</label>
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
                                    Forgot password?
                                </Link>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? 'Processing...' : (isSignIn ? 'Sign in' : 'Create Account')}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span className={styles.dividerText}>or continue with</span>
                    </div>

                    <button className={styles.googleBtn} type="button" onClick={() => googleLoginHandler()}>
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className={styles.googleIcon}
                        />
                        <span>Sign in with Google</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthForm;
