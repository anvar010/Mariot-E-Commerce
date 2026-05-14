'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, ShoppingCart, User, Coins, Menu, Globe, Phone, MessageCircle, HelpCircle, ChevronDown, ChevronRight, X, Shield, Heart, Trophy, LogOut, Flame, Utensils, Hammer, Shirt, Tag, Gift, Settings, BadgeCheck, UserPlus, Wallet } from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import dynamic from 'next/dynamic';
const CategoriesLayout = dynamic(() => import('@/components/Categories/CategoriesLayout'), { ssr: false });

import { API_BASE_URL } from '@/config';
import SearchDropdown, { SearchDropdownData } from './SearchDropdown';

const Header = () => {

    const { user, logout } = useAuth();
    const { cartCount, setIsDrawerOpen } = useCart();
    const headerRef = React.useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(160);
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('header');
    const tc = useTranslations('categories');
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownData, setDropdownData] = useState<SearchDropdownData>({
        products: [], categories: [], brands: [], trending: []
    });
    const [isSearching, setIsSearching] = useState(false);
    const [parentCategoryIds, setParentCategoryIds] = useState<Set<number>>(new Set());
    const [categorySlugToId, setCategorySlugToId] = useState<Record<string, number>>({});
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const [isCategoriesHovered, setIsCategoriesHovered] = useState(false);
    const [showRewardToast, setShowRewardToast] = useState(false);
    const [announcement, setAnnouncement] = useState<any>(null);

    const isArabic = locale === 'ar';

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/categories`);
                const data = await res.json();
                if (cancelled || !data?.success || !Array.isArray(data.data)) return;
                const parents = new Set<number>();
                const slugMap: Record<string, number> = {};
                for (const c of data.data) {
                    if (c?.parent_id) parents.add(Number(c.parent_id));
                    if (c?.slug && c?.id != null) slugMap[String(c.slug)] = Number(c.id);
                }
                setParentCategoryIds(parents);
                setCategorySlugToId(slugMap);
            } catch (err) {
                if (!cancelled) console.error('Header categories fetch failed', err);
            }
        })();
        return () => { cancelled = true; };
    }, []);

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
        // Announcement is not critical — defer until browser is idle
        let handle: number;
        if ('requestIdleCallback' in window) {
            handle = (window as any).requestIdleCallback(fetchCMS, { timeout: 5000 });
        } else {
            handle = setTimeout(fetchCMS, 3000) as unknown as number;
        }
        return () => {
            if ('requestIdleCallback' in window) (window as any).cancelIdleCallback(handle);
            else clearTimeout(handle);
        };
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
        let cancelled = false;

        const fetchTrendingFallback = async () => {
            const tryUrls = [
                `${API_BASE_URL}/products?is_featured=1&limit=6&status=active`,
                `${API_BASE_URL}/products?limit=6&status=active`,
            ];
            for (const url of tryUrls) {
                try {
                    const res = await fetch(url);
                    const json = await res.json();
                    const list = json?.data?.products || json?.data || json?.products || [];
                    if (Array.isArray(list) && list.length > 0) {
                        return list.slice(0, 6).map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            name_ar: p.name_ar ?? null,
                            slug: p.slug,
                            model: p.model ?? null,
                            price: p.price ?? null,
                            offer_price: p.offer_price ?? null,
                            primary_image: p.primary_image ?? p.image ?? null,
                            category_name: p.category_name ?? null,
                            stock_quantity: p.stock_quantity ?? null,
                            track_inventory: p.track_inventory ?? 0,
                        }));
                    }
                } catch {
                    /* try next */
                }
            }
            return [];
        };

        const fetchDropdown = async () => {
            const q = searchQuery.trim();
            setIsSearching(q.length >= 2);
            try {
                const url = q.length >= 2
                    ? `${API_BASE_URL}/products/search-dropdown?q=${encodeURIComponent(q)}`
                    : `${API_BASE_URL}/products/search-dropdown`;
                const res = await fetch(url);
                const data = await res.json();
                if (cancelled) return;
                if (data.success && data.data) {
                    let trending = data.data.trending || [];
                    if (q.length < 2 && trending.length === 0) {
                        const fallback = await fetchTrendingFallback();
                        if (cancelled) return;
                        trending = fallback;
                    }
                    setDropdownData({
                        products: data.data.products || [],
                        categories: data.data.categories || [],
                        brands: data.data.brands || [],
                        trending
                    });
                } else if (q.length < 2) {
                    const fallback = await fetchTrendingFallback();
                    if (cancelled) return;
                    setDropdownData(prev => ({ ...prev, trending: fallback }));
                }
            } catch (err) {
                if (!cancelled) console.error('Search dropdown fetch failed', err);
                if (!cancelled && searchQuery.trim().length < 2) {
                    const fallback = await fetchTrendingFallback();
                    if (!cancelled) setDropdownData(prev => ({ ...prev, trending: fallback }));
                }
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchDropdown, searchQuery.trim().length >= 2 ? 250 : 0);
        return () => { cancelled = true; clearTimeout(timer); };
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
    // ResizeObserver fires after layout — no forced reflow
    useEffect(() => {
        if (!headerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            if (isSticky) return;
            const h = headerRef.current?.offsetHeight;
            if (h && h > 0) setHeaderHeight(h);
        });
        ro.observe(headerRef.current);
        return () => ro.disconnect();
    }, [isSticky]);

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScroll = window.scrollY;
                    const threshold = headerHeight > 0 ? headerHeight : 200;
                    setIsSticky(currentScroll > threshold);
                    ticking = false;
                });
                ticking = true;
            }
        };

        const handleOpenCart = () => setIsDrawerOpen(true);
        const handleToggleMenu = () => setIsMenuOpen(prev => !prev);
        const handleOpenMenu = () => setIsMenuOpen(true);

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('OPEN_CART_DRAWER', handleOpenCart);
        window.addEventListener('TOGGLE_MOBILE_MENU', handleToggleMenu);
        window.addEventListener('OPEN_MOBILE_MENU', handleOpenMenu);

        // Initial check
        setIsSticky(window.scrollY > (headerHeight > 0 ? headerHeight : 200));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('OPEN_CART_DRAWER', handleOpenCart);
            window.removeEventListener('TOGGLE_MOBILE_MENU', handleToggleMenu);
            window.removeEventListener('OPEN_MOBILE_MENU', handleOpenMenu);
        };
    }, [setIsDrawerOpen, headerHeight]);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const [optimisticIsArabic, setOptimisticIsArabic] = useState(isArabic);

    // Internal state syncing
    useEffect(() => {
        setOptimisticIsArabic(isArabic);
    }, [isArabic]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
            // Optional: Handle scrollbar width jump if needed
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    const switchLocale = (newLocale: 'en' | 'ar') => {
        const currentSearch = typeof window !== 'undefined' ? window.location.search : '';

        // Update visual state instantly
        setOptimisticIsArabic(newLocale === 'ar');

        // Wait for the CSS animation (200ms) to finish before reloading the page
        setTimeout(() => {
            router.replace(pathname + currentSearch, { locale: newLocale });
        }, 200);
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed) {
            router.push(`/shop?search=${encodeURIComponent(trimmed)}`);
            setIsMenuOpen(false);
            setShowSuggestions(false);
        }
    };

    // With locale-aware usePathname, pathname already excludes locale prefix
    const cleanPath = pathname || '/';
    const isCategoriesPage = cleanPath === '/all-categories';

    return (
        <>
            <div style={{ height: isSticky ? `${headerHeight}px` : 'auto' }}>
                <header
                    ref={headerRef}
                    className={`${styles.header} ${isSticky ? styles.sticky : ''}`}
                >
                    <div className={styles.topBanner}>
                        <div className={styles.container}>
                            <div className={styles.topBannerLeft}>
                                {announcement?.is_active ? (
                                    <div className={styles.topAnnouncement}>
                                        <div className={styles.tickerTrack}>
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={styles.tickerItem}>
                                                    {(() => {
                                                        const textToDisplay = isArabic ? (announcement.text_ar || announcement.text) : announcement.text;
                                                        const segments = textToDisplay.split(/[\n\r]+/).map((s: string) => s.trim()).filter(Boolean);
                                                        return segments.map((seg: string, sIdx: number) => (
                                                            <React.Fragment key={sIdx}>
                                                                <span>{seg}</span>
                                                                <span className={styles.tickerSeparator}>✦</span>
                                                            </React.Fragment>
                                                        ));
                                                    })()}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {t('topBanner')}
                                        <Image
                                            src="/Flag_of_the_United_Arab_Emirates.svg"
                                            alt="UAE"
                                            width={18}
                                            height={12}
                                        />
                                    </div>
                                )}
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
                                        <img
                                            src="/assets/mariot-icon.webp"
                                            alt="Mariot Icon"
                                            className={styles.miniIcon}
                                        />
                                        <div className={styles.logoText}>
                                            <img
                                                src={isArabic ? "/MARIOT-A.webp" : "/assets/mariot-logo.webp"}
                                                alt="Mariot Logo"
                                                className={styles.logoImage}
                                            />
                                        </div>
                                    </div>
                                </Link>
                            </div>

                            <div className={styles.searchSection}>
                                <form className={styles.searchBar} onSubmit={handleSearch}>
                                    {!searchQuery && !isSearching && (
                                        <div className={styles.placeholderContainer}>
                                            <div className={styles.initialText}>
                                                {t('searchPlaceholder')}
                                            </div>
                                            <div className={styles.animatedPlaceholder}>
                                                <span className={styles.placeholderPrefix}>{t('searchFor')}</span>
                                                <div className={styles.wordsScroller}>
                                                    <div className={styles.wordsScrollerInner}>
                                                        <span className={styles.word}>&quot;{tc('coffee-makers')}&quot;</span>
                                                        <span className={styles.word}>&quot;{tc('refrigeration')}&quot;</span>
                                                        <span className={styles.word}>&quot;{tc('commercial-ovens')}&quot;</span>
                                                        <span className={styles.word}>&quot;{tc('food-preparation')}&quot;</span>
                                                        <span className={styles.word}>&quot;{tc('ice-equipment')}&quot;</span>
                                                        <span className={styles.word}>&quot;{tc('coffee-makers')}&quot;</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        placeholder={searchQuery ? '' : ''}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setShowSuggestions(true)}
                                        onClick={() => setShowSuggestions(true)}
                                        className={styles.searchInput}
                                        aria-label={t('searchPlaceholder')}
                                    />
                                    <button type="submit" className={styles.searchButton} disabled={isSearching}>
                                        {isSearching ? (
                                            <span className={styles.searchSpinner} aria-label="loading" />
                                        ) : (
                                            <Search size={20} />
                                        )}
                                        <span>{t('search')}</span>
                                    </button>
                                </form>

                                {showSuggestions && (
                                    <SearchDropdown
                                        query={searchQuery}
                                        data={dropdownData}
                                        loading={isSearching}
                                        onNavigate={(path) => {
                                            const match = /^\/category\/([^/?#]+)$/.exec(path);
                                            if (match) {
                                                const slug = decodeURIComponent(match[1]);
                                                const id = categorySlugToId[slug];
                                                const hasChildren = id != null && parentCategoryIds.has(id);
                                                router.push(hasChildren ? `/category/${slug}` : `/shop?category=${slug}`);
                                                return;
                                            }
                                            router.push(path);
                                        }}
                                        onClose={() => {
                                            setShowSuggestions(false);
                                            setSearchQuery('');
                                        }}
                                    />
                                )}
                            </div>

                            <div className={styles.userActions}>
                                <Link href="/profile?tab=myRewards" className={`${styles.rewardPoints} ${styles.desktopOnly}`}>
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
                                </Link>

                                <div className={`${styles.switch} ${styles.headerLangSelector}`} dir="ltr">
                                    <input
                                        id="languageToggle"
                                        className={`${styles.checkToggle} ${styles.checkToggleRoundFlat}`}
                                        type="checkbox"
                                        checked={!optimisticIsArabic}
                                        onChange={() => switchLocale(optimisticIsArabic ? 'en' : 'ar')}
                                    />
                                    <label htmlFor="languageToggle"></label>
                                    <span className={styles.switchOn}>عربي</span>
                                    <span className={styles.switchOff}>EN</span>
                                </div>

                                <Link href={user ? "/profile" : "/signin"} className={styles.profile}>
                                    <User size={28} className={styles.userIcon} />
                                    <div className={styles.actionText}>
                                        <span className={styles.label}>{t('account')}</span>
                                        <span className={styles.userName}>
                                            {user ? t('hello', { name: user.name.split(' ')[0] }) : t('signIn')}
                                        </span>
                                    </div>
                                </Link>

                                {(user?.role === 'admin' || user?.role === 'staff') && (
                                    <Link href="/admin" className={styles.desktopOnly}>
                                        <div className={styles.adminIconWrapper}>
                                            <Shield size={28} />
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
                            {/* Mobile-only Header Section */}
                            <div className={`${styles.mobileMenuHeader} ${styles.mobileOnly}`}>
                                {user ? (
                                    <div className={styles.mobileProfileSection}>
                                        <div className={styles.mobileUserInfo}>
                                            <span className={styles.mobileUserName}>{user.name}</span>
                                            <span className={styles.mobileUserEmail}>{user.email}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.mobileGuestSection}>
                                        <div className={styles.mobileUserInfo}>
                                            <span className={styles.mobileUserName}>{t('account')}</span>
                                            <Link href="/signin" className={styles.mobileSignInLink} onClick={() => setIsMenuOpen(false)}>
                                                {t('signIn')}
                                            </Link>
                                        </div>
                                    </div>
                                )}
                                <button className={styles.mobileCloseBtn} onClick={() => setIsMenuOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className={styles.mobileScrollArea}>
                                <div
                                    className={styles.categoriesWrapper}
                                    onMouseEnter={() => setIsCategoriesHovered(true)}
                                    onMouseLeave={() => setIsCategoriesHovered(false)}
                                >
                                    <Link
                                        href="/all-categories"
                                        className={`${styles.categories} ${isCategoriesPage ? styles.categoriesActive : ''}`}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <div className={styles.navItemContent}>
                                            <Menu size={24} className={styles.desktopOnly} />
                                            <Menu size={20} className={styles.mobileOnly} />
                                            <span>{t('allCategories')}</span>
                                        </div>
                                        <ChevronRight size={18} className={styles.mobileOnly} />
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
                                            <div className={styles.navItemContent}>
                                                <Flame size={20} className={styles.mobileOnly} />
                                                <span className={styles.desktopOnly}>🔥 </span>
                                                <span>{t('todayOffers')}</span>
                                                <span className={`${styles.hotBadge} ${styles.mobileOnly}`}>HOT</span>
                                            </div>
                                            <ChevronRight size={18} className={styles.mobileOnly} />
                                        </Link>
                                    </li>
                                    <li className={styles.mobileOnly}>
                                        <Link
                                            href="/shop?weekly=true"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className={styles.navItemContent}>
                                                <Gift size={20} className={styles.mobileOnly} />
                                                <span>{t('weeklyDeals')}</span>
                                            </div>
                                            <ChevronRight size={18} className={styles.mobileOnly} />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/shop-by-brands"
                                            className={cleanPath === '/shop-by-brands' ? styles.linkActive : ''}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className={styles.navItemContent}>
                                                <Tag size={20} className={styles.mobileOnly} />
                                                <span>{t('shopByBrand')}</span>
                                            </div>
                                            <ChevronRight size={18} className={styles.mobileOnly} />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/category/kitchen-equipment"
                                            className={cleanPath === '/category/kitchen-equipment' ? styles.linkActive : ''}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className={styles.navItemContent}>
                                                <Utensils size={20} className={styles.mobileOnly} />
                                                <span>{t('kitchenEquipments')}</span>
                                            </div>
                                            <ChevronRight size={18} className={styles.mobileOnly} />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/category/stainless-steel-fabrications"
                                            className={cleanPath === '/category/stainless-steel-fabrications' ? styles.linkActive : ''}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className={styles.navItemContent}>
                                                <Hammer size={20} className={styles.mobileOnly} />
                                                <span>{t('stainlessSteelFabrications')}</span>
                                            </div>
                                            <ChevronRight size={18} className={styles.mobileOnly} />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/category/supermarket"
                                            className={cleanPath === '/category/supermarket' ? styles.linkActive : ''}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className={styles.navItemContent}>
                                                <ShoppingCart size={20} className={styles.mobileOnly} />
                                                <span>{t('superMarket')}</span>
                                            </div>
                                            <ChevronRight size={18} className={styles.mobileOnly} />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/category/laundry"
                                            className={cleanPath === '/category/laundry' ? styles.linkActive : ''}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className={styles.navItemContent}>
                                                <Shirt size={20} className={styles.mobileOnly} />
                                                <span>{t('laundry')}</span>
                                            </div>
                                            <ChevronRight size={18} className={styles.mobileOnly} />
                                        </Link>
                                    </li>
                                    {user ? (
                                        <>
                                            <li className={styles.mobileOnly}>
                                                <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                                                    <div className={styles.navItemContent}>
                                                        <User size={20} />
                                                        <span>{t('myAccount')}</span>
                                                    </div>
                                                    <ChevronRight size={18} />
                                                </Link>
                                            </li>
                                            <li className={styles.mobileOnly}>
                                                <Link href="/rewards" onClick={() => setIsMenuOpen(false)}>
                                                    <div className={styles.navItemContent}>
                                                        <Trophy size={20} />
                                                        <span>{t('rewardPointsNav')}</span>
                                                        <span className={styles.pointsBadge}>{user?.reward_points || 0}</span>
                                                    </div>
                                                    <ChevronRight size={18} />
                                                </Link>
                                            </li>
                                            {(user?.role === 'admin' || user?.role === 'staff') && (
                                                <li className={styles.mobileOnly}>
                                                    <Link
                                                        href="/admin"
                                                        onClick={() => setIsMenuOpen(false)}
                                                        className={styles.adminMobileLink}
                                                    >
                                                        <div className={styles.navItemContent}>
                                                            <Shield size={20} />
                                                            <span>{t('adminDashboard')}</span>
                                                        </div>
                                                        <ChevronRight size={18} />
                                                    </Link>
                                                </li>
                                            )}
                                        </>
                                    ) : (
                                        <li className={styles.mobileOnly}>
                                            <Link href="/signin" onClick={() => setIsMenuOpen(false)}>
                                                <div className={styles.navItemContent}>
                                                    <UserPlus size={20} />
                                                    <span>{t('signInRegister')}</span>
                                                </div>
                                                <ChevronRight size={18} />
                                            </Link>
                                        </li>
                                    )}
                                    <li className={styles.mobileOnly}>
                                        <Link href="/track-order" onClick={() => setIsMenuOpen(false)}>
                                            <div className={styles.navItemContent}>
                                                <MessageCircle size={20} />
                                                <span>{t('liveSupport')}</span>
                                            </div>
                                            <ChevronRight size={18} />
                                        </Link>
                                    </li>

                                </ul>

                                {user && (
                                    <div className={`${styles.mobileSignOutContainer} ${styles.mobileOnly}`}>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsMenuOpen(false);
                                            }}
                                            className={styles.newMobileSignOutBtn}
                                        >
                                            <LogOut size={20} />
                                            <span>{t('signOut')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </nav>

                    {/* Support Info Bar */}
                    <div className={`${styles.supportBar} ${styles.desktopOnly}`}>
                        <div className={styles.container}>
                            <div className={styles.supportItem}>
                                <Phone size={16} className={styles.whatsappIcon} />
                                <a href="https://wa.me/97142882777" target="_blank" rel="noopener noreferrer">
                                    <span className={styles.desktopOnly}>
                                        {t.rich('customEquipments', {
                                            phone: (chunks) => <span dir="ltr" style={{ display: 'inline-block', direction: 'ltr', unicodeBidi: 'isolate' }}>(+971 4 288 2777)</span>
                                        })}
                                    </span>
                                    <span className={styles.mobileOnly}>
                                        {t('liveSupport')}
                                    </span>
                                </a>
                            </div>
                            <div className={styles.supportItem}>
                                <MessageCircle size={16} className={styles.supportIcon} />
                                <a href="#">{t('liveSupport')}</a>
                            </div>
                            <div className={styles.supportItem}>
                                <HelpCircle size={16} className={styles.helpIcon} />
                                <Link href="/shop?category=parts">{t('needHelp')}</Link>
                            </div>
                        </div>
                    </div>
                </header>
            </div>
        </>
    );
};

export default Header;
