'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import styles from './LoginPromptModal.module.css';

interface LoginPromptModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

type Tab = 'signin' | 'signup';

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ open, onClose, title, subtitle }) => {
    const t = useTranslations('auth');
    const tNotif = useTranslations('notifications');
    const pathname = usePathname();

    const { login, register, googleLogin, loading } = useAuth();
    const { showNotification } = useNotification();

    const [tab, setTab] = useState<Tab>('signin');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);

        const scrollY = window.scrollY;
        const body = document.body;
        const prev = {
            position: body.style.position,
            top: body.style.top,
            left: body.style.left,
            right: body.style.right,
            width: body.style.width,
            overflow: body.style.overflow,
        };
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            body.style.position = prev.position;
            body.style.top = prev.top;
            body.style.left = prev.left;
            body.style.right = prev.right;
            body.style.width = prev.width;
            body.style.overflow = prev.overflow;
            window.scrollTo(0, scrollY);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) {
            setTab('signin');
            setName('');
            setEmail('');
            setPassword('');
            setShowPassword(false);
            setFormError(null);
        }
    }, [open]);

    useEffect(() => {
        setFormError(null);
    }, [tab]);

    const isSignIn = tab === 'signin';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            if (isSignIn) {
                await login({ email, password }, pathname || '/');
                showNotification(tNotif('authSuccess'), 'success', { title: tNotif('success') });
            } else {
                await register({ name, email, password }, pathname || '/');
                showNotification(tNotif('authRegister'), 'success', { title: tNotif('success') });
            }
            onClose();
        } catch (err: any) {
            const msg = err?.message?.toLowerCase() === 'not authorized'
                ? tNotif('authError')
                : (err?.message || tNotif('error'));
            setFormError(msg);
        }
    };

    const googleLoginHandler = useGoogleLogin({
        flow: 'implicit',
        prompt: 'select_account',
        onSuccess: async (tokenResponse) => {
            try {
                await googleLogin(tokenResponse.access_token, pathname || '/');
                showNotification(tNotif('googleSuccess'), 'success', { title: 'Google Login' });
                onClose();
            } catch (err: any) {
                setFormError(tNotif('googleError'));
            }
        },
        onError: () => {
            setFormError(tNotif('googleError'));
        },
    });

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    role="dialog"
                    aria-modal="true"
                >
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className={styles.closeBtn}
                            onClick={onClose}
                            aria-label="Close"
                            type="button"
                        >
                            <X size={18} />
                        </button>

                        <div className={styles.hero}>
                            <motion.div
                                className={styles.marquee}
                                animate={{ x: ['0%', '-50%'] }}
                                transition={{
                                    duration: 18,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }}
                            >
                                <img src="/login_popup.png" alt="" className={styles.heroImage} draggable={false} />
                                <img src="/login_popup.png" alt="" className={styles.heroImage} draggable={false} aria-hidden="true" />
                            </motion.div>
                        </div>

                        <div className={styles.body}>
                            <h2 className={styles.title}>
                                {title ?? "Hala! Let's get started"}
                            </h2>
                            <p className={styles.subtitle}>
                                {subtitle ?? 'Sign in or create an account to save items to your wishlist.'}
                            </p>

                            <div className={styles.tabs} role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={isSignIn}
                                    className={`${styles.tab} ${isSignIn ? styles.tabActive : ''}`}
                                    onClick={() => setTab('signin')}
                                >
                                    {t('signIn')}
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={!isSignIn}
                                    className={`${styles.tab} ${!isSignIn ? styles.tabActive : ''}`}
                                    onClick={() => setTab('signup')}
                                >
                                    {t('createAccount')}
                                </button>
                            </div>

                            {formError && (
                                <div className={styles.errorBox}>{formError}</div>
                            )}

                            <form onSubmit={handleSubmit} className={styles.form}>
                                {!isSignIn && (
                                    <div className={styles.inputWrapper}>
                                        <UserIcon size={16} className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder={t('fullNamePlaceholder')}
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            autoComplete="name"
                                        />
                                    </div>
                                )}

                                <div className={styles.inputWrapper}>
                                    <Mail size={16} className={styles.inputIcon} />
                                    <input
                                        type="email"
                                        className={styles.input}
                                        placeholder={t('emailPlaceholder')}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>

                                <div className={styles.inputWrapper}>
                                    <Lock size={16} className={styles.inputIcon} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={styles.input}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete={isSignIn ? 'current-password' : 'new-password'}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword(s => !s)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                </div>

                                {isSignIn && (
                                    <div className={styles.formMeta}>
                                        <Link
                                            href="/forgot-password"
                                            className={styles.forgotLink}
                                            onClick={onClose}
                                        >
                                            {t('forgotPassword')}
                                        </Link>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={loading}
                                >
                                    {loading ? tNotif('loading') : (isSignIn ? t('signIn') : t('createAccount'))}
                                </button>
                            </form>

                            <div className={styles.divider}>
                                <span>{t('orContinueWith')}</span>
                            </div>

                            <button
                                type="button"
                                className={styles.googleBtn}
                                onClick={() => googleLoginHandler()}
                            >
                                <img
                                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                    alt="Google"
                                />
                                <span>{t('signInWithGoogle')}</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoginPromptModal;
