'use client';

import React from 'react';
import styles from './Filters.module.css';
import { Filter, ChevronDown } from 'lucide-react';
import { FilterProps } from './FilterTypes';
import { useTranslations, useLocale } from 'next-intl';

const FilterShopByBrand: React.FC<FilterProps> = ({
    inStockOnly,
    setInStockOnly,
    brandCategories = [],
    activeCategory,
    onCategoryChange,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    resetFilters,
    toggleSection,
    expandedSections,
}) => {
    const t = useTranslations('categoryContent');
    const locale = useLocale();
    const isArabic = locale === 'ar';

    return (
        <aside className={styles.sidebar}>
            <div className={styles.filterHeader}>
                <div className={styles.filterTitle}>
                    <Filter size={18} />
                    <h2>{t('filter').toUpperCase()}</h2>
                </div>
                <button className={styles.resetBtn} onClick={resetFilters}>
                    {t('reset') || 'Reset'}
                </button>
            </div>

            {/* AVAILABILITY */}
            <div className={styles.filterSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('stock')}>
                    <h3>{t('availability') || 'Availability'}</h3>
                    <ChevronDown size={14} className={expandedSections.includes('stock') ? styles.rotateIcon : styles.collapsedIcon} />
                </div>
                {expandedSections.includes('stock') && (
                    <div className={styles.sectionContent}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={inStockOnly}
                                onChange={(e) => setInStockOnly(e.target.checked)}
                            />
                            <span>{t('in-stock-only') || 'In Stock Only'}</span>
                        </label>
                    </div>
                )}
            </div>

            {/* CATEGORIES FOR THIS BRAND */}
            <div className={styles.filterSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('categories')}>
                    <h3>{t('categories') || 'Categories'}</h3>
                    <ChevronDown size={14} className={expandedSections.includes('categories') ? styles.rotateIcon : styles.collapsedIcon} />
                </div>
                {expandedSections.includes('categories') && (
                    <div className={styles.sectionContent}>
                        {brandCategories.length > 0 ? (
                            brandCategories.map(cat => (
                                <label key={cat.id} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={activeCategory === cat.slug}
                                        onChange={() => onCategoryChange(activeCategory === cat.slug ? '' : cat.slug)}
                                    />
                                    <span>
                                        {isArabic && cat.name_ar ? cat.name_ar : cat.name}
                                        {cat.product_count > 0 && <span className={styles.countBadge}>{cat.product_count}</span>}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <p className={styles.emptyMsg}>{t('no-categories-found')}</p>
                        )}
                    </div>
                )}
            </div>

            {/* PRICE */}
            <div className={styles.filterSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('price')}>
                    <h3>{t('price-aed') || 'Price (AED)'}</h3>
                    <ChevronDown size={14} className={expandedSections.includes('price') ? styles.rotateIcon : styles.collapsedIcon} />
                </div>
                {expandedSections.includes('price') && (
                    <div className={styles.sectionContent}>
                        <div className={styles.priceInputs}>
                            <div className={styles.priceField}>
                                <span>{t('from') || 'From'}</span>
                                <input type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} />
                            </div>
                            <div className={styles.priceField}>
                                <span>{t('to') || 'To'}</span>
                                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
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

export default FilterShopByBrand;
