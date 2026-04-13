'use client';

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './ShopLayout.module.css';

interface CategoryGridProps {
    subCategoriesToShow: any[];
    t: any; // Translation function
    tc: any; // Translation function
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ subCategoriesToShow, t, tc }) => {
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
                    const catName = typeof cat === 'string' ? cat : cat.name;
                    const catImage = typeof cat === 'string' ? '' : (cat.image_url || '');
                    const slug = catName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                    return (
                        <Link
                            href={`/shop?category=${slug}`}
                            key={idx}
                            className={styles.categoryCard}
                        >
                            <div className={styles.categoryImage}>
                                <img
                                    src={catImage || '/assets/placeholder-image.webp'}
                                    alt={t.has(slug) ? t(slug) : (tc.has(slug) ? tc(slug) : catName)}
                                    className={styles.demoImg}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/assets/placeholder-image.webp';
                                    }}
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
    );
};

export default CategoryGrid;
