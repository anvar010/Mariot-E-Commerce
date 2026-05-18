'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
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
    const searchParams = useSearchParams();
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
    const skipNextFetchRef = React.useRef(false);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const [isCategoriesHovered, setIsCategoriesHovered] = useState(false);
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const [showRewardToast, setShowRewardToast] = useState(false);
    const [rewardToastPoints, setRewardToastPoints] = useState(0);
    const [announcement, setAnnouncement] = useState<any>(null);

    const isArabic = locale === 'ar';

    // Clear the search-button spinner once navigation to the new page (or new search query) completes
    useEffect(() => {
        setIsSearching(false);
    }, [pathname, searchParams]);

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

    // Show a toast whenever the user's reward_points increase (welcome bonus,
    // profile-completion bonus, order points, etc.). The "last seen" value
    // lives in localStorage so the delta survives page reloads.
    useEffect(() => {
        if (!user) return;
        const current = Number(user.reward_points) || 0;
        const stored = Number(localStorage.getItem('mariot.lastRewardPoints') || '0');
        if (current > stored) {
            const delta = current - stored;
            setRewardToastPoints(delta);
            setShowRewardToast(true);
            localStorage.setItem('mariot.lastRewardPoints', String(current));
        } else if (current !== stored) {
            // Points went down (redeemed) — sync silently so the next earn fires correctly.
            localStorage.setItem('mariot.lastRewardPoints', String(current));
        }
    }, [user?.reward_points]);

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
            if (skipNextFetchRef.current) {
                skipNextFetchRef.current = false;
                return;
            }
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
            skipNextFetchRef.current = true;
            setIsSearching(true);
            // Close mobile keyboard: blur the input directly (more reliable than activeElement)
            searchInputRef.current?.blur();
            if (typeof document !== 'undefined') {
                const active = document.activeElement as HTMLElement | null;
                if (active && typeof active.blur === 'function') active.blur();
            }
            router.push(`/shop?search=${encodeURIComponent(trimmed)}`);
            setIsMenuOpen(false);
            setShowSuggestions(false);
        }
    };

    // Traditional nav link configuration
    const navItems = [
        { label: t('todayOffers'), path: '/today-offers', isHot: true, icon: Flame },
        { label: t('weeklyDeals'), path: '/shop?weekly=true', icon: Gift },
        { label: t('shopByBrand'), path: '/shop-by-brands', icon: Tag },
        { label: t('kitchenEquipments'), path: '/category/kitchen-equipment', icon: Utensils },
        { label: t('stainlessSteelFabrications'), path: '/category/stainless-steel-fabrications', icon: Hammer },
        { label: t('superMarket'), path: '/category/supermarket', icon: ShoppingCart },
        { label: t('laundry'), path: '/category/laundry', icon: Shirt },
        { label: t('rewardPoints'), path: '/profile?tab=myRewards', icon: Trophy, hasBadge: true },
    ];

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
                                        ref={searchInputRef}
                                        type="search"
                                        enterKeyHint="search"
                                        placeholder=""
                                        value={searchQuery}
                                        onChange={(e) => {
                                            skipNextFetchRef.current = false;
                                            setSearchQuery(e.target.value);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onClick={() => setShowSuggestions(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                searchInputRef.current?.blur();
                                                handleSearch();
                                            }
                                        }}
                                        className={styles.searchInput}
                                        aria-label={t('searchPlaceholder')}
                                    />
                                    <button type="submit" className={styles.searchButton}>
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
                                <Link href={user ? '/profile?tab=myRewards' : '/affiliate-program'} className={`${styles.rewardPoints} ${styles.desktopOnly}`}>
                                    <Coins size={24} className={styles.pointIcon} />
                                    <div className={styles.actionText}>
                                        <span className={styles.label}>{t('rewardPoints')}</span>
                                        <span className={styles.value}>{user?.reward_points || 0}</span>
                                    </div>
                                    {showRewardToast && rewardToastPoints > 0 && (
                                        <div className={styles.rewardToast}>
                                            <div className={styles.rewardToastContent}>
                                                <Trophy size={16} className={styles.trophyIcon} />
                                                <span>{t('congratsPoints', { points: rewardToastPoints })}</span>
                                                <X size={14} className={styles.closeToast} onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowRewardToast(false);
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

                                <Link href={user ? '/profile?tab=myRewards' : '/affiliate-program'} className={`${styles.rewardPointsMobile} ${styles.mobileOnly}`}>
                                    <Coins size={20} className={styles.pointIcon} />
                                    {user && (
                                        <span className={styles.mobilePointsValue}>
                                            {user.reward_points || 0}
                                        </span>
                                    )}
                                </Link>

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

                    <div className={`${styles.navBar} ${styles.desktopOnly}`}>
                        <div className={styles.container}>
                            <div
                                className={styles.categoriesWrapper}
                                onMouseEnter={() => setIsCategoriesHovered(true)}
                                onMouseLeave={() => setIsCategoriesHovered(false)}
                            >
                                <Link
                                    href="/all-categories"
                                    className={`${styles.categories} ${isCategoriesHovered ? styles.categoriesActive : ''}`}
                                    onClick={() => setIsCategoriesHovered(false)}
                                >
                                    <div className={styles.navItemContent}>
                                        <Menu size={20} />
                                        <span>{t('allCategories')}</span>
                                    </div>
                                </Link>
                                {isCategoriesHovered && (
                                    <div className={styles.megaMenu}>
                                        <CategoriesLayout isPopup={true} onClose={() => setIsCategoriesHovered(false)} />
                                    </div>
                                )}
                            </div>

                            <ul className={styles.navLinks}>
                                {navItems
                                    .filter(item => item.path !== '/shop?weekly=true' && item.path !== '/profile?tab=myRewards')
                                    .map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.path}
                                                className={`${pathname === item.path ? styles.linkActive : ''} ${item.isHot ? styles.desktopHotLink : ''}`}
                                            >
                                                {item.isHot && item.icon && (
                                                    <item.icon
                                                        size={16}
                                                        style={{
                                                            marginInlineEnd: '4px',
                                                            verticalAlign: 'middle',
                                                            color: '#ef4444',
                                                            display: 'inline-block'
                                                        }}
                                                    />
                                                )}
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                </header>
            </div>

            {/* Mobile Menu Components - Moved outside sticky wrapper for stability */}
            {isMenuOpen && (
                <div className={styles.overlay} onClick={() => setIsMenuOpen(false)} />
            )}

            <nav className={`${styles.navBar} ${styles.mobileOnly} ${isMenuOpen ? styles.navOpen : ''}`}>
                <div className={styles.container}>
                    <div className={styles.mobileMenuHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', paddingInlineEnd: '45px' }}>
                            <Link
                                href={user ? "/profile" : "/signin"}
                                className={styles.mobileProfileLink}
                                onClick={() => setIsMenuOpen(false)}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textDecoration: 'none' }}
                            >
                                <div className={styles.mobileAvatar}>
                                    <User size={24} color="#16a1db" />
                                </div>
                                <div className={styles.mobileUserInfo}>
                                    <span className={styles.mobileUserName}>{user ? user.name : t('account')}</span>
                                    {user && <span className={styles.mobileUserEmail}>{user.email}</span>}
                                    {!user && <span className={styles.mobileSignInLink}>{t('signIn')}</span>}
                                </div>
                            </Link>
                            <div className={`${styles.switch} ${styles.mobileLangSelector}`} dir="ltr">
                                <input
                                    id="languageToggleMobile"
                                    className={`${styles.checkToggle} ${styles.checkToggleRoundFlat}`}
                                    type="checkbox"
                                    checked={!optimisticIsArabic}
                                    onChange={() => {
                                        switchLocale(optimisticIsArabic ? 'en' : 'ar');
                                        setIsMenuOpen(false);
                                    }}
                                />
                                <label htmlFor="languageToggleMobile"></label>
                                <span className={styles.switchOn}>عربي</span>
                                <span className={styles.switchOff}>EN</span>
                            </div>
                        </div>
                        <button className={styles.mobileCloseBtn} onClick={() => setIsMenuOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className={styles.mobileScrollArea}>
                        {/* Categories section */}
                        <div className={styles.categoriesWrapper}>
                            <div
                                className={`${styles.categories} ${isMegaMenuOpen ? styles.categoriesActive : ''} ${pathname === '/all-categories' ? styles.categoriesPageActive : ''}`}
                                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                            >
                                <Link
                                    href="/all-categories"
                                    className={styles.navItemContent}
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsMegaMenuOpen(false);
                                    }}
                                >
                                    <Menu size={20} />
                                    <span>{t('allCategories')}</span>
                                </Link>
                                <ChevronRight size={14} className={styles.mobileOnly} />
                                {isMegaMenuOpen && (
                                    <div className={styles.megaMenu} style={{ display: 'block', position: 'static', width: '100%', boxShadow: 'none', animation: 'none' }}>
                                        <CategoriesLayout isPopup={true} onClose={() => {
                                            setIsMenuOpen(false);
                                            setIsMegaMenuOpen(false);
                                        }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Traditional nav links */}
                        <ul className={styles.navLinks}>
                            {navItems.map((item, index) => (
                                <li key={index} className={item.isHot ? styles.hot : ''}>
                                    <Link
                                        href={item.path}
                                        className={pathname === item.path ? styles.linkActive : ''}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <div className={styles.navItemContent}>
                                            {item.icon && <item.icon size={20} />}
                                            {item.label}
                                        </div>
                                        {item.isHot && <span className={styles.hotBadge}>HOT</span>}
                                        {item.hasBadge && (
                                            <span className={styles.pointsBadge}>
                                                {user?.reward_points || 0} PTS
                                            </span>
                                        )}
                                        <ChevronRight size={14} className={styles.mobileOnly} />
                                    </Link>
                                </li>
                            ))}

                            {/* Mobile-only Admin Link */}
                            {(user?.role === 'admin' || user?.role === 'staff') && (
                                <li className={styles.mobileOnly}>
                                    <Link
                                        href="/admin"
                                        className={`${styles.adminMobileLink}`}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <div className={styles.navItemContent}>
                                            <Shield size={20} />
                                            {t('admin')}
                                        </div>
                                        <ChevronRight size={14} />
                                    </Link>
                                </li>
                            )}
                        </ul>

                        {/* Sign Out for Mobile */}
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
                                    {t('signOut')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Header;
