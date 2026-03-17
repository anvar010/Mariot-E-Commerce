'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import styles from './HeroPosters.module.css';
import { API_BASE_URL } from '@/config';

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
    const scrollRef = useRef<HTMLDivElement>(null);

    /**
     * Resolves and normalises any image URL coming from the database:
     * - Converts Windows backslashes to forward slashes
     * - Strips accidental /public prefix (Next.js serves public/ at root)
     * - Prepends backend base URL for relative /uploads/ paths
     * - Returns external http(s) and /assets/ paths unchanged
     */
    const resolveUrl = useCallback((url?: string): string => {
        if (!url) return '';

        // Normalise Windows-style backslashes
        const normalised = url.replace(/\\/g, '/');

        // Already a full external URL — return as-is
        if (normalised.startsWith('http') || normalised.startsWith('data:')) {
            return normalised;
        }

        // Strip any erroneous /public prefix that crept into stored paths
        // e.g. "/public/assets/foo.webp" → "/assets/foo.webp"
        const withoutPublic = normalised.startsWith('/public/')
            ? normalised.slice('/public'.length)
            : normalised.startsWith('public/')
                ? '/' + normalised.slice('public/'.length)
                : normalised;

        // Static frontend paths — served by Next.js directly, no backend needed
        if (withoutPublic.startsWith('/assets/') || withoutPublic.startsWith('/images/')) {
            return withoutPublic;
        }

        // Relative backend path (e.g. /uploads/...) — prepend backend base URL
        const cleanBase = API_BASE_URL.replace('/api/v1', '');
        return `${cleanBase}${withoutPublic.startsWith('/') ? '' : '/'}${withoutPublic}`;
    }, []);

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
                    setPosters(dummyPosters);
                }
            } catch (err) {
                console.error("Failed to fetch posters:", err);
                setPosters(dummyPosters);
            } finally {
                setLoading(false);
            }
        };
        fetchPosters();
    }, [initialPosters]);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - 275 : scrollLeft + 275;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
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
        <section className={styles.postersSection}>
            <div className={styles.container}>
                <div className={styles.scrollWrapper}>
                    <button className={`${styles.navBtn} ${styles.prev}`} onClick={() => scroll('left')}>
                        <ChevronLeft size={24} />
                    </button>
                    <div
                        className={styles.postersGrid}
                        ref={scrollRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {posters.map((poster, index) => (
                            <div key={poster.id} className={styles.posterCard}>
                                <div className={styles.imageContainer}>
                                    {/* Next.js Image component — Auto creates WebP, responsive srcset subsets, and lazy loads perfectly */}
                                    <Image
                                        src={resolveUrl(poster.image)}
                                        alt={isArabic && poster.title_ar ? poster.title_ar : poster.title}
                                        fill
                                        sizes="(max-width: 768px) 220px, 260px"
                                        className={styles.posterImg}
                                        priority={index === 0}
                                        loading={index === 0 ? undefined : 'lazy'}
                                        quality={85}
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
                    <button className={`${styles.navBtn} ${styles.next}`} onClick={() => scroll('right')}>
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default HeroPosters;
