'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import styles from './ShopLayout.module.css';
import { Filter, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCardPromotion from '@/components/shared/ProductCardPromotion/ProductCardPromotion';
import { API_BASE_URL, BASE_URL } from '@/config';
import Loader from '@/components/shared/Loader/Loader';
import ProductCardSkeleton from '@/components/shared/ProductCardPromotion/ProductCardSkeleton';
import { useTranslations, useLocale } from 'next-intl';

import DefaultShopFilter from '../Filters/DefaultShopFilter';
import FilterShopByBrand from '../Filters/FilterShopByBrand';
import FilterCategory from '../Filters/FilterCategory';

import { getChildCategories, getParentCategory } from '@/utils/shopCategories';

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
    const [allCategories, setAllCategories] = useState<any[]>(initialCategories);
    const [totalProducts, setTotalProducts] = useState(initialTotal);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [scrollLeftState, setScrollLeftState] = React.useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeftState(scrollContainerRef.current.scrollLeft);
        e.preventDefault();
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.1;
        scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
    };

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    // Toggle filter sections
    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
    };

    // Filter states
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

    // Initialize brand from URL
    useEffect(() => {
        if (brandParam) {
            setSelectedBrands(brandParam.split(','));
        } else {
            setSelectedBrands([]);
        }
    }, [brandParam]);
    const [minPrice, setMinPrice] = useState<number>(0);
    const [maxPrice, setMaxPrice] = useState<number>(99999);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState<string>('relevance');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 24;

    const locale = useLocale();
    const isArabic = locale === 'ar';

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('localhost:5000')) {
            return url.replace('http://localhost:5000', BASE_URL);
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const getBrandDisplayName = () => {
        if (!brandParam) return null;

        // Single brand case
        if (!brandParam.includes(',')) {
            const found = brands.find(b => b.slug === brandParam);
            if (found) {
                return isArabic && found.name_ar ? found.name_ar : found.name;
            }
        }

        // Multiple brands or not found in list yet
        return brandParam.split(',').map(slug =>
            slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        ).join(', ');
    };

    const formattedCategoryName = categoryNameOverride
        ? categoryNameOverride
        : (searchQuery
            ? tc("search-results-for", { query: searchQuery })
            : (activeCategory
                ? (tc.has(activeCategory) ? tc(activeCategory) : (t.has(activeCategory) ? t(activeCategory) : activeCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')))
                : (brandParam
                    ? getBrandDisplayName()
                    : (sellerParam
                        ? (products.length > 0 ? (products[0].seller_company || products[0].seller_name || 'Seller Store') : 'Seller Store')
                        : (isLimited ? tc('limited-time-offers') : tc('all-products'))))));

    const activeBrandInfo = brandParam ? brands.find((b: any) =>
        b.slug === brandParam ||
        b.name?.toLowerCase().replace(/ /g, '-') === brandParam
    ) : null;

    // Get child categories for the top grid
    const targetCategoryForGrid = subCategoryOverride || activeCategory;
    const subCategoriesToShow = targetCategoryForGrid ? getChildCategories(targetCategoryForGrid) : [];
    const parentSlug = activeCategory ? getParentCategory(activeCategory) : null;

    const isInitialMount = React.useRef(true);

    // Fetch Brands for this category
    useEffect(() => {
        if (isInitialMount.current && initialBrands.length > 0) {
            // isInitialMount will be set to false in the products effect
            return;
        }

        const fetchBrands = async () => {
            try {
                const url = activeCategory
                    ? `${API_BASE_URL}/brands?category=${activeCategory}`
                    : `${API_BASE_URL}/brands`;
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

    // Fetch All Categories
    useEffect(() => {
        if (initialCategories.length > 0) return;

        const fetchCategories = async () => {
            try {
                // We use the new requested list of categories
                const requestedCategories = [
                    "Coffee Makers", "Ice Equipment", "Cooking Equipment", "Refrigeration", "Beverage Equipment", "Commercial Ovens", "Food Preparation", "Food Holding and Warming Line", "Delivery and Storage", "Parts", "Used Equipment", "Dishwashing", "Stainless Steel Equipment", "Janitorial & Safety Supplies", "Water Treatment", "Home Use", "Dining Room", "Smallwares", "Disposables", "Food & Beverage Ingredients"
                ].map(name => {
                    const slug = name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/,/g, '');
                    return {
                        name: t(slug),
                        slug
                    };
                });

                const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include" });
                const data = await res.json();
                if (data.success && data.data.length > 0) {
                    setAllCategories(requestedCategories);
                } else {
                    setAllCategories(requestedCategories);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                const requestedCategories = [
                    "Coffee Makers", "Ice Equipment", "Cooking Equipment", "Refrigeration", "Beverage Equipment", "Commercial Ovens", "Food Preparation", "Food Holding and Warming Line", "Delivery and Storage", "Parts", "Used Equipment", "Dishwashing", "Stainless Steel Equipment", "Janitorial & Safety Supplies", "Water Treatment", "Home Use", "Dining Room", "Smallwares", "Disposables", "Food & Beverage Ingredients"
                ].map(name => {
                    const slug = name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/,/g, '');
                    return {
                        name: t(slug),
                        slug
                    };
                });
                setAllCategories(requestedCategories);
            }
        };
        fetchCategories();
    }, [initialCategories.length, t]);

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

            // Handle Sorting
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
    }, [activeCategory, selectedBrands, minPrice, maxPrice, inStockOnly, sortBy, currentPage, searchQuery, isFeatured, isLimited]);

    // Fetch Products on filter change
    useEffect(() => {
        if (isInitialMount.current && initialProducts.length > 0) {
            isInitialMount.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [fetchProducts, initialProducts.length]);

    const handleBrandToggle = (brandSlug: string) => {
        setSelectedBrands(prev =>
            prev.includes(brandSlug)
                ? prev.filter(s => s !== brandSlug)
                : [...prev, brandSlug]
        );
    };

    const resetFilters = () => {
        setSelectedBrands([]);
        setMinPrice(0);
        setMaxPrice(99999);
        setInStockOnly(false);
        setSortBy('relevance');
        setCurrentPage(1);
    };

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
        if (!slug) {
            newParams.delete('category');
        } else {
            newParams.set('category', slug);
        }
        router.push(`/shop?${newParams.toString()}`);
    };

    const renderSidebar = () => {
        const commonProps = {
            inStockOnly,
            setInStockOnly,
            brands,
            selectedBrands,
            handleBrandToggle,
            allCategories,
            activeCategory,
            minPrice,
            setMinPrice,
            maxPrice,
            setMaxPrice,
            resetFilters,
            toggleSection,
            expandedSections,
            onCategoryChange: handleCategoryChange
        };

        if (filterType === 'brand') {
            return <FilterShopByBrand {...commonProps} />;
        }
        if (filterType === 'category') {
            return <FilterCategory {...commonProps} />;
        }
        // Default: If filtering by brand via URL, hide Brand filter section
        return <DefaultShopFilter {...commonProps} enableBrandFilter={!brandParam} />;
    };

    if (loading) return <div style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>;

    return (
        <div className={styles.shopLayout}>
            {brandParam && activeBrandInfo && (
                <div className={styles.brandBanner}>
                    <img
                        src={resolveUrl(activeBrandInfo.banner || activeBrandInfo.image) || 'https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=1600&auto=format&fit=crop'}
                        alt={getBrandDisplayName() || ""}
                        className={styles.brandBannerImg}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=1600&auto=format&fit=crop';
                        }}
                    />
                </div>
            )}
            <div className={styles.topInfo}>
                <div className={styles.breadcrumbs}>
                    <Link href="/">{tc("home")}</Link>
                    {parentSlug && (
                        <>
                            <span className={styles.separator}>/</span>
                            <span>{t.has(parentSlug) ? t(parentSlug) : (tc.has(parentSlug) ? tc(parentSlug) : parentSlug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))}</span>
                        </>
                    )}
                    {brandParam && !activeCategory && (
                        <>
                            <span className={styles.separator}>/</span>
                            <Link href="/shop-by-brands">{tc("shop-by-brand")}</Link>
                        </>
                    )}
                    <span className={styles.separator}>/</span>
                    <span className={styles.activeBreadcrumb}>{formattedCategoryName}</span>
                </div>
                <h1 className={styles.mainTitle}>{formattedCategoryName}</h1>
            </div>
            <div className={styles.container}>
                {/* Sidebar Filters */}
                {renderSidebar()}

                {/* Main Content */}
                <main className={styles.content}>
                    {/* Top Category Grid - Subcategories of current category */}
                    {!hideCategoryGrid && subCategoriesToShow.length > 0 && (
                        <div className={styles.categoryGridWrapper}>
                            <button className={styles.scrollBtn} onClick={scrollLeft} aria-label="Scroll left">
                                <ChevronLeft size={24} />
                            </button>
                            <div
                                className={styles.categoryGrid}
                                ref={scrollContainerRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            >
                                {subCategoriesToShow.map((catName: string, idx: number) => {
                                    const slug = catName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                                    return (
                                        <Link
                                            href={`/shop?category=${slug}`}
                                            key={idx}
                                            className={styles.categoryCard}
                                        >
                                            <div className={styles.categoryImage}>
                                                <img
                                                    src="/assets/placeholder-image.webp"
                                                    alt={t.has(slug) ? t(slug) : (tc.has(slug) ? tc(slug) : catName)}
                                                    className={styles.demoImg}
                                                />
                                            </div>
                                            <p>{t.has(slug) ? t(slug) : (tc.has(slug) ? tc(slug) : catName)}</p>
                                        </Link>
                                    );
                                })}
                            </div>
                            <button className={styles.scrollBtn} onClick={scrollRight} aria-label="Scroll right">
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    )}

                    {/* Results Count & Sort */}
                    <div className={styles.resultsHeader}>
                        <span className={styles.resultsCount}>
                            {formattedCategoryName}: {totalProducts} {tc("results-found")}
                            {fetchingProducts && <span style={{ marginInlineStart: '10px', fontSize: '12px', color: '#666' }}> ({tc('updating')})</span>}
                        </span>
                        <div className={styles.sortContainer}>
                            <div className={styles.sortLabel}>
                                <Filter size={20} fill="#333" />
                                <span>{tc("sort")}</span>
                            </div>
                            <div className={styles.sortDropdown} onClick={() => setIsSortOpen(!isSortOpen)}>
                                <span>{getSortLabel(sortBy)}</span>
                                <ChevronDown size={16} className={isSortOpen ? styles.rotateIcon : ''} />

                                {isSortOpen && (
                                    <div className={styles.dropdownContent}>
                                        <div onClick={() => setSortBy('relevance')}>{tc("relevance")}</div>
                                        <div onClick={() => setSortBy('best_offer')}>{tc("best-offer")}</div>
                                        <div onClick={() => setSortBy('price_asc')}>{tc("price-low-to-high")}</div>
                                        <div onClick={() => setSortBy('price_desc')}>{tc("price-high-to-low")}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className={styles.productGrid}>
                        {fetchingProducts ? (
                            Array(12).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
                        ) : products.length > 0 ? (
                            products.map((p) => (
                                <ProductCardPromotion
                                    key={p.id}
                                    product={{
                                        ...p,
                                        price: Number(p.offer_price) > 0 ? Number(p.offer_price) : Number(p.price),
                                        old_price: Number(p.offer_price) > 0 ? Number(p.price) : (Number(p.old_price) || Number(p.originalPrice) || 0)
                                    }}
                                />
                            ))
                        ) : (
                            <div className={styles.noResults}>
                                <h3>{tc("no-products-found")}</h3>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalProducts > productsPerPage && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => {
                                    setCurrentPage(p => Math.max(1, p - 1));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage === 1}
                                className={styles.arrowBtn}
                            >
                                <ChevronLeft size={20} />
                            </button>

                            {/* Show truncated page numbers */}
                            {(() => {
                                const totalPages = Math.ceil(totalProducts / productsPerPage);
                                const pages = [];

                                // Logic to decide which page numbers to show
                                if (totalPages <= 7) {
                                    // Show all pages if there are few
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    // Always show first page
                                    pages.push(1);

                                    if (currentPage > 3) {
                                        pages.push('...');
                                    }

                                    // Show pages around current
                                    const start = Math.max(2, currentPage - 1);
                                    const end = Math.min(totalPages - 1, currentPage + 1);

                                    for (let i = start; i <= end; i++) {
                                        if (!pages.includes(i)) pages.push(i);
                                    }

                                    if (currentPage < totalPages - 2) {
                                        pages.push('...');
                                    }

                                    // Always show last page
                                    if (!pages.includes(totalPages)) pages.push(totalPages);
                                }

                                return pages.map((num, idx) => (
                                    num === '...' ? (
                                        <span key={`dots-${idx}`} className={styles.paginationDots}>...</span>
                                    ) : (
                                        <button
                                            key={num}
                                            onClick={() => {
                                                setCurrentPage(num as number);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className={`${styles.numBtn} ${currentPage === num ? styles.activePage : ''}`}
                                        >
                                            {num}
                                        </button>
                                    )
                                ));
                            })()}

                            <button
                                onClick={() => {
                                    setCurrentPage(p => Math.min(Math.ceil(totalProducts / productsPerPage), p + 1));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage >= Math.ceil(totalProducts / productsPerPage) || totalProducts === 0}
                                className={styles.arrowBtn}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* Brand About Section */}
                    {activeBrandInfo && (activeBrandInfo.description || activeBrandInfo.image_url) && (
                        <div className={styles.aboutBrandSection}>
                            <div className={styles.brandBio}>
                                {activeBrandInfo.image_url && (
                                    <div className={styles.brandBioLogoBox}>
                                        <img
                                            src={resolveUrl(activeBrandInfo.image_url)}
                                            alt={activeBrandInfo.name}
                                            className={styles.brandBioLogoImg}
                                        />
                                    </div>
                                )}
                                <div className={styles.brandBioContent}>
                                    <h2 className={styles.brandBioTitle}>
                                        {isArabic && activeBrandInfo.name_ar ? activeBrandInfo.name_ar : activeBrandInfo.name}
                                    </h2>
                                    <div className={styles.brandBioDescription}>
                                        {isArabic && activeBrandInfo.description_ar ? activeBrandInfo.description_ar : activeBrandInfo.description}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ShopLayout;
