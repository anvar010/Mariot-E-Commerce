'use client';

/**
 * Hero — peek carousel.
 *
 * The active slide is a rounded card with its neighbours visible at either edge,
 * blurred and slightly squashed so they read as "there is more" rather than as
 * competing content. On phones the peek collapses to zero and the card fills the
 * width.
 *
 * The loop is seamless: the track carries a clone of the last slide before the
 * first and a clone of the first after the last. Stepping onto a clone animates
 * normally, then the track jumps to the real slide with transitions switched off,
 * so the rewind is never seen.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './Hero.module.css';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

import { API_BASE_URL } from '@/config';

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
        description: "From commercial kitchens to your home, experience the difference of premium kitchen technology.",
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop",
        accent: "#0056b3"
    }
];

// Past this the drag is a swipe rather than a stray touch.
const SWIPE_THRESHOLD = 55;
const AUTOPLAY_MS = 6000;

interface HeroProps {
    initialSlides?: any[];
}

const Hero = ({ initialSlides = [] }: HeroProps) => {
    const t = useTranslations('common');
    const locale = useLocale();
    const router = useRouter();
    const isRtl = locale === 'ar';

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('127.0.0.1:5000')) {
            return url.replace('http://127.0.0.1:5000', API_BASE_URL.replace('/api/v1', ''));
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        const cleanBaseUrl = API_BASE_URL.replace('/api/v1', '');
        return `${cleanBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const [slides, setSlides] = useState(
        initialSlides.length > 0
            ? initialSlides.map(s => ({ ...s, image: resolveUrl(s.image), imageMobile: s.imageMobile ? resolveUrl(s.imageMobile) : '' }))
            : defaultSlides
    );
    const [isPaused, setIsPaused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Index into the cloned track, so 1 is the first real slide.
    const [position, setPosition] = useState(1);
    const [resetting, setResetting] = useState(false);
    const [metrics, setMetrics] = useState({ cardWidth: 0, gap: 0, peek: 0 });
    const [drag, setDrag] = useState<{ startX: number; delta: number } | null>(null);

    const stageRef = useRef<HTMLDivElement>(null);
    const peekRef = useRef<HTMLDivElement>(null);
    const gapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (initialSlides.length > 0) return;
        const fetchCMS = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/cms/homepage`);
                const data = await res.json();
                if (data.success && data.data.hero) {
                    const hero = Array.isArray(data.data.hero) ? data.data.hero : [];
                    if (hero.length > 0) {
                        setSlides(hero.map((s: any) => ({
                            ...s,
                            image: resolveUrl(s.image),
                            imageMobile: s.imageMobile ? resolveUrl(s.imageMobile) : '',
                        })));
                    }
                }
            } catch {
                /* keep whatever is already on screen */
            }
        };
        fetchCMS();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The card width is whatever is left of the stage once both peeks and both gaps
    // are taken out, so the CSS breakpoints stay the single source of truth for how
    // wide a peek is.
    //
    // The widths are read off two zero-height probe elements rather than from
    // getComputedStyle. An unregistered custom property computes to its *specified*
    // string, so --carousel-peek came back as the literal "clamp(112px, 8.8vw,
    // 170px)" and parseFloat gave NaN — the peek fell to 0, the card took the whole
    // stage, and since the stage is 44px wider than the container the rounded
    // corners sat off-screen. Letting the browser lay out a real element resolves
    // clamp() properly in every browser, with no @property support needed.
    const measure = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const peek = peekRef.current?.getBoundingClientRect().width ?? 0;
        const gap = gapRef.current?.getBoundingClientRect().width ?? 0;
        const cardWidth = Math.max(0, stage.clientWidth - (peek + gap) * 2);
        setMetrics({ cardWidth, gap, peek });
    }, []);

    useLayoutEffect(() => {
        measure();
        const stage = stageRef.current;
        if (!stage || typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const ro = new ResizeObserver(measure);
        ro.observe(stage);
        return () => ro.disconnect();
    }, [measure]);

    const count = slides.length;
    // One clone at each end is all a single-card peek needs.
    const track = count > 1 ? [slides[count - 1], ...slides, slides[0]] : slides;
    const activeIndex = count > 1 ? (position - 1 + count) % count : 0;

    const step = metrics.cardWidth + metrics.gap;
    const baseOffset = metrics.peek + metrics.gap - position * step;
    const offset = baseOffset + (drag?.delta ?? 0);

    const goTo = useCallback((next: number) => {
        setResetting(false);
        setPosition(next);
    }, []);

    const nextSlide = useCallback(() => { if (count > 1) goTo(position + 1); }, [count, goTo, position]);
    const prevSlide = useCallback(() => { if (count > 1) goTo(position - 1); }, [count, goTo, position]);

    // Landing on a clone: let the animation finish, then swap to the real slide
    // with transitions off so nothing rewinds on screen.
    const handleTransitionEnd = () => {
        if (count <= 1) return;
        if (position === 0) { setResetting(true); setPosition(count); }
        else if (position === count + 1) { setResetting(true); setPosition(1); }
    };

    useEffect(() => {
        if (!resetting) return;
        // One frame with transitions disabled is enough for the jump to land.
        const id = requestAnimationFrame(() => setResetting(false));
        return () => cancelAnimationFrame(id);
    }, [resetting]);

    useEffect(() => {
        if (isPaused || count <= 1 || drag) return;
        const timer = setInterval(() => setPosition(p => p + 1), AUTOPLAY_MS);
        return () => clearInterval(timer);
    }, [isPaused, count, drag]);

    // ── drag / swipe ────────────────────────────────────────────────────────
    const onPointerDown = (e: React.PointerEvent) => {
        if (count <= 1) return;
        setDrag({ startX: e.clientX, delta: 0 });
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag) return;
        setDrag({ ...drag, delta: e.clientX - drag.startX });
    };

    const endDrag = () => {
        if (!drag) return;
        const { delta } = drag;
        setDrag(null);
        if (delta <= -SWIPE_THRESHOLD) setPosition(p => p + 1);
        else if (delta >= SWIPE_THRESHOLD) setPosition(p => p - 1);
    };

    const trackClass = [
        styles.carouselTrack,
        resetting ? styles.resettingTrack : '',
        drag ? styles.draggingTrack : '',
        // The card width is only known once the browser has laid the probes out, so
        // the server-rendered HTML carries 0. Hiding the track until it is measured
        // avoids a first paint of collapsed cards; it is one frame after hydration.
        metrics.cardWidth === 0 ? styles.unmeasuredTrack : '',
    ].filter(Boolean).join(' ');

    const textItem = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { duration: .5, delay: .12 + i * .07, ease: [0.25, 0.46, 0.45, 0.94] as const },
        }),
    };

    return (
        <section
            className={styles.heroSection}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div
                ref={stageRef}
                className={styles.carouselStage}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerLeave={endDrag}
            >
                {/* Zero-height probes: the browser resolves clamp()/var() into a real
                    laid-out width, which is the only reliable way to read these. */}
                <div ref={peekRef} className={styles.peekProbe} aria-hidden="true" />
                <div ref={gapRef} className={styles.gapProbe} aria-hidden="true" />

                <div
                    className={trackClass}
                    style={{
                        ['--carousel-card-width' as any]: `${metrics.cardWidth}px`,
                        transform: `translate3d(${offset}px, 0, 0)`,
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {track.map((slide, i) => {
                        const isActive = i === position;
                        const image = (isMobile && slide?.imageMobile) ? slide.imageMobile : slide?.image;

                        return (
                            <article
                                key={`${slide?.title ?? 'slide'}-${i}`}
                                className={`${styles.slideCard} ${isActive ? '' : styles.sideSlide}`}
                                aria-hidden={!isActive}
                            >
                                <div className={styles.imageLayer}>
                                    {image && (
                                        <Image
                                            src={image}
                                            alt={isActive ? (slide?.title || '') : ''}
                                            fill
                                            className={styles.bgImage}
                                            priority={i === 1}
                                            unoptimized={image.startsWith('/assets/')}
                                            sizes="(max-width: 768px) 100vw, 82vw"
                                            draggable={false}
                                        />
                                    )}
                                </div>

                                <div className={styles.overlay} />

                                <div className={styles.heroContent}>
                                    {isActive && (
                                        <div className={styles.textContent} dir={isRtl ? 'rtl' : 'ltr'}>
                                            <motion.div
                                                className={styles.trustPill}
                                                custom={0} variants={textItem} initial="hidden" animate="visible"
                                                key={`pill-${activeIndex}`}
                                            >
                                                <span className={styles.trustMark}>M</span>
                                                <span>{t('heroTrust')}</span>
                                                <span className={styles.trustStar}>★</span>
                                            </motion.div>

                                            {slide?.tagline && (
                                                <motion.span
                                                    className={styles.tagline}
                                                    custom={1} variants={textItem} initial="hidden" animate="visible"
                                                    key={`tag-${activeIndex}`}
                                                >
                                                    {slide.tagline}
                                                </motion.span>
                                            )}

                                            <motion.h1
                                                className={styles.title}
                                                custom={2} variants={textItem} initial="hidden" animate="visible"
                                                key={`title-${activeIndex}`}
                                            >
                                                {slide?.title}
                                                {slide?.subtitle && (
                                                    <>
                                                        <br />
                                                        <span className={styles.titleAccent}>{slide.subtitle}</span>
                                                    </>
                                                )}
                                            </motion.h1>

                                            {slide?.description && (
                                                <motion.p
                                                    className={styles.description}
                                                    custom={3} variants={textItem} initial="hidden" animate="visible"
                                                    key={`desc-${activeIndex}`}
                                                >
                                                    {slide.description}
                                                </motion.p>
                                            )}

                                            <motion.div
                                                className={styles.buttonGroup}
                                                custom={4} variants={textItem} initial="hidden" animate="visible"
                                                key={`btns-${activeIndex}`}
                                            >
                                                <button
                                                    className={styles.buyBtn}
                                                    onClick={() => router.push(slide?.link || '/shopnow')}
                                                >
                                                    <ShoppingBag size={18} className={isRtl ? styles.iconRtl : styles.iconLtr} />
                                                    <span>{slide?.btnText || (isRtl ? 'تسوق الآن' : 'Shop Now')}</span>
                                                </button>
                                                <button
                                                    className={styles.whatsappBtn}
                                                    onClick={() => window.open('https://wa.me/97142882777', '_blank')}
                                                >
                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={isRtl ? styles.iconRtl : styles.iconLtr}>
                                                        <path d="M12.03 2c-5.52 0-10 4.48-10 10a9.96 9.96 0 0 0 1.53 5.39L2.03 22l4.75-1.25c1.54.85 3.32 1.33 5.25 1.33 5.52 0 10-4.48 10-10S17.55 2 12.03 2zm6.3 14.54c-.27.76-1.55 1.48-2.14 1.57-.59.09-1.34.22-3.83-.82-2.92-1.21-4.74-4.22-4.88-4.42-.15-.2-1.18-1.56-1.18-2.98 0-1.42.74-2.12 1.01-2.4.27-.28.59-.35.79-.35.19 0 .38.01.54.02.17.01.4-.04.62.5.24.59.81 1.99.88 2.14.07.15.11.32.01.52-.09.20-.14.33-.28.5-.14.17-.3.38-.43.51-.15.15-.3.32-.13.62.17.3.74 1.23 1.59 1.99.85.76 1.56 1 1.86 1.15.3.15.47.13.65-.08.18-.21.76-.89.96-1.2.2-.31.4-.26.68-.15.28.11 1.77.84 2.08.99.31.15.51.22.59.35.08.13.08.73-.19 1.48z" />
                                                    </svg>
                                                    <span>{isRtl ? 'واتساب' : 'WhatsApp'}</span>
                                                </button>
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>

                {count > 1 && (
                    <>
                        <button
                            className={`${styles.sliderBtn} ${styles.prevBtn}`}
                            onClick={isRtl ? nextSlide : prevSlide}
                            aria-label="Previous slide"
                            dir={isRtl ? 'rtl' : 'ltr'}
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </button>
                        <button
                            className={`${styles.sliderBtn} ${styles.nextBtn}`}
                            onClick={isRtl ? prevSlide : nextSlide}
                            aria-label="Next slide"
                            dir={isRtl ? 'rtl' : 'ltr'}
                        >
                            <ChevronRight size={24} strokeWidth={2.5} />
                        </button>
                    </>
                )}
            </div>

            {count > 1 && (
                <div className={styles.indicators}>
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ''}`}
                            onClick={() => goTo(index + 1)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default Hero;
