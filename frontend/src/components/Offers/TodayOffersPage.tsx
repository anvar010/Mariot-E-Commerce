'use client';

import React, { useState, useEffect } from 'react';
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
    Phone
} from 'lucide-react';
import ProductCard from '@/components/shared/ProductCard/ProductCard';
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
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [categories, setCategories] = useState<any[]>(initialCategories);
    const [brands, setBrands] = useState<any[]>(initialBrands);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [activeFilters, setActiveFilters] = useState({
        category: '',
        brand: '',
        sort: 'relevance',
        minPrice: '',
        maxPrice: ''
    });
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [openFilters, setOpenFilters] = useState<string[]>([]);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);

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

    // Fetch initial filter data (brands/categories)
    useEffect(() => {
        if (initialBrands.length > 0 && initialCategories.length > 0) return;

        const fetchFilters = async () => {
            try {
                const [brandRes, catRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/brands`, { credentials: "include" }),
                    fetch(`${API_BASE_URL}/categories`, { credentials: "include" })
                ]);
                const brandData = await brandRes.json();
                const catData = await catRes.json();
                if (brandData.success) {
                    const activeBrands = brandData.data.filter((b: any) => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1');
                    setBrands(activeBrands);
                }
                if (catData.success) setCategories(catData.data);
            } catch (err) {
                console.error("Error fetching filters:", err);
            }
        };
        fetchFilters();
    }, [initialBrands, initialCategories]);

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
                if (activeFilters.brand) url += `&brand=${activeFilters.brand}`;
                if (activeFilters.sort) url += `&sort=${activeFilters.sort}`;
                if (activeFilters.minPrice) url += `&minPrice=${activeFilters.minPrice}`;
                if (activeFilters.maxPrice) url += `&maxPrice=${activeFilters.maxPrice}`;

                const res = await fetch(url, { credentials: "include" });
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();

                if (data.success && data.data.length > 0) {
                    setProducts(data.data);
                } else {
                    // Fallback: If no daily offers, fetch products with any discount
                    console.warn('No daily offers found, fetching generic discounted products...');
                    let fallbackUrl = `${API_BASE_URL}/products?limit=20&sort=newest`;
                    const fallbackRes = await fetch(fallbackUrl, { credentials: "include" });
                    const fallbackData = await fallbackRes.json();
                    if (fallbackData.success) {
                        setProducts(fallbackData.data);
                    }
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
        setActiveFilters(prev => ({
            ...prev,
            [type]: prev[type as keyof typeof prev] === value ? '' : value
        }));
    };

    const formatTime = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className={styles.offersContainer}>
            <PromoTicker />

            <div className={styles.mainLayout}>
                {/* Sidebar */}
                <div className={styles.sidebarWrapper}>
                    <DefaultShopFilter
                        inStockOnly={false}
                        setInStockOnly={() => { }}
                        brands={brands}
                        selectedBrands={activeFilters.brand ? [activeFilters.brand] : []}
                        handleBrandToggle={(brandSlug: string) => handleFilterChange('brand', brandSlug)}
                        allCategories={categories}
                        activeCategory={activeFilters.category}
                        minPrice={Number(priceRange.min) || 0}
                        setMinPrice={(val: number) => setPriceRange(prev => ({ ...prev, min: val.toString() }))}
                        maxPrice={Number(priceRange.max) || 0}
                        setMaxPrice={(val: number) => setPriceRange(prev => ({ ...prev, max: val.toString() }))}
                        resetFilters={() => {
                            setActiveFilters({ category: '', brand: '', sort: 'relevance', minPrice: '', maxPrice: '' });
                            setPriceRange({ min: '', max: '' });
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
                        />
                    </div>
                </div>

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
                            <div className={styles.sortLabel}>
                                <Filter size={18} fill="currentColor" />
                                <span>{t('sort')}</span>
                            </div>
                            <select
                                className={styles.sortSelect}
                                value={activeFilters.sort}
                                onChange={(e) => setActiveFilters(prev => ({ ...prev, sort: e.target.value }))}
                            >
                                <option value="relevance">{t('relevance')}</option>
                                <option value="price_asc">{t('priceLowHigh')}</option>
                                <option value="price_desc">{t('priceHighLow')}</option>
                                <option value="newest">{t('newestFirst')}</option>
                            </select>
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
                                            ? Number(product.price)
                                            : (Number(product.oldPrice || product.originalPrice) || 0),
                                        discount_percentage: product.discount_percentage,
                                        primary_image: product.primary_image || product.image_url || product.image,
                                        brand_name: product.brand_name || product.brand,
                                        brand_image: product.brand_image,
                                        slug: product.slug,
                                        stock_quantity: product.stock_quantity,
                                        is_best_seller: product.is_best_seller,
                                        offer_start: product.offer_start,
                                        offer_end: product.offer_end,
                                        average_rating: product.average_rating,
                                        total_reviews: product.total_reviews
                                    }}
                                    disableHover={true}
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
                                        setActiveFilters({ category: '', brand: '', sort: 'relevance', minPrice: '', maxPrice: '' });
                                        setPriceRange({ min: '', max: '' });
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
        </div >
    );
};

export default TodayOffersPage;
