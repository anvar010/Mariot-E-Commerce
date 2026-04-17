'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './CategoriesLayout.module.css';
import { API_BASE_URL } from '@/config';
import Loader from '@/components/shared/Loader/Loader';
import { useTranslations, useLocale } from 'next-intl';
import CategoryMenuSkeleton from '@/components/shared/CategoryMenuSkeleton/CategoryMenuSkeleton';
import {
    ChevronRight,
    Coffee,
    IceCream,
    Flame,
    Smartphone as Fridge,
    GlassWater,
    Microwave,
    Apple,
    ChefHat,
    Truck,
    Settings,
    RotateCcw,
    Waves,
    ShieldCheck,
    Trash2,
    Droplets,
    Home,
    Utensils,
    PackageSearch,
    Beef
} from 'lucide-react';

interface CategoriesLayoutProps {
    isPopup?: boolean;
    onClose?: () => void;
}

// Static icon mapping by slug – keeps the existing sidebar design intact
const ICON_MAP: { [key: string]: any } = {
    'coffee-makers': Coffee,
    'ice-equipment': IceCream,
    'cooking-equipment': Flame,
    'refrigeration': Fridge,
    'beverage-equipment': GlassWater,
    'commercial-ovens': Microwave,
    'food-preparation': Apple,
    'food-holding-and-warming-line': ChefHat,
    'storage': Truck,
    'laundries': Waves,
    // Fallback for any new categories added later
    'default': Settings
};

const CategoriesLayout = ({ isPopup = false, onClose }: CategoriesLayoutProps) => {
    const t = useTranslations('categories');
    const tc = useTranslations('categoryContent');
    const locale = useLocale();
    const isArabic = locale === 'ar';

    const [mainCategories, setMainCategories] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [allBrands, setAllBrands] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    // Fetch categories and brands from the API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, brandRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/categories`),
                    fetch(`${API_BASE_URL}/brands`)
                ]);
                const catData = await catRes.json();
                const brandData = await brandRes.json();

                if (catData.success) {
                    const cats = catData.data;
                    setAllCategories(cats);
                    const mains = cats
                        .filter((c: any) => c.type === 'main_category' && c.is_active)
                        .sort((a: any, b: any) => a.id - b.id);
                    setMainCategories(mains);
                }
                if (brandData.success) {
                    setAllBrands(brandData.data);
                }
            } catch (error) {
                console.error('Error fetching categories/brands:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Update brands when active category changes
    useEffect(() => {
        if (mainCategories.length > 0 && mainCategories[activeIndex]) {
            const activeCat = mainCategories[activeIndex];
            const brandIds = activeCat.brand_ids || [];
            const matchedBrands = allBrands.filter((b: any) => brandIds.includes(b.id));
            setBrands(matchedBrands);
        }
    }, [activeIndex, mainCategories, allBrands]);

    const handleCategoryClick = (idx: number) => {
        setActiveIndex(idx);
        if (window.innerWidth <= 768 && contentRef.current) {
            const headerOffset = 90;
            const elementPosition = contentRef.current.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    if (loading) return <CategoryMenuSkeleton isPopup={isPopup} />;

    const activeCategory = mainCategories[activeIndex];

    if (!activeCategory) return null;

    // Dynamically build the left/right sub-category structure from the database
    const buildSubcatStructure = () => {
        const subs = allCategories
            .filter((c: any) => c.type === 'sub_category' && c.parent_id === activeCategory.id && c.is_active)
            .sort((a: any, b: any) => a.id - b.id);

        const groups = subs.map((sub: any) => {
            const subSubs = allCategories
                .filter((c: any) => c.type === 'sub_sub_category' && c.parent_id === sub.id && c.is_active)
                .sort((a: any, b: any) => a.id - b.id);
            return {
                title: (isArabic && sub.name_ar) ? sub.name_ar : sub.name,
                slug: sub.slug,
                items: subSubs.map((ss: any) => ({
                    name: (isArabic && ss.name_ar) ? ss.name_ar : ss.name,
                    slug: ss.slug
                }))
            };
        });

        // Split into left and right columns (roughly even)
        const mid = Math.ceil(groups.length / 2);
        return {
            left: groups.slice(0, mid),
            right: groups.slice(mid)
        };
    };

    const subcats = buildSubcatStructure();
    const Icon = ICON_MAP[activeCategory.slug] || ICON_MAP['default'];

    const renderNestedSubcats = (data: { left: any[], right: any[] }) => (
        <div className={styles.nestedGrid}>
            <div className={styles.nestedColumn}>
                {data.left.map((group: any, idx: number) => (
                    <div key={idx} className={`${styles.categoryGroup} ${(!group.items || group.items.length === 0) ? styles.emptyGroup : ''}`}>
                        <Link
                            href={`/shop?category=${group.slug}`}
                            onClick={onClose}
                            className={styles.groupTitleLink}
                        >
                            <span className={styles.groupTitle}>{group.title}</span>
                        </Link>
                        <div className={styles.groupItems}>
                            {group.items.map((item: any) => (
                                <Link
                                    key={item.slug}
                                    href={`/shop?category=${item.slug}`}
                                    className={styles.nestedLink}
                                    onClick={onClose}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.nestedColumn}>
                {data.right.map((group: any, idx: number) => (
                    <div key={idx} className={`${styles.categoryGroup} ${(!group.items || group.items.length === 0) ? styles.emptyGroup : ''}`}>
                        <Link
                            href={`/shop?category=${group.slug}`}
                            onClick={onClose}
                            className={styles.groupTitleLink}
                        >
                            <span className={styles.groupTitle}>{group.title}</span>
                        </Link>
                        <div className={styles.groupItems}>
                            {group.items.map((item: any) => (
                                <Link
                                    key={item.slug}
                                    href={`/shop?category=${item.slug}`}
                                    className={styles.nestedLink}
                                    onClick={onClose}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <section className={`${styles.categoriesPage} ${isPopup ? styles.popupMode : ''}`}>
            <div className={styles.container}>
                <div className={`${styles.wrapper} ${isPopup ? styles.popupWrapper : ''}`}>
                    <div className={styles.sidebar}>
                        <ul className={styles.sidebarList}>
                            {mainCategories.map((item: any, idx: number) => {
                                const SideIcon = ICON_MAP[item.slug] || ICON_MAP['default'];
                                return (
                                    <li
                                        key={item.id}
                                        className={`${styles.sidebarItem} ${activeIndex === idx ? styles.activeItem : ''}`}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onClick={() => handleCategoryClick(idx)}
                                    >
                                        <div className={styles.labelWrapper}>
                                            <SideIcon size={18} className={styles.sidebarIcon} />
                                            <span className={styles.sidebarLabel}>{(isArabic && item.name_ar) ? item.name_ar : item.name}</span>
                                        </div>
                                        <ChevronRight className={styles.chevronIcon} size={16} />
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div className={styles.mainContent} ref={contentRef}>
                        <div className={styles.contentGrid}>
                            <div className={styles.contentColumn} key={activeCategory.slug}>
                                {activeCategory && (
                                    <>
                                        <div className={styles.categoryHeader}>
                                            <h2 className={styles.columnTitle}>
                                                {(isArabic && activeCategory.name_ar) ? activeCategory.name_ar : activeCategory.name}
                                            </h2>
                                            {activeCategory.image_url && (
                                                <div className={styles.featuredImageArea}>
                                                    <img 
                                                        src={activeCategory.image_url.startsWith('http') ? activeCategory.image_url : `${API_BASE_URL.replace('/api/v1', '')}${activeCategory.image_url}`} 
                                                        alt={activeCategory.name} 
                                                        className={styles.featuredImage}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.columnList}>
                                            {renderNestedSubcats(subcats)}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className={styles.brandsColumn}>
                                <h2 className={styles.brandsTitle}>TOP BRANDS</h2>
                                <div className={styles.brandsGrid}>
                                    {brands?.map((brand: any, idx: number) => (
                                        <Link
                                            href={`/shop?brand=${encodeURIComponent(brand.slug || brand.name.toLowerCase().replace(/ /g, '-'))}`}
                                            key={idx}
                                            className={styles.brandBox}
                                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                                            onClick={onClose}
                                        >
                                            {brand.image_url ? (
                                                <img
                                                    src={brand.image_url}
                                                    alt={(isArabic && brand.name_ar) ? brand.name_ar : brand.name}
                                                    className={styles.brandLogoImg}
                                                />
                                            ) : (
                                                <span className={styles.brandTextFallback}>{(isArabic && brand.name_ar) ? brand.name_ar : brand.name}</span>
                                            )}
                                        </Link>
                                    ))}
                                    {brands.length === 0 && (
                                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>No brands assigned</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CategoriesLayout;
