'use client';

import React, { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './ShopLayout.module.css';

interface CategoryGridProps {
    subCategoriesToShow: any[];
    t: any;
    tc: any;
    brandParam?: string | null;
    // When set, cards narrow the current listing in place (like the sidebar's
    // category checkboxes) instead of navigating to a new category page.
    activeCategory?: string | null;
    selectedSubCategories?: string[];
    onSubCategoryToggle?: (slug: string) => void;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ subCategoriesToShow, t, tc, brandParam, activeCategory, selectedSubCategories = [], onSubCategoryToggle }) => {
    const locale = useLocale();
    const isArabic = locale === 'ar';
    const searchParams = useSearchParams();
    const weeklyParam = searchParams.get('weekly');
    const limitedParam = searchParams.get('limited');
    const searchParam = searchParams.get('search');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

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

    if (subCategoriesToShow.length === 0) return null;

    const onCategoryPage = !!activeCategory;

    return (
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
                {subCategoriesToShow.map((cat: any, idx: number) => {
                    const catName = (isArabic && cat.name_ar) ? cat.name_ar : cat.name;
                    const catImage = cat.image_url || '';
                    const slug = cat.slug || cat.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');

                    const image = (
                        <div className={styles.categoryImage}>
                            <img
                                src={catImage || '/assets/mariot-logo2.webp'}
                                alt={catName}
                                className={styles.demoImg}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/assets/mariot-logo2.webp';
                                }}
                            />
                        </div>
                    );

                    // Already inside a category — narrow the current listing in place
                    // instead of navigating away (matches the sidebar checkbox filter).
                    if (onCategoryPage) {
                        const isActive = selectedSubCategories.includes(slug);
                        return (
                            <div
                                key={idx}
                                className={`${styles.categoryCard} ${isActive ? styles.categoryCardActive : ''}`}
                                onClick={() => onSubCategoryToggle?.(slug)}
                            >
                                {image}
                                <p>{catName}</p>
                            </div>
                        );
                    }

                    const params = new URLSearchParams();
                    if (brandParam) params.set('brand', brandParam);
                    params.set('category', slug);
                    if (weeklyParam) params.set('weekly', weeklyParam);
                    if (limitedParam) params.set('limited', limitedParam);
                    if (searchParam) params.set('search', searchParam);

                    return (
                        <Link
                            href={`/shop?${params.toString()}`}
                            key={idx}
                            className={styles.categoryCard}
                        >
                            {image}
                            <p>{catName}</p>
                        </Link>
                    );
                })}
            </div>
            <button className={styles.scrollBtn} onClick={scrollRight} aria-label="Scroll right">
                <ChevronRight size={24} />
            </button>
        </div>
    );
};

export default CategoryGrid;
