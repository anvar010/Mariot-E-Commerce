'use client';

import React from 'react';
import styles from './Filters.module.css';
import { Filter, ChevronDown } from 'lucide-react';
import { FilterProps } from './FilterTypes';
import { useTranslations, useLocale } from 'next-intl';

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
                                brands.map(brand => (
                                    <label key={brand.id} className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={selectedBrands.includes(brand.slug)}
                                            onChange={() => handleBrandToggle(brand.slug)}
                                        />
                                        <span>{isArabic && brand.name_ar ? brand.name_ar : brand.name}</span>
                                    </label>
                                ))
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
                            <input
                                type="range"
                                min="0"
                                max="100000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                className={styles.rangeInput}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Placeholder Sections to match screenshot */}
            <div className={styles.filterSection}>
                <div className={styles.sectionHeader}>
                    <h3>FILTER BY GAS/ELECTRIC</h3>
                    <ChevronDown size={14} className={styles.collapsedIcon} />
                </div>
            </div>

            <div className={styles.filterSection}>
                <div className={styles.sectionHeader}>
                    <h3>FILTER BY SERIES</h3>
                    <ChevronDown size={14} className={styles.collapsedIcon} />
                </div>
            </div>

            <div className={styles.filterSection}>
                <div className={styles.sectionHeader}>
                    <h3>FILTER BY PRODUCT TYPE</h3>
                    <ChevronDown size={14} className={styles.collapsedIcon} />
                </div>
            </div>
        </aside>
    );
};

export default DefaultShopFilter;
