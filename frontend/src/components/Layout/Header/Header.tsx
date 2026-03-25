'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, ShoppingCart, User, Coins, Menu, Globe, Phone, MessageCircle, HelpCircle, ChevronDown, X, Shield, Heart, Trophy, LogOut } from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import CategoriesLayout from '@/components/Categories/CategoriesLayout';

import { API_BASE_URL } from '@/config';

const Header = () => {

    const { user, loading, logout } = useAuth();
    const { cartCount, setIsDrawerOpen } = useCart();
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('header');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const [isCategoriesHovered, setIsCategoriesHovered] = useState(false);
    const [showRewardToast, setShowRewardToast] = useState(false);
    const [announcement, setAnnouncement] = useState<any>(null);

    const isArabic = locale === 'ar';

    useEffect(() => {
        const fetchCMS = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/cms/homepage`);
                const data = await res.json();
                if (data.success && data.data.announcement) {
                    setAnnouncement(data.data.announcement);
                }
            } catch (err) {
                console.error("Header CMS fetch failed", err);
            }
        };
        const timeoutId = setTimeout(fetchCMS, 1000);
        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        if (user?.reward_points === 1000) {
            const hasShown = sessionStorage.getItem('reward_toast_shown');
            if (!hasShown) {
                setShowRewardToast(true);
            }
        }
    }, [user]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.trim().length < 2) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`${API_BASE_URL}/products/suggestions?search=${encodeURIComponent(searchQuery.trim())}`);
                const data = await res.json();
                if (data.success) {
                    setSuggestions(data.data);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error("Suggestions fetch failed", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(`.${styles.searchSection}`)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setIsSticky(window.scrollY > 150);
                    ticking = false;
                });
                ticking = true;
            }
        };

        const handleOpenCart = () => setIsDrawerOpen(true);

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('OPEN_CART_DRAWER', handleOpenCart);

        // Initial check without animation frame
        setIsSticky(window.scrollY > 150);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('OPEN_CART_DRAWER', handleOpenCart);
        };
    }, [setIsDrawerOpen]);

    const toggleLang = () => setIsLangOpen(!isLangOpen);
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const switchLocale = (newLocale: 'en' | 'ar') => {
        setIsLangOpen(false);
        // The locale-aware router handles locale prefixing automatically
        const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';
        router.push(pathWithoutLocale, { locale: newLocale });
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed) {
            router.push(`/shop?search=${encodeURIComponent(trimmed)}`);
            setIsMenuOpen(false);
        }
    };

    // With locale-aware usePathname, pathname already excludes locale prefix
    const cleanPath = pathname || '/';
    const isCategoriesPage = cleanPath === '/all-categories';

    return (
        <>
            <header className={`${styles.header} ${isSticky ? styles.sticky : ''}`}>
                <div className={styles.topBanner}>
                    <div className={styles.container}>
                        <div className={styles.topBannerLeft} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {announcement?.is_active ? announcement.text : t('topBanner')}
                            <Image
                                src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg"
                                alt="UAE"
                                width={18}
                                height={12}
                                style={{ height: '12px', width: 'auto' }}
                            />
                        </div>
                        <div className={`${styles.topBannerRight} ${styles.desktopOnly}`}>
                            <Globe size={14} className={styles.globeIcon} />
                            {t('delivery')}
                        </div>
                    </div>
                </div>

                {/* Main Header */}
                <div className={styles.mainHeader}>
                    <div className={styles.container}>
                        <div className={styles.logoSection}>
                            <Link href="/" className={styles.logo}>
                                <div className={styles.logoWithIcon}>
                                    <Image
                                        src="/assets/mariot-icon.webp"
                                        alt="Mariot Icon"
                                        width={40}
                                        height={40}
                                        className={styles.miniIcon}
                                    />
                                    <div className={styles.logoText}>
                                        <Image
                                            src="/assets/mariot-logo.webp"
                                            alt="Mariot Logo"
                                            width={150}
                                            height={40}
                                            className={styles.logoImage}
                                            priority
                                        />
                                    </div>
                                </div>
                            </Link>
                        </div>

                        <div className={styles.searchSection}>
                            <form className={styles.searchBar} onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    placeholder={t('searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                                />
                                <button type="submit" className={styles.searchButton}>
                                    <Search size={20} />
                                    <span>{t('search')}</span>
                                </button>
                            </form>

                            {showSuggestions && (
                                <div className={styles.suggestionsDropdown}>
                                    {isSearching ? (
                                        <div className={styles.suggestionsList}>
                                            {[1, 2, 3].map((item) => (
                                                <div key={item} className={styles.skeletonItem}>
                                                    <div className={styles.skeletonImage}>
                                                        <div className={styles.shimmer}></div>
                                                    </div>
                                                    <div className={styles.skeletonInfo}>
                                                        <div className={styles.skeletonName}>
                                                            <div className={styles.shimmer}></div>
                                                        </div>
                                                        <div className={styles.skeletonPrice}>
                                                            <div className={styles.shimmer}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <div className={styles.suggestionsList}>
                                            {suggestions.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={styles.suggestionItem}
                                                    onClick={() => {
                                                        router.push(`/product/${item.slug}`);
                                                        setShowSuggestions(false);
                                                        setSearchQuery('');
                                                    }}
                                                >
                                                    <div className={styles.suggestionImageWrapper}>
                                                        <Image
                                                            src={item.primary_image || '/assets/placeholder-image.webp'}
                                                            alt={item.name}
                                                            width={45}
                                                            height={45}
                                                            className={styles.suggestionImage}
                                                        />
                                                    </div>
                                                    <div className={styles.suggestionInfo}>
                                                        <span className={styles.suggestionName}>{item.name}</span>
                                                        <div className={styles.suggestionMeta}>
                                                            <span className={styles.suggestionPrice}>
                                                                AED {Number(item.offer_price || item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                            {item.category_name && (
                                                                <span className={styles.suggestionCategory}>{item.category_name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : searchQuery.trim().length >= 2 && (
                                        <div className={styles.noSuggestions}>
                                            {t('noResultsFound')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.userActions}>
                            <div className={`${styles.rewardPoints} ${styles.desktopOnly}`}>
                                <Coins size={24} className={styles.pointIcon} />
                                <div className={styles.actionText}>
                                    <span className={styles.label}>{t('rewardPoints')}</span>
                                    <span className={styles.value}>{user?.reward_points || 0}</span>
                                </div>
                                {showRewardToast && (
                                    <div className={styles.rewardToast}>
                                        <div className={styles.rewardToastContent}>
                                            <Trophy size={16} className={styles.trophyIcon} />
                                            <span>{t('congratsPoints')}</span>
                                            <X size={14} className={styles.closeToast} onClick={(e) => {
                                                e.stopPropagation();
                                                setShowRewardToast(false);
                                                sessionStorage.setItem('reward_toast_shown', 'true');
                                            }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Link href={user ? "/profile" : "/signin"} className={styles.profile}>
                                <User size={28} className={styles.userIcon} />
                                <div className={styles.actionText}>
                                    <span className={styles.label}>{t('account')}</span>
                                    <span className={styles.userName}>
                                        {loading ? (
                                            <span className={styles.loadingDots}>...</span>
                                        ) : user ? (
                                            t('hello', { name: user.name?.split(' ')[0] || 'User' })
                                        ) : (
                                            t('signIn')
                                        )}
                                    </span>
                                </div>
                            </Link>

                            {user?.role === 'admin' && (
                                <Link href="/admin">
                                    <div className={styles.adminIconWrapper}>
                                        <Shield size={28} color="#4c6ef5" />
                                        <span className={styles.adminLabel}>{t('admin')}</span>
                                    </div>
                                </Link>
                            )}

                            <div className={styles.cart} onClick={() => setIsDrawerOpen(true)}>
                                <div className={styles.cartIconWrapper}>
                                    <ShoppingCart size={28} />
                                    <span className={styles.cartBadge}>{cartCount}</span>
                                </div>
                            </div>

                            <button className={styles.mobileMenuBtn} onClick={toggleMenu}>
                                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMenuOpen && (
                    <div className={styles.overlay} onClick={() => setIsMenuOpen(false)} />
                )}

                {/* Navigation Bar */}
                <nav className={`${styles.navBar} ${isMenuOpen ? styles.navOpen : ''}`}>
                    <div className={styles.container}>
                        {/* Mobile Menu Header */}
                        <div className={styles.mobileMenuHeader}>
                            <span className={styles.mobileMenuTitle}>{t('menu')}</span>
                            <button className={styles.mobileCloseBtn} onClick={() => setIsMenuOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div
                            className={styles.categoriesWrapper}
                            onMouseEnter={() => setIsCategoriesHovered(true)}
                            onMouseLeave={() => setIsCategoriesHovered(false)}
                        >
                            <Link
                                href="/all-categories"
                                className={`${styles.categories} ${isCategoriesPage ? styles.categoriesActive : ''}`}
                            >
                                <Menu size={24} className={styles.desktopOnly} />
                                <span>{t('allCategories')}</span>
                            </Link>

                            {isCategoriesHovered && (
                                <div className={styles.megaMenu}>
                                    <CategoriesLayout
                                        isPopup={true}
                                        onClose={() => setIsCategoriesHovered(false)}
                                    />
                                </div>
                            )}
                        </div>

                        <ul className={styles.navLinks}>
                            <li>
                                <Link
                                    href="/today-offers"
                                    className={`${styles.hot} ${cleanPath === '/today-offers' ? styles.linkActive : ''}`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    🔥 {t('todayOffers')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/shop-by-brands"
                                    className={cleanPath === '/shop-by-brands' ? styles.linkActive : ''}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('shopByBrand')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/category/kitchen-equipment"
                                    className={cleanPath === '/category/kitchen-equipment' ? styles.linkActive : ''}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('kitchenEquipments')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/category/coffee-makers"
                                    className={cleanPath === '/category/coffee-makers' ? styles.linkActive : ''}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('coffeeMakers')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/category/fryers"
                                    className={cleanPath === '/category/fryers' ? styles.linkActive : ''}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('fryers')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/category/laundry"
                                    className={cleanPath === '/category/laundry' ? styles.linkActive : ''}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('laundry')}
                                </Link>
                            </li>
                            <li className={styles.mobileOnly}><Link href="/profile" onClick={() => setIsMenuOpen(false)}>{t('myAccount')}</Link></li>
                            <li className={styles.mobileOnly}><Link href="/rewards" onClick={() => setIsMenuOpen(false)}>{t('rewardPointsNav')}</Link></li>
                            {user?.role === 'admin' && (
                                <li className={styles.mobileOnly}><Link href="/admin" onClick={() => setIsMenuOpen(false)}>{t('adminDashboard')}</Link></li>
                            )}
                            {user && (
                                <li className={styles.mobileOnly}>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsMenuOpen(false);
                                        }}
                                        className={styles.mobileSignOutBtn}
                                    >
                                        <LogOut size={20} />
                                        <span>{t('signOut')}</span>
                                    </button>
                                </li>
                            )}
                        </ul>

                        <div className={styles.langSelectorContainer}>
                            <button className={styles.langSelector} onClick={toggleLang}>
                                <img
                                    src={isArabic
                                        ? "https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg"
                                        : "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg"}
                                    alt={isArabic ? 'AR' : 'EN'}
                                    className={styles.flagImg}
                                />
                                <span className={styles.langCode}>{isArabic ? 'AR' : 'EN'}</span>
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={isLangOpen ? styles.rotate : ''}
                                >
                                    <path d="M7 10L12 15L17 10H7Z" />
                                </svg>
                            </button>

                            {isLangOpen && (
                                <div className={styles.langDropdown}>
                                    <div className={styles.langDropdownLabel}>{t('language')}</div>
                                    <div
                                        className={`${styles.langOption} ${!isArabic ? styles.langOptionActive : ''}`}
                                        onClick={() => switchLocale('en')}
                                    >
                                        <img src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg" alt="US" className={styles.langOptionFlag} />
                                        <div className={styles.langOptionText}>
                                            <span className={styles.langOptionName}>English</span>
                                            <span className={styles.langOptionNative}>EN</span>
                                        </div>
                                        {!isArabic && (
                                            <svg className={styles.langCheck} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        )}
                                    </div>
                                    <div
                                        className={`${styles.langOption} ${isArabic ? styles.langOptionActive : ''}`}
                                        onClick={() => switchLocale('ar')}
                                    >
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg" alt="UAE" className={styles.langOptionFlag} />
                                        <div className={styles.langOptionText}>
                                            <span className={styles.langOptionName}>العربية</span>
                                            <span className={styles.langOptionNative}>AR</span>
                                        </div>
                                        {isArabic && (
                                            <svg className={styles.langCheck} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Support Info Bar - Desktop Only */}
                <div className={`${styles.supportBar} ${styles.desktopOnly}`}>
                    <div className={styles.container}>
                        <div className={styles.supportItem}>
                            <Phone size={16} className={styles.whatsappIcon} />
                            <a href="https://wa.me/97142882777" target="_blank" rel="noopener noreferrer">
                                {t.rich('customEquipments', {
                                    phone: (chunks) => <span dir="ltr" style={{ display: 'inline-block', direction: 'ltr', unicodeBidi: 'isolate' }}>(+971 4 288 2777)</span>
                                })}
                            </a>
                        </div>
                        <div className={styles.supportItem}>
                            <MessageCircle size={16} className={styles.supportIcon} />
                            <a href="#">{t('liveSupport')}</a>
                        </div>
                        <div className={styles.supportItem}>
                            <HelpCircle size={16} className={styles.helpIcon} />
                            <a href="#">{t('needHelp')}</a>
                        </div>
                    </div>
                </div>
            </header >
            {isSticky && <div style={{ height: '160px' }} className={styles.desktopOnly} />
            }
        </>
    );
};

export default Header;
