'use client';

import React, { useEffect, useState } from 'react';
import { X, Star, MousePointerClick } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from '@/i18n/navigation';
import styles from './CompleteProfilePrompt.module.css';

const JUST_LOGGED_IN_KEY = 'mariot.justLoggedIn';

const CompleteProfilePrompt: React.FC = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
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
                <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
                    <X size={18} />
                </button>

                <div className={styles.badge}>
                    <span className={styles.badgeStar}>
                        <Star size={20} fill="#fde68a" color="#fde68a" />
                    </span>
                    <span className={styles.badgeText}>+3000 pts</span>
                    <span className={styles.cursorArt}>
                        <MousePointerClick size={28} strokeWidth={2.5} />
                    </span>
                </div>

                <p className={styles.copy}>
                    Complete your business profile and Earn{' '}
                    <span className={styles.highlight}>3000 Reward Points</span>{' '}
                    and redeem your points for discount vouchers
                </p>

                <button type="button" className={styles.cta} onClick={handleGo}>
                    Complete Your Business Profile
                </button>
            </div>
        </div>
    );
};

export default CompleteProfilePrompt;
