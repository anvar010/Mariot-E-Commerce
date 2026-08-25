'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CategoryBrowse.module.css';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import {
    CupSoda, Coffee, Flame, ThermometerSun, UtensilsCrossed, Snowflake, WashingMachine, Refrigerator, Sparkles, Wrench, Package, Droplet, Home, Grid, CheckCircle, Search
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { normalizeSlug } from '@/utils/shopCategories';
import { sortByOrderIndex } from '@/utils/sortByOrderIndex';

// SVG for Microwave/Oven since Lucide's Microwave might not exist in this version
const OvenIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
        <line x1="3" y1="8" x2="21" y2="8"></line>
        <circle cx="17" cy="13" r="1"></circle>
        <circle cx="17" cy="17" r="1"></circle>
        <line x1="7" y1="13" x2="11" y2="13"></line>
        <line x1="7" y1="17" x2="11" y2="17"></line>
    </svg>
);

const getCategoryIcon = (slug: string) => {
    switch (slug) {
        case 'beverage-equipment': return <CupSoda size={20} />;
        case 'commercial-ovens': return <OvenIcon size={20} />;
        case 'coffee-makers': return <Coffee size={20} />;
        case 'cooking-equipment': return <Flame size={20} />;
        case 'food-holding-and-warming-line': return <ThermometerSun size={20} />;
        case 'food-preparation': return <UtensilsCrossed size={20} />;
        case 'ice-equipment': return <Snowflake size={20} />;
        case 'laundry': return <WashingMachine size={20} />;
        case 'refrigeration': return <Refrigerator size={20} />;
        case 'stainless-steel-equipment':
        case 'stainless-steel-fabrications': return <Sparkles size={20} />;
        case 'parts': return <Wrench size={20} />;
        case 'delivery-and-storage': return <Package size={20} />;
        case 'dishwashing': return <Droplet size={20} />;
        case 'janitorial-safety-supplies': return <CheckCircle size={20} />;
        case 'water-treatment': return <Droplet size={20} />;
        case 'home-use': return <Home size={20} />;
        case 'smallwares': return <Grid size={20} />;
        default: return <Search size={20} />;
    }
};

interface CategoryBrowseProps {
    initialCategories?: any[];
}

const CategoryBrowse = ({ initialCategories = [] }: CategoryBrowseProps) => {
    const sortedInitial = initialCategories.length > 0 ? sortByOrderIndex(initialCategories) : [];
    const t = useTranslations('categories');
    const tc = useTranslations('categoryContent');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [apiCategories, setApiCategories] = useState<any[]>(sortedInitial);
    const [loading, setLoading] = useState(initialCategories.length === 0);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        direction: isRtl ? 'rtl' : 'ltr',
        align: 'start',
        containScroll: 'trimSnaps',
        // Touch scrolling is free with momentum: a swipe carries as far as it was
        // thrown instead of snapping exactly one tile forward, which is what made
        // the strip feel like it moved one item at a time on a phone. skipSnaps lets
        // a fast flick pass several tiles rather than braking at the next one.
        dragFree: true,
        skipSnaps: true,
        // Desktop keeps precise snapping — navigation there is the arrow buttons,
        // and free drag makes them land off-grid.
        breakpoints: {
            '(min-width: 768px)': { dragFree: false, skipSnaps: false },
        },
    });

    useEffect(() => {
        if (initialCategories.length > 0) return;
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    const mains = sortByOrderIndex(
                        data.data.filter((c: any) => c.type === 'main_category' && c.is_active)
                    );
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
        if (category.image_url) {
            if (category.image_url.startsWith('http')) return category.image_url;
            return `${MEDIA_BASE_URL}${category.image_url}`;
        }
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
                                className={`${styles.navBtnPrev} ${!canScrollLeft ? styles.navBtnDisabled : ''}`}
                                onClick={scrollPrev}
                                disabled={!canScrollLeft}
                                aria-label="Scroll categories left"
                            >
                                <ChevronLeft size={20} />
                            </motion.button>
                            <motion.button
                                className={`${styles.navBtnNext} ${!canScrollRight ? styles.navBtnDisabled : ''}`}
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
                                                        <div className={styles.cardLeft}>
                                                            <div className={styles.iconCircle}>
                                                                {getCategoryIcon(slug)}
                                                            </div>
                                                            <span className={styles.categoryName}>
                                                                {displayName}
                                                            </span>
                                                        </div>
                                                        <div className={styles.cardRight}>
                                                            <div className={styles.blobBackground}></div>
                                                            <div className={styles.imageBox}>
                                                                <Image
                                                                    src={getCategoryImage(category)}
                                                                    alt=""
                                                                    fill
                                                                    sizes="(max-width: 640px) 100px, 120px"
                                                                    style={{ objectFit: 'contain' }}
                                                                    className={styles.categoryImg}
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.src = '/assets/placeholder-image.webp';
                                                                    }}
                                                                />
                                                            </div>
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
