'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CategoryBrowse.module.css';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { normalizeSlug } from '@/utils/shopCategories';

// Static image mapping for public/assets/product_images
// This matches the updated categories and ensures professional images are used
const CATEGORY_IMAGE_MAP: { [key: string]: string } = {
    'coffee-makers': '/assets/product_images/coffeemakers.webp',
    'ice-equipment': '/assets/product_images/ice-equipment.webp',
    'cooking-equipment': '/assets/product_images/cooking-equipment.webp',
    'refrigeration': '/assets/product_images/refrigeration.webp',
    'beverage-equipment': '/assets/product_images/beverage-equipment.webp',
    'commercial-ovens': '/assets/product_images/commercial-ovens.webp',
    'food-preparation': '/assets/product_images/food-preparation.webp',
    'food-holding-and-warming-line': '/assets/product_images/food-holding-and-warming-line.webp',
    'delivery-and-storage': '/assets/product_images/delivery-and-storage.webp',
    'parts': '/assets/product_images/parts.webp',
    'used-equipment': '/assets/product_images/used-equipment.webp',
    'dishwashing': '/assets/product_images/dishwashing.webp',
    'stainless-steel-equipment': '/assets/product_images/stainless-steel-equipment.webp',
    'janitorial-safety-supplies': '/assets/product_images/janitorial-safety-supplies.webp',
    'water-treatment': '/assets/product_images/water-treatment.webp',
    'home-use': '/assets/product_images/home-use.webp',
    'dining-room': '/assets/product_images/dining-room.webp',
    'smallwares': '/assets/product_images/smallwares.webp',
    'disposables': '/assets/product_images/disposables.webp',
    'food-beverage-ingredients': '/assets/product_images/food-beverage-ingredients.webp'
};

interface CategoryBrowseProps {
    initialCategories?: any[];
}

const CategoryBrowse = ({ initialCategories = [] }: CategoryBrowseProps) => {
    const t = useTranslations('categories');
    const tc = useTranslations('categoryContent');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [apiCategories, setApiCategories] = useState<any[]>(initialCategories);
    const [loading, setLoading] = useState(initialCategories.length === 0);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        direction: isRtl ? 'rtl' : 'ltr',
        align: 'start',
        skipSnaps: false,
        dragFree: false,
        containScroll: 'trimSnaps',
        slidesToScroll: 3
    });

    // Fetch categories dynamically to keep in sync with the Mega Menu and Shop
    useEffect(() => {
        if (initialCategories.length > 0) return;
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    // Filter for main categories (same logic as CategoriesLayout)
                    const mains = data.data
                        .filter((c: any) => c.type === 'main_category' && c.is_active)
                        .sort((a: any, b: any) => a.id - b.id);
                    setApiCategories(mains);
                }
            } catch (err) {
                console.error('Error fetching categories for browse:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setCanScrollLeft(emblaApi.canScrollPrev());
        setCanScrollRight(emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
    }, [emblaApi, onSelect]);

    const getCategoryImage = (category: any) => {
        // If the API provides an image, use it
        if (category.image_url) {
            if (category.image_url.startsWith('http')) return category.image_url;
            return `${MEDIA_BASE_URL}${category.image_url}`;
        }

        // Use placeholder for all others
        return '/assets/placeholder-image.webp';
    };

    if (loading && apiCategories.length === 0) return null;

    return (
        <section className={styles.categorySection} id="category-browse">
            <div className={styles.container}>
                <motion.div
                    className={styles.sectionHeader}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={styles.sectionHeaderLeft}>
                        <span className={styles.sectionTag}>{tc("explore-tag")}</span>
                        <h2 className={styles.sectionTitle}>{tc("browse-by-category")}</h2>
                        <p className={styles.sectionSubtitle}>{tc("browse-subtitle")}</p>
                    </div>
                    <div className={styles.sectionHeaderRight}>
                        <Link href="/all-categories" className={styles.viewAllLink}>
                            {tc("view-all-categories")}
                            {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                        </Link>
                        <div className={styles.navBtns}>
                            <motion.button
                                className={`${styles.navBtn} ${!canScrollLeft ? styles.navBtnDisabled : ''}`}
                                onClick={scrollPrev}
                                disabled={!canScrollLeft}
                                aria-label="Scroll categories left"
                            >
                                <ChevronLeft size={20} />
                            </motion.button>
                            <motion.button
                                className={`${styles.navBtn} ${!canScrollRight ? styles.navBtnDisabled : ''}`}
                                onClick={scrollNext}
                                disabled={!canScrollRight}
                                aria-label="Scroll categories right"
                            >
                                <ChevronRight size={20} />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                <div className={styles.sliderWrapper}>
                    <div className={styles.emblaViewport} ref={emblaRef}>
                        <div className={styles.categoryGrid}>
                            {(() => {
                                const chunked = [];
                                for (let i = 0; i < apiCategories.length; i += 2) {
                                    chunked.push(apiCategories.slice(i, i + 2));
                                }
                                return chunked.map((column, idx) => (
                                    <div key={idx} className={styles.categoryColumn}>
                                        {column.map((category) => {
                                            const slug = normalizeSlug(category.name);
                                            const displayName = (isRtl && category.name_ar) ? category.name_ar : (t.has(slug) ? t(slug) : category.name);

                                            return (
                                                <div key={category.id} className={styles.categoryCardWrapper}>
                                                    <Link
                                                        href={`/category/${slug}`}
                                                        className={styles.categoryCard}
                                                    >
                                                        <div className={styles.imageBox}>
                                                            <Image
                                                                src={getCategoryImage(category)}
                                                                alt=""
                                                                fill
                                                                sizes="(max-width: 640px) 80px, 110px"
                                                                style={{ objectFit: 'contain', zIndex: 10 }}
                                                                className={styles.categoryImg}
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.src = '/assets/placeholder-image.webp';
                                                                }}
                                                            />
                                                            <div className={styles.imageOverlay}>
                                                                {displayName.split(' ')[0]}
                                                            </div>
                                                        </div>
                                                        <div className={styles.cardBottom}>
                                                            <span className={styles.categoryName}>
                                                                {displayName}
                                                            </span>
                                                            <span className={styles.categoryArrow}>
                                                                {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    <AnimatePresence>
                        {canScrollLeft && (
                            <motion.div
                                key="fade-left"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={styles.fadeLeft}
                            />
                        )}
                        {canScrollRight && (
                            <motion.div
                                key="fade-right"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={styles.fadeRight}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

export default CategoryBrowse;
