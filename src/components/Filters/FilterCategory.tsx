'use client';

import React from 'react';
import styles from './Filters.module.css';
import { Filter, ChevronDown } from 'lucide-react';
import { FilterProps } from './FilterTypes';
import { useTranslations } from 'next-intl';

const FilterCategory: React.FC<FilterProps> = ({
    inStockOnly,
    setInStockOnly,
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
    title
}) => {
    const t = useTranslations('categoryContent');
    return (
        <aside className={styles.sidebar}>
            <div className={styles.filterHeader}>
                <div className={styles.filterTitle}>
                    <Filter size={18} />
                    <h2>{title ? title.toUpperCase() : t('filter-by-category').toUpperCase()}</h2>
                </div>
                <button className={styles.resetBtn} onClick={resetFilters}>
                    {t('reset') || 'Reset'}
                </button>
            </div>

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

            <div className={styles.filterSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('categories')}>
                    <h3>{t('categories') || 'Categories'}</h3>
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
                                    <span>{cat.name}</span>
                                </label>
                            ))
                        ) : (
                            <p style={{ fontSize: '12px', color: '#999' }}>{t('no-categories-found')}</p>
                        )}
                    </div>
                )}
            </div>

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
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(Number(e.target.value))}
                                />
                            </div>
                            <div className={styles.priceField}>
                                <span>{t('to') || 'To'}</span>
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
        </aside>
    );
};

export default FilterCategory;
