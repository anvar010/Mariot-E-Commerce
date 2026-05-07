'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './BrandsBrowse.module.css';
import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLocale } from 'next-intl';
import useEmblaCarousel from 'embla-carousel-react';
import { API_BASE_URL } from '@/config';
import { resolveUrl } from '@/utils/resolveUrl';

interface BrandsBrowseProps {
    initialBrands?: any[];
}

const MOBILE_VISIBLE_COUNT = 6;

const BrandsBrowse = ({ initialBrands = [] }: BrandsBrowseProps) => {
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [brands, setBrands] = useState<any[]>(initialBrands);
    const [loading, setLoading] = useState(initialBrands.length === 0);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        direction: isRtl ? 'rtl' : 'ltr',
        align: 'start',
        skipSnaps: false,
        dragFree: true,
        containScroll: 'trimSnaps',
    });

    useEffect(() => {
        if (initialBrands.length > 0) return;
        const fetchBrands = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/brands`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setBrands(data.data);
                }
            } catch (error) {
                console.error('Error fetching brands:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBrands();
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

    // Sort brands: prioritized first, then alphabetical
    const sortedBrands = (() => {
        const active = brands.filter(b => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1');
        const prioritized = active.filter(b => b.priority !== null && b.priority !== undefined && b.priority !== '');
        const unprioritized = active
            .filter(b => b.priority === null || b.priority === undefined || b.priority === '')
            .sort((a, b) => a.name.localeCompare(b.name));

        const result: any[] = [];
        const priorityMap = new Map();

        prioritized.forEach(b => {
            const p = Number(b.priority);
            if (!priorityMap.has(p)) {
                priorityMap.set(p, b);
            } else {
                unprioritized.push(b);
            }
        });

        unprioritized.sort((a, b) => a.name.localeCompare(b.name));

        let unpIndex = 0;
        const totalCount = active.length;

        for (let i = 1; i <= totalCount; i++) {
            if (priorityMap.has(i)) {
                result.push(priorityMap.get(i));
            } else if (unpIndex < unprioritized.length) {
                result.push(unprioritized[unpIndex]);
                unpIndex++;
            }
        }

        while (unpIndex < unprioritized.length) {
            result.push(unprioritized[unpIndex]);
            unpIndex++;
        }

        return result;
    })();

    const getLogo = (brand: any) => {
        return resolveUrl(brand.image_url || brand.logo);
    };

    if (loading && brands.length === 0) return null;
    if (sortedBrands.length === 0) return null;

    return (
        <section className={styles.brandsSection} id="brands-browse">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderLeft}>
                        <span className={styles.sectionTag}>
                            {isRtl ? 'تسوّق' : 'Shop'}
                        </span>
                        <h2 className={styles.sectionTitle}>
                            {isRtl ? 'تسوق حسب العلامة التجارية' : 'Shop by Brand'}
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            {isRtl ? 'اكتشف أفضل العلامات التجارية لمعدات المطابخ' : 'Discover top kitchen equipment brands we carry'}
                        </p>
                    </div>
                    <div className={styles.sectionHeaderRight}>
                        <Link href="/shop-by-brands" className={styles.viewAllLink}>
                            {isRtl ? 'عرض جميع العلامات' : 'View All Brands'}
                            {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                        </Link>
                        <div className={styles.navBtns}>
                            <button
                                className={`${styles.navBtn} ${!canScrollLeft ? styles.navBtnDisabled : ''}`}
                                onClick={scrollPrev}
                                disabled={!canScrollLeft}
                                aria-label="Scroll brands left"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                className={`${styles.navBtn} ${!canScrollRight ? styles.navBtnDisabled : ''}`}
                                onClick={scrollNext}
                                disabled={!canScrollRight}
                                aria-label="Scroll brands right"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.sliderWrapper}>
                    <div className={styles.emblaViewport} ref={emblaRef}>
                        <div className={styles.brandsGrid}>
                            {loading ? (
                                Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className={styles.skeletonCard} />
                                ))
                            ) : (() => {
                                const pairs = [];
                                for (let i = 0; i < sortedBrands.length; i += 2) {
                                    pairs.push(sortedBrands.slice(i, i + 2));
                                }
                                return pairs.map((pair, pairIndex) => (
                                    <div key={pairIndex} className={styles.brandSlide}>
                                        {pair.map((brand, brandIndex) => {
                                            const logoUrl = getLogo(brand);
                                            const displayName = (isRtl && brand.name_ar) ? brand.name_ar : brand.name;
                                            return (
                                                <Link
                                                    key={brand.id || `${pairIndex}-${brandIndex}`}
                                                    href={`/shop?brand=${encodeURIComponent(brand.slug || brand.name.toLowerCase().replace(/ /g, '-'))}`}
                                                    className={styles.brandCard}
                                                >
                                                    <div className={styles.logoBox}>
                                                        {logoUrl ? (
                                                            <img
                                                                src={logoUrl}
                                                                alt={displayName}
                                                                className={styles.logoImg}
                                                            />
                                                        ) : (
                                                            <span className={styles.brandNameFallback}>
                                                                {displayName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={styles.brandName}>{displayName}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BrandsBrowse;
