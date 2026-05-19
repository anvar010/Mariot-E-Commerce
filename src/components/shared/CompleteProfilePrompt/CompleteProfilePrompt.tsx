'use client';

import React, { useEffect, useState } from 'react';
import { X, Star, MousePointerClick } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from '@/i18n/navigation';
import styles from './CompleteProfilePrompt.module.css';

const POINTS = 3000;

const JUST_LOGGED_IN_KEY = 'mariot.justLoggedIn';

const CompleteProfilePrompt: React.FC = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('completeProfilePrompt');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (loading || !user) return;
        if (typeof window === 'undefined') return;

        // The prompt fires only on a fresh login event (flag set by AuthContext
        // when login / googleLogin / completeSignup succeeds). Consuming the
        // flag here means refreshes or navigations later won't re-pop it.
        if (sessionStorage.getItem(JUST_LOGGED_IN_KEY) !== '1') return;

        // Only on the home page. Check both next-intl's locale-stripped
        // pathname AND the raw browser path (covers `/`, `/en`, `/en/`, `/ar`).
        const raw = window.location.pathname;
        const isHome =
            pathname === '/' ||
            pathname === '' ||
            /^\/(en|ar)?\/?$/.test(raw);
        if (!isHome) return;

        // Profile is "complete" once the bonus has fired OR phone is verified.
        const isComplete = !!user.profile_bonus_awarded || !!user.phone_verified;
        if (isComplete) {
            sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
            return;
        }

        sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
        setOpen(true);
    }, [user, loading, pathname]);

    if (!open) return null;

    const handleGo = () => {
        setOpen(false);
        router.push('/profile?tab=profileSecurity');
    };

    return (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label={t('close')}>
                    <X size={18} />
                </button>

                <div className={styles.badge}>
                    <span className={styles.badgeStar}>
                        <Star size={20} fill="#fde68a" color="#fde68a" />
                    </span>
                    <span className={styles.badgeText}>{t('pointsBadge', { points: POINTS })}</span>
                    <span className={styles.cursorArt}>
                        <MousePointerClick size={28} strokeWidth={2.5} />
                    </span>
                </div>

                <p className={styles.copy}>
                    {t.rich('body', {
                        points: POINTS,
                        highlight: (chunks) => <span className={styles.highlight}>{chunks}</span>
                    })}
                </p>

                <button type="button" className={styles.cta} onClick={handleGo}>
                    {t('cta')}
                </button>
            </div>
        </div>
    );
};

export default CompleteProfilePrompt;
