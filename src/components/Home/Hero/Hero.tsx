'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Hero.module.css';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

import { API_BASE_URL } from '@/config';
import { resolveUrl } from '@/utils/resolveUrl';

const defaultSlides = [
    {
        tagline: "MARIOT KITCHEN SOLUTIONS",
        title: "Premium Cookware",
        subtitle: "& Kitchen Equipment",
        description: "Discover our exclusive collection of professional-grade kitchen solutions trusted by chefs worldwide.",
        image: "/assets/banner.webp",
        accent: "#ff3b30"
    },
    {
        tagline: "QUALITY YOU CAN TRUST",
        title: "Professional Grade",
        subtitle: "Kitchen Equipment",
        description: "From commercial kitchens to your home — experience the difference of premium kitchen technology.",
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop",
        accent: "#0056b3"
    }
];

interface HeroProps {
    initialSlides?: any[];
}

const Hero = ({ initialSlides = [] }: HeroProps) => {
    const t = useTranslations('common');
    const locale = useLocale();
    const router = useRouter();

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('localhost:5000')) {
            return url.replace('http://localhost:5000', API_BASE_URL.replace('/api/v1', ''));
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        const cleanBaseUrl = API_BASE_URL.replace('/api/v1', '');
        return `${cleanBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const [slides, setSlides] = React.useState(
        initialSlides.length > 0
            ? initialSlides.map(s => ({ ...s, image: resolveUrl(s.image) }))
            : defaultSlides
    );
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [isPaused, setIsPaused] = React.useState(false);
    const [direction, setDirection] = React.useState(1);

    const isRtl = locale === 'ar';

    useEffect(() => {
        if (initialSlides.length > 0) return;

        const fetchCMS = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/cms/homepage`);
                const data = await res.json();
                if (data.success && data.data.hero) {
                    const heroData = Array.isArray(data.data.hero) ? data.data.hero : [];

                    if (heroData.length > 0) {
                        const cmsSlides = heroData.map((slide: any) => ({
                            tagline: isRtl && slide.tagline_ar ? slide.tagline_ar : (slide.tagline || "SPECIAL OFFER"),
                            title: isRtl && slide.title_ar ? slide.title_ar : slide.title,
                            subtitle: "",
                            description: isRtl && slide.description_ar ? slide.description_ar : slide.description,
                            image: resolveUrl(slide.image),
                            accent: slide.accent || "#4c6ef5",
                            link: slide.link || "/shopnow",
                            btnText: isRtl && slide.btnText_ar ? slide.btnText_ar : (slide.btnText || "Shop Now")
                        }));
                        setSlides(cmsSlides);
                        setCurrentSlide(0);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch CMS", error);
            }
        };
        fetchCMS();
    }, [initialSlides, isRtl]);

    const nextSlide = useCallback(() => {
        setDirection(1);
        setCurrentSlide((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
    }, [slides.length]);

    const prevSlide = useCallback(() => {
        setDirection(-1);
        setCurrentSlide((prev) => (prev <= 0 ? slides.length - 1 : prev - 1));
    }, [slides.length]);

    const goToSlide = (index: number) => {
        setDirection(index > currentSlide ? 1 : -1);
        setCurrentSlide(index);
    };

    // Auto-play
    useEffect(() => {
        if (isPaused || slides.length <= 1) return;
        const timer = setInterval(nextSlide, 6000);
        return () => clearInterval(timer);
    }, [isPaused, nextSlide, slides.length]);

    const slide = slides[currentSlide] || slides[0] || defaultSlides[0];

    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? '100%' : '-100%',
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }
        },
        exit: (dir: number) => ({
            x: dir > 0 ? '-30%' : '30%',
            opacity: 0,
            transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1] as const }
        })
    };

    const textContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.12, delayChildren: 0.3 }
        }
    };

    const textItemVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
        }
    };

    return (
        <section
            className={styles.heroSection}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Background Image Slider */}
            <div className={styles.imageLayer}>
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={currentSlide}
                        className={styles.slideBg}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                    >
                        <Image
                            src={slide.image}
                            alt={slide.title}
                            fill
                            className={styles.bgImage}
                            priority={currentSlide === 0}
                            sizes="100vw"
                            style={{ objectFit: 'cover' }}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Gradient Overlay */}
            <div className={styles.overlay} />

            {/* Content */}
            <div className={styles.heroContent}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        className={styles.textContent}
                        variants={textContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                    >
                        <motion.span className={styles.tagline} variants={textItemVariants}>
                            {slide.tagline}
                        </motion.span>

                        <motion.h1 className={styles.title} variants={textItemVariants}>
                            {slide.title}
                            {slide.subtitle && (
                                <>
                                    <br />
                                    <span className={styles.titleAccent} style={{ color: slide.accent }}>
                                        {slide.subtitle}
                                    </span>
                                </>
                            )}
                        </motion.h1>

                        <motion.p className={styles.description} variants={textItemVariants}>
                            {slide.description}
                        </motion.p>

                        <motion.div className={styles.buttonGroup} variants={textItemVariants}>
                            <button className={styles.buyBtn} onClick={() => router.push((slide as any).link || '/shopnow')}>
                                <ShoppingBag size={20} className={isRtl ? styles.iconRtl : styles.iconLtr} />
                                <span>{(slide as any).btnText || (isRtl ? 'تسوق الآن' : 'Shop Now')}</span>
                            </button>
                            <button
                                className={styles.whatsappBtn}
                                onClick={() => window.open('https://wa.me/97142882777', '_blank')}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className={isRtl ? styles.iconRtl : styles.iconLtr}>
                                    <path d="M12.03 2c-5.52 0-10 4.48-10 10a9.96 9.96 0 0 0 1.53 5.39L2.03 22l4.75-1.25c1.54.85 3.32 1.33 5.25 1.33 5.52 0 10-4.48 10-10S17.55 2 12.03 2zm6.3 14.54c-.27.76-1.55 1.48-2.14 1.57-.59.09-1.34.22-3.83-.82-2.92-1.21-4.74-4.22-4.88-4.42-.15-.2-1.18-1.56-1.18-2.98 0-1.42.74-2.12 1.01-2.4.27-.28.59-.35.79-.35.19 0 .38.01.54.02.17.01.4-.04.62.5.24.59.81 1.99.88 2.14.07.15.11.32.01.52-.09.20-.14.33-.28.5-.14.17-.3.38-.43.51-.15.15-.3.32-.13.62.17.3.74 1.23 1.59 1.99.85.76 1.56 1 1.86 1.15.3.15.47.13.65-.08.18-.21.76-.89.96-1.2.2-.31.4-.26.68-.15.28.11 1.77.84 2.08.99.31.15.51.22.59.35.08.13.08.73-.19 1.48z" />
                                </svg>
                                <span>{isRtl ? 'واتساب' : 'WhatsApp'}</span>
                            </button>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>

                {/* Right side brand badge */}
                <div className={styles.brandBadge}>
                    <img
                        src={resolveUrl('/uploads/brands/rational.jpg.webp')}
                        alt="Brand Partner"
                        className={styles.brandLogo}
                    />
                </div>
            </div>

            {/* Slider Controls */}
            <button
                className={`${styles.sliderBtn} ${styles.prevBtn}`}
                onClick={isRtl ? nextSlide : prevSlide}
                aria-label="Previous slide"
                dir={isRtl ? "rtl" : "ltr"}
            >
                <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <button
                className={`${styles.sliderBtn} ${styles.nextBtn}`}
                onClick={isRtl ? prevSlide : nextSlide}
                aria-label="Next slide"
                dir={isRtl ? "rtl" : "ltr"}
            >
                <ChevronRight size={24} strokeWidth={2.5} />
            </button>

            {/* Slide Indicators */}
            <div className={styles.indicators}>
                {slides.map((_, index) => (
                    <button
                        key={index}
                        className={`${styles.dot} ${index === currentSlide ? styles.dotActive : ''}`}
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default Hero;
