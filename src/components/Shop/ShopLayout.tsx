'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import styles from './ShopLayout.module.css';
import { Filter, ChevronDown, ChevronLeft, ChevronRight, X, ListFilter } from 'lucide-react';
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

// Scoped, title/description-based filters for specific categories.
// (Products aren't sub-categorised, so we match on the product name + description.)
const hasShelf = (text: string) => /\bshel(f|ves|ve)\b/.test(text);
const hasOverShelf = (text: string) => /over[\s-]*shel(f|ves|ve)/.test(text);
type TitleFilter = { key: string; label: string; label_ar: string; test: (text: string) => boolean };
const CATEGORY_TITLE_FILTERS: Record<string, TitleFilter[]> = {
    'work-tables': [
        { key: 'shelves', label: 'Shelves', label_ar: 'أرفف', test: (t) => hasShelf(t) || hasOverShelf(t) },
        // A single shelf: has a shelf, but not an over-shelf and not both a middle AND bottom shelf.
        { key: 'single-shelve', label: 'Single Shelve', label_ar: 'رف واحد', test: (t) => hasShelf(t) && !hasOverShelf(t) && !(t.includes('middle') && t.includes('bottom')) },
        { key: 'no-shelve', label: 'No Shelve', label_ar: 'بدون رف', test: (t) => !hasShelf(t) && !hasOverShelf(t) },
        { key: 'over-shelves', label: 'Worktable with Over Shelves', label_ar: 'طاولة عمل مع رفوف علوية', test: (t) => hasOverShelf(t) },
    ],
    'cabinet': [
        { key: 'wall-cabinet', label: 'Wall Cabinet', label_ar: 'خزانة جدارية', test: (t) => /wall[\s-]*cabinet/.test(t) },
        { key: 'base-cabinet', label: 'Base Cabinet', label_ar: 'خزانة سفلية', test: (t) => /base[\s-]*cabinet/.test(t) },
        { key: 'corner-cabinet', label: 'Corner Cabinet', label_ar: 'خزانة زاوية', test: (t) => /corner/.test(t) },
    ],
};

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
    const pathname = usePathname();
    const activeCategory = defaultCategory || searchParams.get('category')?.toLowerCase() || null;
    const brandParam = searchParams.get('brand');
    const searchQueryRaw = searchParams.get('search');
    const searchQuery = defaultSearchQuery || (searchQueryRaw ? searchQueryRaw.replace(/\+/g, ' ') : null);
    const isLimited = searchParams.get('limited') === 'true';
    const isWeekly = searchParams.get('weekly') === 'true';
    const sellerParam = searchParams.get('seller');

    const [products, setProducts] = useState<any[]>(initialProducts);
    const [brands, setBrands] = useState<any[]>(initialBrands);
    const [didYouMean, setDidYouMean] = useState<string | null>(null);
    const [loading, setLoading] = useState(initialProducts.length === 0);
    const [fetchingProducts, setFetchingProducts] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
    const mobileSortRef = useRef<HTMLDivElement>(null);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [allCategories, setAllCategories] = useState<any[]>(
        initialCategories.filter((c: any) => c.type === 'main_category' && c.is_active)
    );
    const [brandCategories, setBrandCategories] = useState<any[]>([]);
    const [totalProducts, setTotalProducts] = useState(initialTotal);
    const [expandedSections, setExpandedSections] = useState<string[]>(['brand', 'price', 'categories', 'extrafilter']);
    const [apiCategories, setApiCategories] = useState<any[]>(initialCategories);

    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [selectedTitleFilters, setSelectedTitleFilters] = useState<string[]>([]);
    const [minPrice, setMinPrice] = useState<number>(0);
    const [maxPrice, setMaxPrice] = useState<number>(99999);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState<string>(
        ['price_asc', 'price_desc', 'newest', 'best_offer'].includes(searchParams.get('sort') || '')
            ? (searchParams.get('sort') as string)
            : 'relevance'
    );
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const productsPerPage = 24;

    const locale = useLocale();
    const isArabic = locale === 'ar';

    // Scoped title/description filter for certain categories (Work Tables, Cabinet).
    // Kept in local state (like the brand/price filters) so toggling applies in place
    // without a route change — i.e. no scroll-to-top jump.
    const activeTitleFilters = (activeCategory && CATEGORY_TITLE_FILTERS[activeCategory]) || null;
    const hasTitleFilter = !!activeTitleFilters;
    const titleFilterKeys = hasTitleFilter ? selectedTitleFilters : [];

    useEffect(() => {
        if (brandParam) setSelectedBrands(brandParam.split(','));
        else setSelectedBrands([]);
    }, [brandParam]);

    // Clear the scoped type filter when switching categories
    useEffect(() => {
        setSelectedTitleFilters([]);
    }, [activeCategory]);

    useEffect(() => {
        if (!isSortOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node))
                setIsSortOpen(false);
        };
        const handleScroll = () => setIsSortOpen(false);
        document.addEventListener('mousedown', handleClick);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isSortOpen]);

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
        if (isWeekly) return tc('weekly-deals');
        if (isLimited) return tc('limited-time-offers');
        if (brandParam) return getBrandDisplayName() || '';
        if (activeCategory) {
            // Prefer the real category name (Arabic when the site is Arabic) from the API,
            // not a title-cased slug — otherwise admin-set name_ar never shows.
            const cat = apiCategories.find((c: any) =>
                normalizeSlug(c.slug) === normalizeSlug(activeCategory) || normalizeSlug(c.name) === normalizeSlug(activeCategory));
            if (cat) return (isArabic && cat.name_ar) ? cat.name_ar : cat.name;
            if (tc.has(activeCategory)) return tc(activeCategory);
            if (t.has(activeCategory)) return t(activeCategory);
            return activeCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
        if (sellerParam) {
            return products.length > 0 ? (products[0].seller_company || products[0].seller_name || 'Seller Store') : 'Seller Store';
        }
        return tc('all-products');
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
    // Localized parent name for the breadcrumb (so admin-set name_ar shows in Arabic).
    const parentCat = parentSlug ? apiCategories.find((c: any) =>
        normalizeSlug(c.slug) === normalizeSlug(parentSlug) || normalizeSlug(c.name) === normalizeSlug(parentSlug)) : null;
    const parentName = parentCat ? ((isArabic && parentCat.name_ar) ? parentCat.name_ar : parentCat.name) : null;

    const isInitialMount = React.useRef(true);

    useEffect(() => {
        if (isInitialMount.current && initialBrands.length > 0 && !searchQuery && !isLimited && !isWeekly) return;
        const fetchBrands = async () => {
            try {
                let url = `${API_BASE_URL}/brands?`;
                if (activeCategory) url += `category=${activeCategory}&`;
                if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
                if (isLimited) url += `is_limited=true&`;
                if (isWeekly) url += `is_weekly=true&`;

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
    }, [activeCategory, searchQuery, isLimited, isWeekly, initialBrands.length]);

    useEffect(() => {
        if (!brandParam) { setBrandCategories([]); return; }
        fetch(`${API_BASE_URL}/categories?brand=${encodeURIComponent(brandParam)}`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setBrandCategories(data.data.filter((c: any) => c.is_active));
                }
            })
            .catch(() => { });
    }, [brandParam]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                let catUrl = `${API_BASE_URL}/categories`;
                const catParams = new URLSearchParams();
                if (isLimited) catParams.set('is_limited', 'true');
                if (isWeekly) catParams.set('is_weekly', 'true');
                if (searchQuery) catParams.set('search', searchQuery);
                if (catParams.toString()) catUrl += `?${catParams.toString()}`;
                const res = await fetch(catUrl, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setApiCategories(data.data);
                    const mainCats = data.data.filter((c: any) => c.type === 'main_category' && c.is_active);
                    setAllCategories(mainCats);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, [isLimited, isWeekly, searchQuery]);

    const fetchProducts = useCallback(async () => {
        setFetchingProducts(true);
        try {
            // For title/description-filtered categories we filter client-side, so pull
            // the whole category in one page to keep filtering + pagination accurate.
            const fetchAll = !!(activeCategory && CATEGORY_TITLE_FILTERS[activeCategory]);
            let url = `${API_BASE_URL}/products?page=${fetchAll ? 1 : currentPage}&limit=${fetchAll ? 1000 : productsPerPage}`;
            if (activeCategory) url += `&category=${activeCategory}`;
            if (selectedBrands.length > 0) url += `&brand=${selectedBrands.join(',')}`;
            if (minPrice > 0) url += `&minPrice=${minPrice}`;
            if (maxPrice < 99999) url += `&maxPrice=${maxPrice}`;
            if (inStockOnly) url += `&stockStatus=in_stock`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            if (isFeatured) url += `&is_featured=1`;
            if (isLimited) url += `&is_limited_offer=true`;
            if (isWeekly) url += `&is_weekly_deal=true`;
            if (sellerParam) url += `&seller=${sellerParam}`;
            if (sortBy === 'price_asc') url += `&sort=price_asc`;
            else if (sortBy === 'price_desc') url += `&sort=price_desc`;
            else if (sortBy === 'newest') url += `&sort=newest`;

            const res = await fetch(url, { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
                setTotalProducts(data.total);
                setDidYouMean(data.didYouMean || null);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
            setFetchingProducts(false);
        }
    }, [activeCategory, selectedBrands, minPrice, maxPrice, inStockOnly, sortBy, currentPage, searchQuery, isFeatured, isLimited, isWeekly, sellerParam]);

    useEffect(() => {
        if (isInitialMount.current && initialProducts.length > 0) {
            isInitialMount.current = false;
            return;
        }
        const timeoutId = setTimeout(() => fetchProducts(), 300);
        return () => clearTimeout(timeoutId);
    }, [fetchProducts, initialProducts.length]);

    const resetFilters = () => {
        setMinPrice(0);
        setMaxPrice(99999);
        setInStockOnly(false);
        setSortBy('relevance');
        setSelectedTitleFilters([]);
        setSelectedBrands(brandParam ? brandParam.split(',') : []);
        const newParams = new URLSearchParams();
        if (brandParam) newParams.set('brand', brandParam);
        if (isLimited) newParams.set('limited', 'true');
        if (isWeekly) newParams.set('weekly', 'true');
        if (searchQueryRaw) newParams.set('search', searchQueryRaw);
        if (activeCategory) newParams.set('category', activeCategory);
        router.push(`${pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`, { scroll: false });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('page', page.toString());
        router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
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
        newParams.delete('page');
        router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    };

    // Local-state toggle (no navigation) so the list updates in place. We also pin the
    // viewport: shrinking the result set makes the page shorter, which otherwise snaps
    // the scroll position up to the top — applying a filter should stay put.
    const toggleTitleFilter = (key: string) => {
        const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
        setSelectedTitleFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
        setCurrentPage(1);
        if (typeof window !== 'undefined') {
            requestAnimationFrame(() => window.scrollTo(0, scrollY));
        }
    };

    const renderSidebar = () => {
        const commonProps = {
            inStockOnly, setInStockOnly, brands, selectedBrands,
            handleBrandToggle: (slug: string) => {
                setSelectedBrands(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
                setIsMobileFilterOpen(false);
            },
            allCategories, brandCategories, subCategories: subCategoriesToShow, activeCategory, minPrice, setMinPrice, maxPrice, setMaxPrice,
            resetFilters, toggleSection, expandedSections,
            onCategoryChange: (slug: string) => { handleCategoryChange(slug); setIsMobileFilterOpen(false); },
            // Scoped title/description filter options (Work Tables / Cabinet)
            ...(activeTitleFilters ? {
                extraFilterTitle: isArabic ? 'النوع' : 'Type',
                extraFilterOptions: activeTitleFilters.map(f => ({ key: f.key, label: isArabic ? f.label_ar : f.label })),
                selectedExtraFilters: titleFilterKeys,
                onExtraFilterToggle: (key: string) => { toggleTitleFilter(key); setIsMobileFilterOpen(false); },
            } : {}),
        };
        if (brandParam) return <FilterShopByBrand {...commonProps} />;
        if (searchQuery) return <DefaultShopFilter {...commonProps} />;
        if (isWeekly || isLimited) return <DefaultShopFilter {...commonProps} />;
        if (activeCategory) {
            const isMainCategory = !matchedCategoryForGrid?.parent_id;
            if (isMainCategory && subCategoriesToShow.length > 0) return <FilterCategory {...commonProps} />;
            // Keep the category list in the filter so users can switch categories in place
            // (without it, selecting a category hides the list and feels like a page change).
            return <DefaultShopFilter {...commonProps} />;
        }
        return <DefaultShopFilter {...commonProps} />;
    };

    // Apply the scoped title/description filter (client-side) and paginate the result
    // locally. For every other listing the server already filtered + paged.
    const activeSelectedFilters = activeTitleFilters ? activeTitleFilters.filter(f => titleFilterKeys.includes(f.key)) : [];
    const filteredProducts = (hasTitleFilter && activeSelectedFilters.length > 0)
        ? products.filter(p => {
            const text = `${p.name || ''} ${p.description || ''}`.toLowerCase();
            return activeSelectedFilters.some(f => f.test(text));
        })
        : products;
    const effectiveTotal = hasTitleFilter ? filteredProducts.length : totalProducts;
    const displayedProducts = hasTitleFilter
        ? filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
        : filteredProducts;

    if (loading) return <div style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>;

    return (
        <div className={styles.shopLayout}>
            {brandParam && (isArabic && activeBrandInfo?.banner_url_ar ? activeBrandInfo.banner_url_ar : activeBrandInfo?.banner_url) && (
                <div className={styles.brandBanner}>
                    <img src={resolveUrl(isArabic && activeBrandInfo?.banner_url_ar ? activeBrandInfo.banner_url_ar : activeBrandInfo.banner_url)} alt={getBrandDisplayName() || ""} className={styles.brandBannerImg} />
                </div>
            )}
            {!brandParam && activeCategory && (isArabic && matchedCategoryForGrid?.banner_url_ar ? matchedCategoryForGrid.banner_url_ar : matchedCategoryForGrid?.banner_url) && (
                <div className={styles.categoryBanner}>
                    <img src={resolveUrl(isArabic && matchedCategoryForGrid?.banner_url_ar ? matchedCategoryForGrid.banner_url_ar : matchedCategoryForGrid.banner_url)} alt={formattedCategoryName} className={styles.categoryBannerImg} />
                </div>
            )}
            <div className={styles.topInfo}>
                <div className={styles.headerFlex}>
                    <div className={styles.breadcrumbColumn}>
                        <ShopBreadcrumbs
                            parentSlug={parentSlug}
                            parentName={parentName}
                            brandParam={brandParam}
                            activeCategory={activeCategory}
                            formattedCategoryName={formattedCategoryName}
                            t={t}
                            tc={tc}
                        />
                    </div>
                    {brandParam && !activeCategory && brandCategories.length > 0 && (
                        <div className={styles.headingColumn}>
                            <h2 className={styles.brandCatHeading}>{tc('shop-by-category')}</h2>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.container}>
                <div className={`${styles.sidebar} ${isMobileFilterOpen ? styles.sidebarOpen : ''}`}>
                    <div className={styles.mobileFilterHeader}>
                        <h3>{tc('filters')}</h3>
                        <button onClick={() => setIsMobileFilterOpen(false)}><X size={24} /></button>
                    </div>
                    <h1 className={styles.mainTitle}>{formattedCategoryName}</h1>
                    {renderSidebar()}
                </div>

                {isMobileFilterOpen && <div className={styles.filterOverlay} onClick={() => setIsMobileFilterOpen(false)} />}

                <main className={styles.content}>
                    {brandParam && !activeCategory && brandCategories.length > 0 && (
                        <div className={styles.brandCatRow}>
                            {[...brandCategories]
                                .sort((a: any, b: any) => {
                                    // Main categories first, then each main's subcategories grouped after it
                                    const aRoot = a.parent_id ? a.parent_id : a.id;
                                    const bRoot = b.parent_id ? b.parent_id : b.id;
                                    if (aRoot !== bRoot) return aRoot - bRoot;
                                    return (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0);
                                })
                                .map((cat: any, idx: number) => {
                                    const catName = isArabic && cat.name_ar ? cat.name_ar : cat.name;
                                    const slug = cat.slug || cat.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                                    const catImg = isArabic && cat.image_url_ar ? cat.image_url_ar : cat.image_url;
                                    const imgSrc = catImg ? resolveUrl(catImg) : '/assets/mariot-logo2.webp';
                                    return (
                                        <Link
                                            key={cat.id ?? idx}
                                            href={`/shop?brand=${brandParam}&category=${slug}`}
                                            className={styles.brandCatItem}
                                        >
                                            <div className={styles.brandCatCircle}>
                                                <img
                                                    src={imgSrc}
                                                    alt={catName}
                                                    className={styles.brandCatImg}
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/mariot-logo2.webp'; }}
                                                />
                                            </div>
                                            <span className={styles.brandCatName}>{catName}</span>
                                        </Link>
                                    );
                                })}
                        </div>
                    )}
                    {!hideCategoryGrid && !brandParam && (!searchParams.get('category') || subCategoriesToShow.length > 0) && <CategoryGrid subCategoriesToShow={subCategoriesToShow} t={t} tc={tc} brandParam={brandParam} />}



                    <div className={styles.resultsHeader}>
                        <span className={styles.resultsCount}>
                            <div>{formattedCategoryName}: {effectiveTotal} {tc("results-found")}
                                {fetchingProducts && <span style={{ marginInlineStart: '10px', fontSize: '12px', color: '#666' }}> ({tc('updating')})</span>}</div>
                            {didYouMean && totalProducts === 0 && (
                                <div style={{ marginTop: '10px', color: '#2563eb', cursor: 'pointer', fontSize: '16px' }} onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set('search', didYouMean);
                                    router.push(`${pathname}?${params.toString()}`);
                                }}>
                                    Did you mean: <strong style={{ textDecoration: 'underline' }}>{didYouMean}</strong>?
                                </div>
                            )}
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
                        ) : displayedProducts.length > 0 ? (
                            displayedProducts.map((p) => (
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
                        totalProducts={effectiveTotal}
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

