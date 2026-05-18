'use client';

import React from 'react';
import { Home, List, User, ShoppingCart, BadgePercent } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useCart } from '@/context/CartContext';
import styles from './MobileBottomNav.module.css';

const MobileBottomNav = () => {
    const pathname = usePathname();
    const { cartCount } = useCart();
    const locale = useLocale();
    const isRtl = locale === 'ar';

    const openCart = () => {
        window.dispatchEvent(new CustomEvent('OPEN_CART_DRAWER'));
    };

    const isActive = (path: string) => pathname === path;

    return (
        <div className={styles.bottomNav}>
            <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                <Home size={30} />
                <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
            </Link>

            <Link href="/all-categories" className={`${styles.navItem} ${isActive('/all-categories') ? styles.active : ''}`}>
                <List size={24} />
                <span>{isRtl ? 'الفئات' : 'Categories'}</span>
            </Link>

            <Link href="/today-offers" className={`${styles.navItem} ${isActive('/today-offers') ? styles.active : ''}`}>
                <BadgePercent size={24} />
                <span>{isRtl ? 'عروض' : 'Deals'}</span>
            </Link>

            <Link href="/profile" className={`${styles.navItem} ${isActive('/profile') ? styles.active : ''}`}>
                <User size={24} />
                <span>{isRtl ? 'حسابي' : 'Account'}</span>
            </Link>

            <button onClick={openCart} className={styles.navItem}>
                <div className={styles.cartWrapper}>
                    <ShoppingCart size={24} />
                    {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
                </div>
                <span>{isRtl ? 'السلة' : 'Cart'}</span>
            </button>
        </div>
    );
};

export default MobileBottomNav;
