'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, ShoppingCart, User, Coins, Menu, Globe, Phone, MessageCircle, HelpCircle, ChevronDown, X, Shield, Heart, Trophy, LogOut } from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import dynamic from 'next/dynamic';
const CategoriesLayout = dynamic(() => import('@/components/Categories/CategoriesLayout'), { ssr: false });

import { API_BASE_URL } from '@/config';
import { resolveUrl } from '@/utils/resolveUrl';

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
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [didYouMean, setDidYouMean] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const [isCategoriesHovered, setIsCategoriesHovered] = useState(false);
    const [showRewardToast, setShowRewardToast] = useState(false);
    const [announcement, setAnnouncement] = useState<any>(null);

    const isArabic = locale === 'ar';

    // Search Drag-to-Scroll Logic
    const searchDropdownRef = React.useRef<HTMLDivElement>(null);
    const isDraggingRef = React.useRef(false);
    const startYRef = React.useRef(0);
    const scrollTopRef = React.useRef(0);
    const hasDraggedRef = React.useRef(false);

    const cachedOffsetTopRef = React.useRef(0);

    const handleSearchMouseDown = (e: React.MouseEvent) => {
        if (!searchDropdownRef.current) return;
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        // Read offsetTop once here; reuse in mousemove to avoid per-move reflows
        cachedOffsetTopRef.current = searchDropdownRef.current.offsetTop;
        startYRef.current = e.pageY - cachedOffsetTopRef.current;
        scrollTopRef.current = searchDropdownRef.current.scrollTop;
        searchDropdownRef.current.classList.add(styles.isDragging);
    };

    const handleSearchMouseLeave = () => {
        isDraggingRef.current = false;
        if (searchDropdownRef.current) searchDropdownRef.current.classList.remove(styles.isDragging);
    };

    const handleSearchMouseUp = () => {
        // Small delay so onClick can read hasDraggedRef before reset
        setTimeout(() => {
            isDraggingRef.current = false;
        }, 10);
        if (searchDropdownRef.current) searchDropdownRef.current.classList.remove(styles.isDragging);
    };

    const handleSearchMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current || !searchDropdownRef.current) return;
        const y = e.pageY - cachedOffsetTopRef.current;
        const walk = (y - startYRef.current) * 1.5; // Scroll speed
        if (Math.abs(y - startYRef.current) > 5) {
            hasDraggedRef.current = true;
        }
        searchDropdownRef.current.scrollTop = scrollTopRef.current - walk;
    };

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
                    setDidYouMean(data.didYouMean || null);
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
    // ResizeObserver fires after layout — no forced reflow
    useEffect(() => {
        if (!headerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            if (isSticky) return;
            const h = entries[0]?.contentRect.height;
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
                    const threshold = headerHeight > 0 ? headerHeight + 10 : 200;
                    setIsSticky(currentScroll > threshold);
                    ticking = false;
                });
                ticking = true;
            }
        };

        const handleOpenCart = () => setIsDrawerOpen(true);

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('OPEN_CART_DRAWER', handleOpenCart);

        // Initial check
        setIsSticky(window.scrollY > (headerHeight > 0 ? headerHeight + 10 : 200));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('OPEN_CART_DRAWER', handleOpenCart);
        };
    }, [setIsDrawerOpen, headerHeight]);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const [optimisticIsArabic, setOptimisticIsArabic] = useState(isArabic);
    
    // Sync optimistic state if locale changes externally
    useEffect(() => {
        setOptimisticIsArabic(isArabic);
    }, [isArabic]);

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
            <header
                ref={headerRef}
                className={`${styles.header} ${isSticky ? styles.sticky : ''}`}
            >
                <div className={styles.topBanner}>
                    <div className={styles.container}>
                        <div className={styles.topBannerLeft} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {announcement?.is_active ? announcement.text : t('topBanner')}
                            <Image
                                src="/Flag_of_the_United_Arab_Emirates.svg"
                                alt="UAE"
                                width={18}
                                height={12}
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
                                    <img
                                        src="/assets/mariot-icon.webp"
                                        alt="Mariot Icon"
                                        className={styles.miniIcon}
                                    />
                                    <div className={styles.logoText}>
                                        <img
                                            src="/assets/mariot-logo.webp"
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
                                    onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                                    className={styles.searchInput}
                                    aria-label={t('searchPlaceholder')}
                                />
                                <button type="submit" className={styles.searchButton} disabled={isSearching}>
                                    {isSearching ? (
                                        <span className={styles.searchSpinner} aria-label="loading" />
                                    ) : (
                                        <>
                                            <Search size={20} />
                                            <span>{t('search')}</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {showSuggestions && (
                                <div
                                    className={styles.suggestionsDropdown}
                                    ref={searchDropdownRef}
                                    onMouseDown={handleSearchMouseDown}
                                    onMouseLeave={handleSearchMouseLeave}
                                    onMouseUp={handleSearchMouseUp}
                                    onMouseMove={handleSearchMouseMove}
                                >
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
                                                    onClick={(e) => {
                                                        if (hasDraggedRef.current) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            return;
                                                        }

                                                        if (item.type === 'category') {
                                                            router.push(`/category/${item.slug}`);
                                                        } else if (item.type === 'brand') {
                                                            router.push(`/shop?brand=${item.slug}`);
                                                        } else {
                                                            router.push(`/product/${item.slug}`);
                                                        }
                                                        setShowSuggestions(false);
                                                        setSearchQuery('');
                                                    }}
                                                >
                                                    <div className={styles.suggestionImageWrapper}>
                                                        <Image
                                                            src={resolveUrl(item.primary_image || (item.type === 'category' ? '/assets/category-placeholder.png' : '/assets/placeholder-image.webp'))}
                                                            alt={item.name}
                                                            width={45}
                                                            height={45}
                                                            className={styles.suggestionImage}
                                                        />
                                                    </div>
                                                    <div className={styles.suggestionInfo}>
                                                        <div className={styles.suggestionNameHeader}>
                                                            <div className={styles.suggestionNameWrapper}>
                                                                <span className={styles.suggestionName}>{item.name}</span>
                                                                {item.model && <span className={styles.suggestionModel}>({item.model})</span>}
                                                            </div>
                                                            <span className={`${styles.typeBadge} ${styles[item.type]}`}>{item.type}</span>
                                                        </div>
                                                        <div className={styles.suggestionMeta}>
                                                            {item.type === 'product' && (
                                                                <span className={styles.suggestionPrice}>
                                                                    AED {Number(item.offer_price || item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                            {item.category_name && (
                                                                <span className={styles.suggestionCategory}>{item.category_name}</span>
                                                            )}
                                                            {item.type === 'category' && (
                                                                <span className={styles.suggestionCategory}>Browse Category</span>
                                                            )}
                                                            {item.type === 'brand' && (
                                                                <span className={styles.suggestionCategory}>Shop Brand</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : searchQuery.trim().length >= 2 && (
                                        <div className={styles.noSuggestions} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                                            <div>{t('noResultsFound')}</div>
                                            {didYouMean && (
                                                <div
                                                    style={{ marginTop: '8px', cursor: 'pointer', color: '#2563eb' }}
                                                    onClick={() => {
                                                        setSearchQuery(didYouMean);
                                                    }}
                                                >
                                                    Did you mean: <strong style={{ textDecoration: 'underline' }}>{didYouMean}</strong>?
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                                    href="/category/stainless-steel-fabrications"
                                    className={cleanPath === '/category/stainless-steel-fabrications' ? styles.linkActive : ''}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('stainlessSteelFabrications')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/category/supermarket"
                                    className={cleanPath === '/category/supermarket' ? styles.linkActive : ''}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t('superMarket')}
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
                            {(user?.role === 'admin' || user?.role === 'staff') && (
                                <li className={styles.mobileOnly}>
                                    <Link
                                        href="/admin"
                                        onClick={() => setIsMenuOpen(false)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#2563eb' }}
                                    >
                                        <Shield size={20} />
                                        <span>{t('adminDashboard')}</span>
                                    </Link>
                                </li>
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
                            <Link href="/shop?category=parts">{t('needHelp')}</Link>
                        </div>
                    </div>
                </div>
            </header >
            {isSticky && <div style={{ height: `${headerHeight}px` }} />}
        </>
    );
};

export default Header;
