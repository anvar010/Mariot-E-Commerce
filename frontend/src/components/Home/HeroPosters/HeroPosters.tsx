'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import styles from './HeroPosters.module.css';
import { API_BASE_URL } from '@/config';
import { resolveUrl } from '@/utils/resolveUrl';
import useEmblaCarousel from 'embla-carousel-react';

interface Poster {
    id: number;
    title: string;
    title_ar?: string;
    description?: string;
    description_ar?: string;
    badge?: string;
    badge_ar?: string;
    image: string;
    link: string;
    button_text?: string;
    button_text_ar?: string;
    order_index: number;
}

interface HeroPostersProps {
    initialPosters?: Poster[];
}

const dummyPosters: Poster[] = [
    {
        id: -1,
        title: "Premium Kitchen Gear",
        badge: "NEW ARRIVAL",
        description: "Explore our latest collection of professional grade equipment.",
        image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1470&auto=format&fit=crop",
        link: "/shopnow",
        button_text: "EXPLORE NOW",
        order_index: 0
    },
    {
        id: -2,
        title: "Commercial Refrigeration",
        badge: "SAVE 20%",
        description: "Energy efficient cooling solutions for your business.",
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop",
        link: "/shopnow",
        button_text: "VIEW DEALS",
        order_index: 1
    },
    {
        id: -3,
        title: "Chef's Best Choice",
        badge: "BEST SELLER",
        description: "Top rated tools favored by master chefs worldwide.",
        image: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?q=80&w=1470&auto=format&fit=crop",
        link: "/shopnow",
        button_text: "SHOP NOW",
        order_index: 2
    }
];

const HeroPosters = ({ initialPosters = [] }: HeroPostersProps) => {
    const locale = useLocale();
    const isArabic = locale === 'ar';
    const [posters, setPosters] = useState<Poster[]>(initialPosters.length > 0 ? initialPosters : []);
    const [loading, setLoading] = useState(initialPosters.length === 0);
    
    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: false, 
        direction: isArabic ? 'rtl' : 'ltr',
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

    useEffect(() => {
        const fetchPosters = async () => {
            try {
                let currentPosters = initialPosters;
                if (currentPosters.length === 0) {
                    const res = await fetch(`${API_BASE_URL}/cms/homepage`);
                    const data = await res.json();
                    if (data.success && data.data.hero_posters && data.data.hero_posters.length > 0) {
                        currentPosters = data.data.hero_posters;
                    }
                }

                if (currentPosters.length > 0) {
                    setPosters(currentPosters.sort((a: any, b: any) => a.order_index - b.order_index));
                } else {
                    setPosters([]);
                }
            } catch (err) {
                console.error("Failed to fetch posters:", err);
                setPosters([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPosters();
    }, [initialPosters]);

    // Embla handles drag events natively

    if (!loading && posters.length === 0) return null;

    /* Skeleton loading state — lightweight, no spinner */
    if (loading && posters.length === 0) return (
        <section className={styles.postersSection}>
            <div className={styles.container}>
                <div className={styles.scrollWrapper}>
                    <div className={styles.postersGrid}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`${styles.posterCard} ${styles.skeleton}`} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );

    return (
        <section className={styles.postersSection} id="hero-posters">
            <div className={styles.container}>
                <div className={styles.scrollWrapper}>
                    <button className={`${styles.navBtn} ${styles.prev}`} onClick={scrollPrev}>
                        <ChevronLeft size={24} />
                    </button>
                    <div className={styles.emblaViewport} ref={emblaRef}>
                        <div className={styles.postersGrid}>
                            {posters.map((poster, index) => (
                            <div key={poster.id} className={styles.posterCard}>
                                <div className={styles.imageContainer}>
                                    <Image
                                        src={resolveUrl(poster.image)}
                                        alt={isArabic && poster.title_ar ? poster.title_ar : poster.title}
                                        fill
                                        sizes="(max-width: 640px) 220px, 260px"
                                        className={styles.posterImg}
                                        priority={index === 0}
                                        quality={75}
                                    />
                                </div>
                                <div className={styles.overlay}>
                                    {poster.badge && (
                                        <div className={styles.badge}>
                                            {isArabic && poster.badge_ar ? poster.badge_ar : poster.badge}
                                        </div>
                                    )}
                                    <div className={styles.content}>
                                        <h3 className={styles.title}>
                                            {isArabic && poster.title_ar ? poster.title_ar : poster.title}
                                        </h3>
                                        <p className={styles.desc}>
                                            {isArabic && poster.description_ar ? poster.description_ar : poster.description}
                                        </p>
                                        <Link href={poster.link || '#'} className={styles.button}>
                                            {isArabic && poster.button_text_ar ? poster.button_text_ar : (poster.button_text || 'SHOP NOW')}
                                            <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    <button className={`${styles.navBtn} ${styles.next}`} onClick={scrollNext}>
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default HeroPosters;
