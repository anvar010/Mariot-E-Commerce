'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CategoryBrowse.module.css';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';

const categories = [
    { id: 1, name: "Coffee Makers", slug: "coffee-makers", image: "/assets/product_images/coffeemakers.webp" },
    { id: 2, name: "Ice Equipment", slug: "ice-equipment", image: "/assets/product_images/ice-equipment.webp" },
    { id: 3, name: "Cooking Equipment", slug: "cooking-equipment", image: "/assets/product_images/cooking-equipment.webp" },
    { id: 4, name: "Refrigeration", slug: "refrigeration", image: "/assets/product_images/refrigeration.webp" },
    { id: 5, name: "Beverage Equipment", slug: "beverage-equipment", image: "/assets/product_images/beverage-equipment.webp" },
    { id: 6, name: "Commercial Ovens", slug: "commercial-ovens", image: "/assets/product_images/commercial-ovens.webp" },
    { id: 7, name: "Food Preparation", slug: "food-preparation", image: "/assets/product_images/food-preparation.webp" },
    { id: 8, name: "Food Holding & Warming", slug: "food-holding-and-warming-line", image: "/assets/product_images/food-holding-and-warming-line.webp" },
    { id: 9, name: "Delivery & Storage", slug: "delivery-and-storage", image: "/assets/product_images/delivery-and-storage.webp" },
    { id: 10, name: "Parts", slug: "parts", image: "/assets/product_images/parts.webp" },
    { id: 11, name: "Used Equipment", slug: "used-equipment", image: "/assets/product_images/coffeemakers.webp" },
    { id: 12, name: "Dishwashing", slug: "dishwashing", image: "/assets/product_images/dishwashing.webp" },
    { id: 13, name: "Stainless Steel Equipment", slug: "stainless-steel-equipment", image: "/assets/product_images/stainless-steel-equipment.webp" },
    { id: 14, name: "Janitorial & Safety", slug: "janitorial-safety-supplies", image: "/assets/product_images/janitorial-safety-supplies.webp" },
    { id: 15, name: "Water Treatment", slug: "water-treatment", image: "/assets/product_images/water-treatment.webp" },
    { id: 16, name: "Home Use", slug: "home-use", image: "/assets/product_images/home-use.webp" },
    { id: 17, name: "Dining Room", slug: "dining-room", image: "/assets/product_images/dining-room.webp" },
    { id: 18, name: "Smallwares", slug: "smallwares", image: "/assets/product_images/smallwares.webp" },
    { id: 19, name: "Disposables", slug: "disposables", image: "/assets/product_images/disposables.webp" },
    { id: 20, name: "Food & Beverage", slug: "food-beverage-ingredients", image: "/assets/product_images/food-beverage-ingredients.webp" }
];

const CategoryBrowse = () => {
    const t = useTranslations('categories');
    const tc = useTranslations('categoryContent');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: false, 
        direction: isRtl ? 'rtl' : 'ltr',
        align: 'start',
        skipSnaps: true,
        dragFree: true,
        containScroll: 'trimSnaps'
    });

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
                            >
                                <ChevronLeft size={20} />
                            </motion.button>
                            <motion.button
                                className={`${styles.navBtn} ${!canScrollRight ? styles.navBtnDisabled : ''}`}
                                onClick={scrollNext}
                                disabled={!canScrollRight}
                            >
                                <ChevronRight size={20} />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                <div className={styles.sliderWrapper}>
                    <div className={styles.emblaViewport} ref={emblaRef}>
                        <div className={styles.categoryGrid}>
                            {categories.map((category) => (
                                <div key={category.id} className={styles.categoryCardWrapper}>
                                    <Link
                                        href={`/shop?category=${category.slug}`}
                                        className={styles.categoryCard}
                                    >
                                        <div className={styles.imageBox}>
                                            <Image
                                                src={category.image}
                                                alt={t.has(category.slug) ? t(category.slug) : category.name}
                                                fill
                                                sizes="(max-width: 768px) 150px, 120px"
                                                style={{ objectFit: 'contain', zIndex: 10 }}
                                                className={styles.categoryImg}
                                            />
                                            <div className={styles.imageOverlay}>
                                                {category.name.split(' ')[0]}
                                            </div>
                                        </div>
                                        <div className={styles.cardBottom}>
                                            <span className={styles.categoryName}>
                                                {t.has(category.slug) ? t(category.slug) : category.name}
                                            </span>
                                            <span className={styles.categoryArrow}>
                                                {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                                            </span>
                                        </div>
                                    </Link>
                                </div>
                            ))}
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
