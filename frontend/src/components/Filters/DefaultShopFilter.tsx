'use client';

import React from 'react';
import styles from './Filters.module.css';
import { Filter, ChevronDown } from 'lucide-react';
import { FilterProps } from './FilterTypes';
import { useTranslations, useLocale } from 'next-intl';
import { BASE_URL } from '@/config';

const DefaultShopFilter: React.FC<FilterProps> = ({
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
    onCategoryChange,
    enableBrandFilter = true,
    enableCategoryFilter = true,
    title = 'Filter'
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
                    <h2>{title.toUpperCase()}</h2>
                </div>
                <button className={styles.resetBtn} onClick={resetFilters}>
                    {t("reset") || 'Reset'}
                </button>
            </div>

            {/* PRODUCT CATEGORIES */}
            {enableCategoryFilter && (
                <div className={styles.filterSection}>
                    <div className={styles.sectionHeader} onClick={() => toggleSection('categories')}>
                        <h3>{t("categories") || 'Product Categories'}</h3>
                        <ChevronDown size={14} className={expandedSections.includes('categories') ? styles.rotateIcon : styles.collapsedIcon} />
                    </div>
                    {expandedSections.includes('categories') && (
                        <div className={styles.sectionContent}>
                            {allCategories.length > 0 ? (
                                allCategories.map(cat => (
                                    <label key={cat.id} className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={activeCategory === cat.slug}
                                            onChange={() => {
                                                if (activeCategory === cat.slug) {
                                                    onCategoryChange(''); // Deselect
                                                } else {
                                                    onCategoryChange(cat.slug);
                                                }
                                            }}
                                        />
                                        <span>{isArabic && cat.name_ar ? cat.name_ar : cat.name}</span>
                                    </label>
                                ))
                            ) : (
                                <p style={{ fontSize: '12px', color: '#999' }}>{t("no-categories-found")}</p>
                            )}
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
