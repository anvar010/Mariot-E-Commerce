'use client';

import React from 'react';
import styles from './Filters.module.css';
import { Filter, ChevronDown } from 'lucide-react';
import { FilterProps } from './FilterTypes';
import { useTranslations, useLocale } from 'next-intl';
import { BASE_URL } from '@/config';

/**
 * Orders a flat category list so each child follows its parent, and tags every row with the
 * depth it should be indented by. Anything whose parent is not in the list is treated as a
 * root, so nothing is dropped.
 */
const nestForDisplay = (list: any[]): any[] => {
    const ids = new Set(list.map(c => c.id));
    const childrenOf = new Map<any, any[]>();
    const roots: any[] = [];

    for (const c of list) {
        if (c.parent_id && ids.has(c.parent_id)) {
            if (!childrenOf.has(c.parent_id)) childrenOf.set(c.parent_id, []);
            childrenOf.get(c.parent_id)!.push(c);
        } else {
            roots.push(c);
        }
    }

    const out: any[] = [];
    const walk = (node: any, depth: number) => {
        out.push({ ...node, _depth: depth });
        for (const child of childrenOf.get(node.id) || []) walk(child, depth + 1);
    };
    roots.forEach(r => walk(r, 0));
    return out;
};

const DefaultShopFilter: React.FC<FilterProps> = ({
    inStockOnly,
    setInStockOnly,
    brands,
    selectedBrands,
    handleBrandToggle,
    allCategories,
    brandCategories = [],
    subCategories = [],
    activeCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    resetFilters,
    toggleSection,
    expandedSections,
    onCategoryChange,
    selectedSubCategories = [],
    onSubCategoryToggle,
    selectedCategories = [],
    onCategoryToggle,
    extraFilterTitle = '',
    extraFilterOptions = [],
    selectedExtraFilters = [],
    onExtraFilterToggle,
    enableBrandFilter = true,
    enableCategoryFilter = true,
    title = ''
}) => {
    const t = useTranslations('categoryContent');
    const locale = useLocale();
    const isArabic = locale === 'ar';

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('127.0.0.1:5000')) {
            return url.replace('http://127.0.0.1:5000', BASE_URL);
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.filterHeader}>
                <div className={styles.filterTitle}>
                    <Filter size={18} />
                    <h2>{(title || t('filter')).toUpperCase()}</h2>
                </div>
                <button className={styles.resetBtn} onClick={resetFilters}>
                    {t("reset") || 'Reset'}
                </button>
            </div>

            {/* PRODUCT CATEGORIES
                On a category / sub-category page show only that page's child
                (sub-sub) categories, never the full top-level list. Off a
                category page (search / weekly / all products) show every main
                category as before. */}
            {enableCategoryFilter && (() => {
                const onCategoryPage = !!activeCategory;
                /**
                 * On a brand page, show every category that brand's products are in -- mains,
                 * subs and sub-subs -- nested so the tree is readable. Previously this fell
                 * through to the flat list of main categories, so a brand offered one entry
                 * and no way to narrow.
                 */
                const onBrandPage = !onCategoryPage && brandCategories.length > 0;
                const categoryList = onCategoryPage
                    ? subCategories
                    : onBrandPage ? brandCategories : allCategories;
                // Leaf category with no children — nothing to scope to, hide section.
                if (onCategoryPage && categoryList.length === 0) return null;

                // When onCategoryToggle is provided (shop page, not a dedicated
                // category page), categories act as multi-select in-place filters.
                const useToggle = !onCategoryPage && !!onCategoryToggle;

                return (
                <div className={styles.filterSection}>
                    <div className={styles.sectionHeader} onClick={() => toggleSection('categories')}>
                        <h3>{t("categories") || 'Product Categories'}</h3>
                        <ChevronDown size={14} className={expandedSections.includes('categories') ? styles.rotateIcon : styles.collapsedIcon} />
                    </div>
                    {expandedSections.includes('categories') && (
                        <div className={styles.sectionContent}>
                            {categoryList.length > 0 ? (
                                // On a brand page the list spans three levels, so it is
                                // ordered parent-then-children and indented by depth; a flat
                                // alphabetical list would scatter each child away from its
                                // parent and read as noise.
                                (onBrandPage ? nestForDisplay(categoryList) : categoryList).map(cat => (
                                    <label
                                        key={cat.id}
                                        className={styles.checkboxLabel}
                                        style={cat._depth ? { paddingInlineStart: `${cat._depth * 14}px` } : undefined}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                onCategoryPage
                                                    ? selectedSubCategories.includes(cat.slug)
                                                    : useToggle
                                                        ? selectedCategories.includes(cat.slug)
                                                        : activeCategory === cat.slug
                                            }
                                            onChange={() => {
                                                if (onCategoryPage) {
                                                    onSubCategoryToggle?.(cat.slug);
                                                } else if (useToggle) {
                                                    onCategoryToggle!(cat.slug);
                                                } else if (activeCategory === cat.slug) {
                                                    onCategoryChange(''); // Deselect
                                                } else {
                                                    onCategoryChange(cat.slug);
                                                }
                                            }}
                                        />
                                        <span><span>{isArabic && cat.name_ar ? cat.name_ar : cat.name}</span></span>
                                    </label>
                                ))
                            ) : (
                                <p style={{ fontSize: '12px', color: '#999' }}>{t("no-categories-found")}</p>
                            )}
                        </div>
                    )}
                </div>
                );
            })()}

            {/* EXTRA TITLE/DESCRIPTION FILTER (e.g. Work Tables type) */}
            {extraFilterOptions.length > 0 && (
                <div className={styles.filterSection}>
                    <div className={styles.sectionHeader} onClick={() => toggleSection('extrafilter')}>
                        <h3>{extraFilterTitle || t('categories')}</h3>
                        <ChevronDown size={14} className={expandedSections.includes('extrafilter') ? styles.rotateIcon : styles.collapsedIcon} />
                    </div>
                    {expandedSections.includes('extrafilter') && (
                        <div className={styles.sectionContent}>
                            {extraFilterOptions.map(opt => (
                                <label key={opt.key} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={selectedExtraFilters.includes(opt.key)}
                                        onChange={() => onExtraFilterToggle?.(opt.key)}
                                    />
                                    <span><span>{opt.label}</span></span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* FILTER BY BRAND */}
            {enableBrandFilter && (
                <div className={styles.filterSection}>
                    <div className={styles.sectionHeader} onClick={() => toggleSection('brand')}>
                        <h3>{t("brand") || 'Filter by Brand'}</h3>
                        <ChevronDown size={14} className={expandedSections.includes('brand') ? styles.rotateIcon : styles.collapsedIcon} />
                    </div>
                    {expandedSections.includes('brand') && (
                        <div className={styles.sectionContent}>
                            {brands.length > 0 ? (
                                <div className={styles.brandGrid}>
                                    {brands.map(brand => (
                                        <div
                                            key={brand.id}
                                            onClick={() => handleBrandToggle(brand.slug)}
                                            className={`${styles.brandLogoCard} ${selectedBrands.includes(brand.slug) ? styles.brandLogoCardActive : ''}`}
                                        >
                                            {brand.image_url ? (
                                                <img
                                                    src={resolveUrl(brand.image_url)}
                                                    alt={isArabic && brand.name_ar ? brand.name_ar : brand.name}
                                                    className={styles.brandLogoImg}
                                                />
                                            ) : (
                                                <span className={styles.brandLogoFallback}>
                                                    {isArabic && brand.name_ar ? brand.name_ar : brand.name}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: '12px', color: '#999' }}>{t("no-brands-found")}</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* FILTER BY PRICE */}
            <div className={styles.filterSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('price')}>
                    <h3>{t("price-aed") || 'Filter by Price'}</h3>
                    <ChevronDown size={14} className={expandedSections.includes('price') ? styles.rotateIcon : styles.collapsedIcon} />
                </div>
                {expandedSections.includes('price') && (
                    <div className={styles.sectionContent}>
                        <div className={styles.priceInputs}>
                            <div className={styles.priceField}>
                                <span>{t("from") || 'From'}</span>
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(Number(e.target.value))}
                                />
                            </div>
                            <div className={styles.priceField}>
                                <span>{t("to") || 'To'}</span>
                                <input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className={styles.sliderContainer}>
                            <div className={styles.sliderBase}></div>
                            <div
                                className={styles.sliderProgress}
                                style={{
                                    insetInlineStart: `${(minPrice / 100000) * 100}%`,
                                    insetInlineEnd: `${100 - (maxPrice / 100000) * 100}%`
                                }}
                            ></div>
                            <input
                                type="range"
                                min="0"
                                max="100000"
                                value={minPrice}
                                onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 100))}
                                className={styles.rangeInput}
                            />
                            <input
                                type="range"
                                min="0"
                                max="100000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 100))}
                                className={styles.rangeInput}
                            />
                        </div>
                    </div>
                )}
            </div>

        </aside>
    );
};

export default DefaultShopFilter;
