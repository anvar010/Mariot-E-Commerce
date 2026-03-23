'use client';

import React, { useRef, useState, useEffect } from 'react';
import styles from './CategoryBrowse.module.css';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
    { id: 1, name: "Coffee Makers", slug: "coffee-makers", image: "/assets/product_images/coffeemakers.webp" },
    { id: 2, name: "Ice Equipment", slug: "ice-equipment", image: "/assets/product_images/ice Equipment.webp" },
    { id: 3, name: "Cooking Equipment", slug: "cooking-equipment", image: "/assets/product_images/CookingEquipment.webp" },
    { id: 4, name: "Refrigeration", slug: "refrigeration", image: "/assets/product_images/Refrigeration.webp" },
    { id: 5, name: "Beverage Equipment", slug: "beverage-equipment", image: "/assets/product_images/Beverage Equipment.webp" },
    { id: 6, name: "Commercial Ovens", slug: "commercial-ovens", image: "/assets/product_images/CommercialOvens.webp" },
    { id: 7, name: "Food Preparation", slug: "food-preparation", image: "/assets/product_images/FoodPreparation.webp" },
    { id: 8, name: "Food Holding & Warming", slug: "food-holding-and-warming-line", image: "/assets/product_images/FoodHoldingandWarmingLine.webp" },
    { id: 9, name: "Delivery & Storage", slug: "delivery-and-storage", image: "/assets/product_images/DeliveryandStorage.webp" },
    { id: 10, name: "Parts", slug: "parts", image: "/assets/product_images/Parts.webp" },
    { id: 11, name: "Used Equipment", slug: "used-equipment", image: "/assets/product_images/coffeemakers.webp" },
    { id: 12, name: "Dishwashing", slug: "dishwashing", image: "/assets/product_images/Dishwashing.webp" },
    { id: 13, name: "Stainless Steel Equipment", slug: "stainless-steel-equipment", image: "/assets/product_images/StainlessSteelEquipment.webp" },
    { id: 14, name: "Janitorial & Safety", slug: "janitorial-safety-supplies", image: "/assets/product_images/Janitorial&SafetySupplies.webp" },
    { id: 15, name: "Water Treatment", slug: "water-treatment", image: "/assets/product_images/WaterTreatment.webp" },
    { id: 16, name: "Home Use", slug: "home-use", image: "/assets/product_images/HomeUse.webp" },
    { id: 17, name: "Dining Room", slug: "dining-room", image: "/assets/product_images/DiningRoom.webp" },
    { id: 18, name: "Smallwares", slug: "smallwares", image: "/assets/product_images/Smallwares.webp" },
    { id: 19, name: "Disposables", slug: "disposables", image: "/assets/product_images/Disposables.webp" },
    { id: 20, name: "Food & Beverage", slug: "food-beverage-ingredients", image: "/assets/product_images/Food&BeverageIngredients.webp" }
];

const CategoryBrowse = () => {
    const t = useTranslations('categories');
    const tc = useTranslations('categoryContent');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(isRtl);
    const [canScrollRight, setCanScrollRight] = useState(!isRtl);

    const checkScroll = () => {
        let ticking = false;
        return () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (scrollRef.current) {
                        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                        const absScroll = Math.abs(Math.round(scrollLeft));
                        const maxScroll = scrollWidth - clientWidth;

                        if (isRtl) {
                            setCanScrollRight(absScroll > 10);
                            setCanScrollLeft(absScroll < maxScroll - 10);
                        } else {
                            setCanScrollLeft(absScroll > 10);
                            setCanScrollRight(absScroll < maxScroll - 10);
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };
    };

    useEffect(() => {
        const handler = checkScroll();
        const el = scrollRef.current;
        
        if (el) {
            window.requestAnimationFrame(() => {
                handler();
            });
            
            // Mouse wheel to horizontal scroll conversion
            const handleWheel = (e: WheelEvent) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    el.scrollLeft += e.deltaY * 0.8; // Slightly Dampened for smoothness
                }
            };

            el.addEventListener('scroll', handler, { passive: true });
            el.addEventListener('wheel', handleWheel, { passive: false });
            
            return () => {
                el.removeEventListener('scroll', handler);
                el.removeEventListener('wheel', handleWheel);
            };
        }
    }, [isRtl]);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 400;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeftState(scrollRef.current.scrollLeft);
        e.preventDefault();
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.1;
        scrollRef.current.scrollLeft = scrollLeftState - walk;
    };

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
                                onClick={() => scroll('left')}
                                disabled={!canScrollLeft}
                            >
                                <ChevronLeft size={20} />
                            </motion.button>
                            <motion.button
                                className={`${styles.navBtn} ${!canScrollRight ? styles.navBtnDisabled : ''}`}
                                onClick={() => scroll('right')}
                                disabled={!canScrollRight}
                            >
                                <ChevronRight size={20} />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                <div className={styles.sliderWrapper}>
                    <div
                        className={styles.categoryGrid}
                        ref={scrollRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {categories.map((category, index) => (
                            <motion.div
                                key={category.id}
                                className={styles.categoryCardWrapper}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                            >
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
                            </motion.div>
                        ))}
                    </div>

                    <AnimatePresence>
                        {canScrollLeft && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={styles.fadeLeft} 
                            />
                        )}
                        {canScrollRight && (
                            <motion.div 
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
