'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from "next/image";
import styles from './TodayOffersPage.module.css';
import {
    ChevronDown,
    Filter,
    ChevronLeft,
    ChevronRight,
    Search,
    Coins,
    ShoppingCart,
    Phone,
    X,
    ListFilter
} from 'lucide-react';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import Loader from '@/components/shared/Loader/Loader';
import ProductCardSkeleton from '@/components/shared/ProductCardPromotion/ProductCardSkeleton';
import PromoTicker from '../Layout/PromoTicker/PromoTicker';
import { API_BASE_URL } from '@/config';
import { useTranslations } from 'next-intl';

import DefaultShopFilter from '@/components/Filters/DefaultShopFilter';

interface TodayOffersPageProps {
    initialProducts?: any[];
    initialCategories?: any[];
    initialBrands?: any[];
}

const TodayOffersPage = ({ initialProducts = [], initialCategories = [], initialBrands = [] }: TodayOffersPageProps) => {
    const t = useTranslations('todayOffers');
    const tc = useTranslations('categoryContent');
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [categories, setCategories] = useState<any[]>(initialCategories);
    const [brands, setBrands] = useState<any[]>(initialBrands);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [activeFilters, setActiveFilters] = useState<{
        category: string;
        brand: string[];
        sort: string;
        minPrice: number;
        maxPrice: number;
    }>({
        category: '',
        brand: [],
        sort: 'relevance',
        minPrice: 0,
        maxPrice: 99999
    });
    const [priceRange, setPriceRange] = useState({ min: 0, max: 99999 });
    const [openFilters, setOpenFilters] = useState<string[]>(['brand', 'price']);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
    const mobileSortRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMobileSortOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (mobileSortRef.current && !mobileSortRef.current.contains(e.target as Node))
                setIsMobileSortOpen(false);
        };
        const handleScroll = () => setIsMobileSortOpen(false);
        document.addEventListener('mousedown', handleClick);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isMobileSortOpen]);

    // Debounce price filtering
    useEffect(() => {
        const timer = setTimeout(() => {
            if (priceRange.min !== activeFilters.minPrice || priceRange.max !== activeFilters.maxPrice) {
                setActiveFilters(prev => ({
                    ...prev,
                    minPrice: priceRange.min,
                    maxPrice: priceRange.max
                }));
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [priceRange]);

    const [timeLeft, setTimeLeft] = useState({
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    // Toggle filter sections
    const toggleSection = (section: string) => {
        setOpenFilters(prev =>
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
    };

    // Countdown Timer logic - use offer_end from fetched products
    useEffect(() => {
        const updateTimer = () => {
            // Find the latest offer_end from products
            const offerEndDates = products
                .filter(p => p.offer_end)
                .map(p => new Date(p.offer_end).getTime());

            if (offerEndDates.length === 0) {
                // Fallback to localStorage
                const storedEndTime = localStorage.getItem('daily_offer_end_time');
                if (!storedEndTime) {
                    setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                    return;
                }
                const endTime = new Date(storedEndTime).getTime();
                const now = Date.now();
                const difference = endTime - now;
                if (difference <= 0) {
                    setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                    return;
                }
                setTimeLeft({
                    hours: Math.floor(difference / 3600000),
                    minutes: Math.floor((difference % 3600000) / 60000),
                    seconds: Math.floor((difference % 60000) / 1000)
                });
                return;
            }

            // Use the latest (max) offer_end
            const endTime = Math.max(...offerEndDates);
            const now = Date.now();
            const difference = endTime - now;

            if (difference <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            setTimeLeft({
                hours: Math.floor(difference / 3600000),
                minutes: Math.floor((difference % 3600000) / 60000),
                seconds: Math.floor((difference % 60000) / 1000)
            });
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();

        return () => clearInterval(timer);
    }, [products]);

    // Categories — fetch once
    useEffect(() => {
        if (initialCategories.length > 0) return;
        fetch(`${API_BASE_URL}/categories`, { credentials: 'include' })
            .then(r => r.json())
            .then(json => { if (json.success) setCategories(json.data); })
            .catch(err => console.error('Error fetching categories:', err));
    }, [initialCategories]);

    // Brands — only show brands that actually have daily-offer products.
    // If a category is selected, narrow further to that category subtree.
    useEffect(() => {
        const params = new URLSearchParams({ is_daily_offer: '1' });
        if (activeFilters.category) params.set('category', activeFilters.category);
        fetch(`${API_BASE_URL}/brands?${params.toString()}`, { credentials: 'include' })
            .then(r => r.json())
            .then(json => {
                if (!json.success) return;
                const activeBrands = json.data.filter((b: any) =>
                    b.is_active === 1 || b.is_active === true || String(b.is_active) === '1'
                );
                setBrands(activeBrands);
            })
            .catch(err => console.error('Error fetching brands:', err));
    }, [activeFilters.category]);

    const [hasInitialMount, setHasInitialMount] = useState(false);

    // Fetch products based on filters
    useEffect(() => {
        // Skip fetch on initial mount if we have initialProducts
        if (!hasInitialMount && initialProducts.length > 0) {
            setHasInitialMount(true);
            return;
        }

        const fetchOfferProducts = async () => {
            setLoading(true);
            try {
                // Try fetching specifically marked daily offers first
                let url = `${API_BASE_URL}/products?limit=40&is_daily_offer=1`;
                if (activeFilters.category) url += `&category=${activeFilters.category}`;
                if (activeFilters.brand.length > 0) url += `&brand=${activeFilters.brand.join(',')}`;
                if (activeFilters.sort) url += `&sort=${activeFilters.sort}`;
                if (activeFilters.minPrice > 0) url += `&minPrice=${activeFilters.minPrice}`;
                if (activeFilters.maxPrice < 99999) url += `&maxPrice=${activeFilters.maxPrice}`;

                const res = await fetch(url, { credentials: "include" });
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();

                if (data.success) {
                    setProducts(data.data);
                }
            } catch (error) {
                console.error('Error fetching offers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOfferProducts();
    }, [activeFilters, initialProducts, hasInitialMount]);

    const [visibleCount, setVisibleCount] = useState(6); // Default 6 products initially

    const handleShowMore = () => {
        setVisibleCount(prev => prev + 8);
    };

    const displayedProducts = products.slice(0, visibleCount);

    const handleFilterChange = (type: 'category' | 'brand', value: string) => {
        setActiveFilters(prev => {
            if (type === 'brand') {
                const next = prev.brand.includes(value)
                    ? prev.brand.filter(b => b !== value)
                    : [...prev.brand, value];
                return { ...prev, brand: next };
            }
            return { ...prev, category: prev.category === value ? '' : value };
        });
    };

    const getSortLabel = (key: string) => {
        switch (key) {
            case 'price_asc': return tc('price-low-to-high');
            case 'price_desc': return tc('price-high-to-low');
            case 'best_offer': return tc('best-offer');
            case 'relevance':
            default: return tc('relevance');
        }
    };

    const formatTime = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className={styles.offersContainer}>
            <PromoTicker />

            <div className={styles.mainLayout}>
                {/* Sidebar */}
                <div className={`${styles.sidebarWrapper} ${isMobileFilterOpen ? styles.sidebarOpen : ''}`}>
                    <div className={styles.mobileFilterHeader}>
                        <h3>{t('filter')}</h3>
                        <button onClick={() => setIsMobileFilterOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>
                    <DefaultShopFilter
                        inStockOnly={false}
                        setInStockOnly={() => { }}
                        brands={brands}
                        selectedBrands={activeFilters.brand}
                        handleBrandToggle={(brandSlug: string) => handleFilterChange('brand', brandSlug)}
                        allCategories={categories}
                        activeCategory={activeFilters.category}
                        minPrice={priceRange.min}
                        setMinPrice={(val: number) => setPriceRange(prev => ({ ...prev, min: val }))}
                        maxPrice={priceRange.max}
                        setMaxPrice={(val: number) => setPriceRange(prev => ({ ...prev, max: val }))}
                        resetFilters={() => {
                            setActiveFilters({ category: '', brand: [], sort: 'relevance', minPrice: 0, maxPrice: 99999 });
                            setPriceRange({ min: 0, max: 99999 });
                        }}
                        toggleSection={toggleSection}
                        expandedSections={openFilters}
                        onCategoryChange={(slug: string) => handleFilterChange('category', slug)}
                        title={t('filter')}
                    />

                    <div className={styles.promoImage}>
                        <Image
                            src="/assets/offerposter.webp"
                            alt="Promotion"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            style={{ objectFit: 'cover' }}
                            unoptimized
                        />
                    </div>
                </div>

                {isMobileFilterOpen && <div className={styles.filterOverlay} onClick={() => setIsMobileFilterOpen(false)} />}

                {/* Content Area */}
                <main className={styles.contentArea}>
                    {/* Hero Banner Area */}
                    <section className={styles.heroSection}>
                        <div className={styles.heroSliderFull}>
                            <button className={styles.slideBtn}><ChevronLeft /></button>
                            <div className={styles.heroBannerFull}>
                                <Image
                                    src="/assets/todayoffersbanner.webp"
                                    alt="Today's Offers Banner"
                                    width={1200}
                                    height={400}
                                    className={styles.fullBannerImg}
                                    priority
                                    unoptimized
                                />
                            </div>
                            <button className={styles.slideBtn}><ChevronRight /></button>
                        </div>
                    </section>

                    {/* Product List Header */}
                    <div className={styles.listHeader}>
                        <div className={styles.resultsCount}>
                            {loading ? t('searching') : t('resultsFound', { count: products.length })}
                        </div>
                        <div className={styles.sortBox}>
                            <button
                                className={styles.mobileFilterToggle}
                                onClick={() => setIsMobileFilterOpen(true)}
                            >
                                <Filter size={20} />
                                <span>{t('filter')}</span>
                            </button>
                            <div className={styles.sortLabel}>
                                <Filter size={18} fill="currentColor" className={styles.desktopOnly} />
                                <span className={styles.desktopOnly}>{t('sort')}</span>
                            </div>
                            <div className={styles.sortDropdown} onClick={() => setIsSortOpen(!isSortOpen)}>
                                <span>{getSortLabel(activeFilters.sort)}</span>
                                <ChevronDown size={16} className={isSortOpen ? styles.rotateIcon : ''} />

                                {isSortOpen && (
                                    <div className={styles.dropdownContent}>
                                        <div onClick={() => setActiveFilters(prev => ({ ...prev, sort: 'relevance' }))}>{tc('relevance')}</div>
                                        <div onClick={() => setActiveFilters(prev => ({ ...prev, sort: 'best_offer' }))}>{tc('best-offer')}</div>
                                        <div onClick={() => setActiveFilters(prev => ({ ...prev, sort: 'price_asc' }))}>{tc('price-low-to-high')}</div>
                                        <div onClick={() => setActiveFilters(prev => ({ ...prev, sort: 'price_desc' }))}>{tc('price-high-to-low')}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className={styles.productGrid}>
                        {loading ? (
                            Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
                        ) : products.length > 0 ? (
                            displayedProducts.map((product) => (
                                <ProductCardPromotion
                                    key={product.id}
                                    product={{
                                        id: product.id,
                                        name: product.name || product.model || product.sku || 'Unnamed Product',
                                        description: product.description || product.description_ar || product.title || '',
                                        price: Number(product.offer_price) > 0
                                            ? Number(product.offer_price)
                                            : (Number(product.price) || 0),
                                        old_price: Number(product.offer_price) > 0
                                            ? Number(product.price) || 0
                                            : (Number(product.old_price) || Number(product.originalPrice) || 0),
                                        discount_percentage: product.discount_percentage,
                                        primary_image: product.primary_image || product.image_url || product.image,
                                        brand_name: product.brand_name || product.brand,
                                        brand_image: product.brand_image,
                                        images: product.images,
                                        gallery: product.gallery,
                                        slug: product.slug,
                                        stock_quantity: product.stock_quantity,
                                        is_best_seller: product.is_best_seller,
                                        is_weekly_deal: product.is_weekly_deal,
                                        is_limited_offer: product.is_limited_offer,
                                        is_daily_offer: product.is_daily_offer,
                                        offer_start: product.offer_start,
                                        offer_end: product.offer_end,
                                        average_rating: product.average_rating,
                                        total_reviews: product.total_reviews
                                    }}
                                    disableHover={true}
                                    showTimer={true}
                                />
                            ))
                        ) : (
                            <div className={styles.noResults}>
                                <div className={styles.noResultsIcon}>🔍</div>
                                <h3>{t('noOffersFound')}</h3>
                                <p>{t('adjustFilters')}</p>
                                <button
                                    className={styles.resetBtnLarge}
                                    onClick={() => {
                                        setActiveFilters({ category: '', brand: [], sort: 'relevance', minPrice: 0, maxPrice: 99999 });
                                        setPriceRange({ min: 0, max: 99999 });
                                    }}
                                >
                                    {t('resetAll')}
                                </button>
                            </div>
                        )}
                    </div>

                    {products.length > 0 && (
                        <button
                            className={styles.showMoreBtn}
                            onClick={handleShowMore}
                            disabled={products.length <= visibleCount}
                        >
                            {products.length <= visibleCount ? t('allShown') : t('showMore')}
                        </button>
                    )}

                    {/* About the Brand */}
                    <section className={styles.aboutBrand}>
                        <div className={styles.aboutHeader}>
                            <div className={styles.aboutText}>
                                <h4>{t('aboutTheBrand')}</h4>
                                <h3>{t('rationalTitle')}</h3>
                            </div>
                            <div className={styles.brandLogo}>
                                <Image
                                    src="/assets/brands/rational.jpg.webp"
                                    alt="RATIONAL"
                                    width={120}
                                    height={40}
                                    style={{ objectFit: 'contain' }}
                                    unoptimized
                                />
                            </div>
                        </div>
                        <div className={styles.aboutDescription}>
                            <p className={isAboutExpanded ? styles.expanded : styles.collapsed}>
                                {t('rationalDesc')}
                            </p>
                            <button
                                className={styles.readMoreBtn}
                                onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                            >
                                {isAboutExpanded ? t('readLess') : t('readMore')}
                            </button>
                        </div>
                    </section>
                </main>
            </div>

            {/* Mobile Bottom Action Pill */}
            <div className={styles.mobileBottomActionPill}>
                <button className={styles.actionPillBtn} onClick={() => setIsMobileFilterOpen(true)}>
                    <Filter size={18} /><span>{tc('filters')}</span>
                </button>
                <div className={styles.actionPillDivider}></div>
                <div className={styles.actionPillBtn} ref={mobileSortRef} onClick={() => setIsMobileSortOpen(!isMobileSortOpen)}>
                    <ListFilter size={18} />
                    <span>{tc('sort')}</span>
                    {isMobileSortOpen && (
                        <div className={styles.mobileSortDropdown}>
                            <div onClick={(e) => { e.stopPropagation(); setActiveFilters(prev => ({ ...prev, sort: 'relevance' })); setIsMobileSortOpen(false); }}>{tc('relevance')}</div>
                            <div onClick={(e) => { e.stopPropagation(); setActiveFilters(prev => ({ ...prev, sort: 'best_offer' })); setIsMobileSortOpen(false); }}>{tc('best-offer')}</div>
                            <div onClick={(e) => { e.stopPropagation(); setActiveFilters(prev => ({ ...prev, sort: 'price_asc' })); setIsMobileSortOpen(false); }}>{tc('price-low-to-high')}</div>
                            <div onClick={(e) => { e.stopPropagation(); setActiveFilters(prev => ({ ...prev, sort: 'price_desc' })); setIsMobileSortOpen(false); }}>{tc('price-high-to-low')}</div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default TodayOffersPage;
