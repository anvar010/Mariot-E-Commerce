'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import styles from './ShopLayout.module.css';
import { Filter, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import { API_BASE_URL, BASE_URL } from '@/config';
import Loader from '@/components/shared/Loader/Loader';
import ProductCardSkeleton from '@/components/shared/ProductCardPromotion/ProductCardSkeleton';
import { useTranslations, useLocale } from 'next-intl';

import DefaultShopFilter from '../Filters/DefaultShopFilter';
import FilterShopByBrand from '../Filters/FilterShopByBrand';
import FilterCategory from '../Filters/FilterCategory';

import { getChildCategories, getParentCategory, normalizeSlug } from '@/utils/shopCategories';

import ShopPagination from './ShopPagination';
import CategoryGrid from './CategoryGrid';
import BrandBio from './BrandBio';
import ShopBreadcrumbs from './ShopBreadcrumbs';

interface ShopLayoutProps {
    filterType?: 'default' | 'brand' | 'category';
    defaultCategory?: string;
    defaultSearchQuery?: string;
    hideCategoryGrid?: boolean;
    categoryNameOverride?: string;
    subCategoryOverride?: string;
    isFeatured?: boolean;
    initialProducts?: any[];
    initialBrands?: any[];
    initialTotal?: number;
    initialCategories?: any[];
}

const ShopLayout: React.FC<ShopLayoutProps> = ({
    filterType = 'default',
    defaultCategory,
    defaultSearchQuery,
    hideCategoryGrid = false,
    categoryNameOverride,
    subCategoryOverride,
    isFeatured,
    initialProducts = [],
    initialBrands = [],
    initialTotal = 0,
    initialCategories = []
}) => {
    const t = useTranslations('categories');
    const tc = useTranslations('categoryContent');
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeCategory = defaultCategory || searchParams.get('category')?.toLowerCase() || null;
    const brandParam = searchParams.get('brand');
    const searchQueryRaw = searchParams.get('search');
    const searchQuery = defaultSearchQuery || (searchQueryRaw ? searchQueryRaw.replace(/\+/g, ' ') : null);
    const isLimited = searchParams.get('limited') === 'true';
    const sellerParam = searchParams.get('seller');

    const [products, setProducts] = useState<any[]>(initialProducts);
    const [brands, setBrands] = useState<any[]>(initialBrands);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [fetchingProducts, setFetchingProducts] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [allCategories, setAllCategories] = useState<any[]>(initialCategories);
    const [totalProducts, setTotalProducts] = useState(initialTotal);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const [apiCategories, setApiCategories] = useState<any[]>(initialCategories);

    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [minPrice, setMinPrice] = useState<number>(0);
    const [maxPrice, setMaxPrice] = useState<number>(99999);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState<string>('relevance');
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const productsPerPage = 24;

    const locale = useLocale();
    const isArabic = locale === 'ar';

    useEffect(() => {
        if (brandParam) setSelectedBrands(brandParam.split(','));
        else setSelectedBrands([]);
    }, [brandParam]);

    useEffect(() => {
        if (!isSortOpen) return;
        const handler = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isSortOpen]);

    // Handle Scrolling sections moved to CategoryGrid.tsx

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
    };

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('127.0.0.1:5000')) {
            return url.replace('http://127.0.0.1:5000', BASE_URL);
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const getBrandDisplayName = () => {
        if (!brandParam) return null;
        if (!brandParam.includes(',')) {
            const found = brands.find(b => b.slug === brandParam);
            if (found) return isArabic && found.name_ar ? found.name_ar : found.name;
        }
        return brandParam.split(',').map(slug =>
            slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        ).join(', ');
    };

    const getFormattedCategoryName = () => {
        if (categoryNameOverride) return categoryNameOverride;
        if (searchQuery) return tc("search-results-for", { query: searchQuery });
        if (activeCategory) {
            if (tc.has(activeCategory)) return tc(activeCategory);
            if (t.has(activeCategory)) return t(activeCategory);
            return activeCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
        if (brandParam) return getBrandDisplayName() || '';
        if (sellerParam) {
            return products.length > 0 ? (products[0].seller_company || products[0].seller_name || 'Seller Store') : 'Seller Store';
        }
        return isLimited ? tc('limited-time-offers') : tc('all-products');
    };

    const formattedCategoryName = getFormattedCategoryName();

    const activeBrandInfo = brandParam ? brands.find((b: any) =>
        b.slug === brandParam ||
        b.name?.toLowerCase().replace(/ /g, '-') === brandParam
    ) : null;


    const targetCategoryForGrid = subCategoryOverride || activeCategory;


    const getApiParentCategory = (slug: string): string | null => {
        if (!slug || apiCategories.length === 0) return null;
        const matchedCategory = apiCategories.find((cat: any) => normalizeSlug(cat.slug) === normalizeSlug(slug) || normalizeSlug(cat.name) === normalizeSlug(slug));
        if (matchedCategory && matchedCategory.parent_id) {
            const parent = apiCategories.find((cat: any) => cat.id === matchedCategory.parent_id);
            return parent ? (parent.slug || normalizeSlug(parent.name)) : null;
        }
        return null;
    };

    const matchedCategoryForGrid = targetCategoryForGrid ? apiCategories.find((cat: any) => normalizeSlug(cat.slug) === normalizeSlug(targetCategoryForGrid) || normalizeSlug(cat.name) === normalizeSlug(targetCategoryForGrid)) : null;
    const subCategoriesToShow = matchedCategoryForGrid ? apiCategories.filter((cat: any) => (cat.parent_id == matchedCategoryForGrid.id) && cat.is_active) : [];

    const parentSlug = activeCategory ? (getApiParentCategory(activeCategory) || getParentCategory(activeCategory)) : null;

    const isInitialMount = React.useRef(true);

    useEffect(() => {
        if (isInitialMount.current && initialBrands.length > 0) return;
        const fetchBrands = async () => {
            try {
                const url = activeCategory ? `${API_BASE_URL}/brands?category=${activeCategory}` : `${API_BASE_URL}/brands`;
                const res = await fetch(url, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    const activeBrands = data.data.filter((b: any) => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1');
                    setBrands(activeBrands);
                }
            } catch (err) {
                console.error('Error fetching brands:', err);
            }
        };
        fetchBrands();
    }, [activeCategory, initialBrands.length]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setApiCategories(data.data);
                    // Filter to show only main categories in the sidebar by default
                    const mainCats = data.data.filter((c: any) => c.type === 'main_category' && c.is_active);
                    setAllCategories(mainCats);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        if (initialCategories.length === 0) {
            fetchCategories();
        }
    }, [initialCategories.length]);

    const fetchProducts = useCallback(async () => {
        setFetchingProducts(true);
        try {
            let url = `${API_BASE_URL}/products?page=${currentPage}&limit=${productsPerPage}`;
            if (activeCategory) url += `&category=${activeCategory}`;
            if (selectedBrands.length > 0) url += `&brand=${selectedBrands.join(',')}`;
            if (minPrice > 0) url += `&minPrice=${minPrice}`;
            if (maxPrice < 99999) url += `&maxPrice=${maxPrice}`;
            if (inStockOnly) url += `&status=active`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            if (isFeatured) url += `&is_featured=1`;
            if (isLimited) url += `&is_limited_offer=true`;
            if (sellerParam) url += `&seller=${sellerParam}`;
            if (sortBy === 'price_asc') url += `&sort=price_asc`;
            else if (sortBy === 'price_desc') url += `&sort=price_desc`;
            else if (sortBy === 'newest') url += `&sort=newest`;

            const res = await fetch(url, { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
                setTotalProducts(data.total);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
            setFetchingProducts(false);
        }
    }, [activeCategory, selectedBrands, minPrice, maxPrice, inStockOnly, sortBy, currentPage, searchQuery, isFeatured, isLimited, sellerParam]);

    useEffect(() => {
        if (isInitialMount.current && initialProducts.length > 0) {
            isInitialMount.current = false;
            return;
        }
        const timeoutId = setTimeout(() => fetchProducts(), 300);
        return () => clearTimeout(timeoutId);
    }, [fetchProducts, initialProducts.length]);

    const resetFilters = () => {
        setSelectedBrands([]);
        setMinPrice(0);
        setMaxPrice(99999);
        setInStockOnly(false);
        setSortBy('relevance');
        handlePageChange(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('page', page.toString());
        router.push(`/shop?${newParams.toString()}`, { scroll: false });
    };

    // Effect to sync currentPage with URL (e.g., when clicking browser back button)
    useEffect(() => {
        const pageFromUrl = Number(searchParams.get('page')) || 1;
        if (pageFromUrl !== currentPage) {
            setCurrentPage(pageFromUrl);
        }
    }, [searchParams]);

    const getSortLabel = (key: string) => {
        const labels: { [key: string]: string } = {
            'relevance': tc('relevance'),
            'best_seller': tc('best-seller'),
            'best_offer': tc('best-offer'),
            'price_asc': tc('price-low-to-high'),
            'price_desc': tc('price-high-to-low')
        };
        return labels[key] || tc('relevance');
    };

    const handleCategoryChange = (slug: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        if (!slug) newParams.delete('category');
        else newParams.set('category', slug);
        router.push(`/shop?${newParams.toString()}`);
    };

    const renderSidebar = () => {
        const commonProps = {
            inStockOnly, setInStockOnly, brands, selectedBrands,
            handleBrandToggle: (slug: string) => setSelectedBrands(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]),
            allCategories, activeCategory, minPrice, setMinPrice, maxPrice, setMaxPrice,
            resetFilters, toggleSection, expandedSections, onCategoryChange: handleCategoryChange
        };
        if (filterType === 'brand') return <FilterShopByBrand {...commonProps} />;
        if (filterType === 'category') return <FilterCategory {...commonProps} />;
        return <DefaultShopFilter {...commonProps} enableBrandFilter={!brandParam} />;
    };

    if (loading) return <div style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>;

    return (
        <div className={styles.shopLayout}>
            {brandParam && activeBrandInfo?.banner_url && (
                <div className={styles.brandBanner}>
                    <img
                        src={resolveUrl(activeBrandInfo.banner_url)}
                        alt={getBrandDisplayName() || ""}
                        className={styles.brandBannerImg}
                    />
                </div>
            )}
            <div className={styles.topInfo}>
                <ShopBreadcrumbs
                    parentSlug={parentSlug}
                    brandParam={brandParam}
                    activeCategory={activeCategory}
                    formattedCategoryName={formattedCategoryName}
                    t={t}
                    tc={tc}
                />
                <h1 className={styles.mainTitle}>{formattedCategoryName}</h1>
            </div>
            <div className={styles.container}>
                <div className={`${styles.sidebar} ${isMobileFilterOpen ? styles.sidebarOpen : ''}`}>
                    <div className={styles.mobileFilterHeader}>
                        <h3>{tc('filters')}</h3>
                        <button onClick={() => setIsMobileFilterOpen(false)}><X size={24} /></button>
                    </div>
                    {renderSidebar()}
                </div>

                {isMobileFilterOpen && <div className={styles.filterOverlay} onClick={() => setIsMobileFilterOpen(false)} />}

                <main className={styles.content}>
                    {!hideCategoryGrid && <CategoryGrid subCategoriesToShow={subCategoriesToShow} t={t} tc={tc} />}

                    <div className={styles.resultsHeader}>
                        <span className={styles.resultsCount}>
                            {formattedCategoryName}: {totalProducts} {tc("results-found")}
                            {fetchingProducts && <span style={{ marginInlineStart: '10px', fontSize: '12px', color: '#666' }}> ({tc('updating')})</span>}
                        </span>
                        <div className={styles.sortContainer}>
                            <button className={styles.mobileFilterToggle} onClick={() => setIsMobileFilterOpen(true)}>
                                <Filter size={20} /><span>{tc("filters")}</span>
                            </button>
                            <div className={styles.sortLabel}>
                                <Filter size={20} fill="#333" className={styles.desktopOnly} /><span className={styles.desktopOnly}>{tc("sort")}</span>
                            </div>
                            <div ref={sortRef} className={styles.sortDropdown} onClick={() => setIsSortOpen(!isSortOpen)}>
                                <span>{getSortLabel(sortBy)}</span>
                                <ChevronDown size={16} className={isSortOpen ? styles.rotateIcon : ''} />
                                {isSortOpen && (
                                    <div className={styles.dropdownContent}>
                                        <div onClick={() => { setSortBy('relevance'); setIsSortOpen(false); }}>{tc("relevance")}</div>
                                        <div onClick={() => { setSortBy('best_offer'); setIsSortOpen(false); }}>{tc("best-offer")}</div>
                                        <div onClick={() => { setSortBy('price_asc'); setIsSortOpen(false); }}>{tc("price-low-to-high")}</div>
                                        <div onClick={() => { setSortBy('price_desc'); setIsSortOpen(false); }}>{tc("price-high-to-low")}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.productGrid}>
                        {fetchingProducts ? (
                            Array(12).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
                        ) : products.length > 0 ? (
                            products.map((p) => (
                                <ProductCardPromotion
                                    key={p.id}
                                    product={{ ...p, price: Number(p.offer_price) > 0 ? Number(p.offer_price) : Number(p.price), old_price: Number(p.offer_price) > 0 ? Number(p.price) : (Number(p.old_price) || Number(p.originalPrice) || 0) }}
                                />
                            ))
                        ) : (
                            <div className={styles.noResults}><h3>{tc("no-products-found")}</h3></div>
                        )}
                    </div>

                    <ShopPagination
                        currentPage={currentPage}
                        totalProducts={totalProducts}
                        productsPerPage={productsPerPage}
                        onPageChange={handlePageChange}
                    />

                    <BrandBio activeBrandInfo={activeBrandInfo} isArabic={isArabic} resolveUrl={resolveUrl} />
                </main>
            </div>
        </div>
    );
};

export default ShopLayout;

