'use client';

import React, { useState, useEffect } from 'react';
import CurrencyPrice from '@/components/shared/CurrencyPrice/CurrencyPrice';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ChevronRight, Headphones } from 'lucide-react';
import styles from './CategoryLanding.module.css';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { useLocale, useTranslations } from 'next-intl';
import Loader from '@/components/shared/Loader/Loader';
import { sortByOrderIndex } from '@/utils/sortByOrderIndex';

interface CategoryLandingProps {
  categorySlug: string;
}

const CategoryLanding = ({ categorySlug }: CategoryLandingProps) => {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const t = useTranslations('categories');
  const tCommon = useTranslations('header');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [category, setCategory] = useState<any>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [promoProduct, setPromoProduct] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(false);
        // 1. Fetch all categories
        const catRes = await fetch(`${API_BASE_URL}/categories`);
        const catData = await catRes.json();

        if (catData.success) {
          const allCats = catData.data;

          // Virtual "Kitchen Equipments" page (no DB category): aggregate every
          // MAIN category as a heading section, minus the non-kitchen departments.
          if (categorySlug === 'kitchen-equipment') {
            const EXCLUDE = new Set(['kitchen-equipment', 'stainless-steel-fabrications', 'supermarket', 'laundry']);
            setCategory({
              name: 'Kitchen Equipments',
              name_ar: 'معدات المطبخ',
              description: 'Explore our full range of commercial kitchen equipment — from coffee machines and refrigeration to cooking lines, ovens, and food preparation. Browse every category below.',
              description_ar: 'استكشف مجموعتنا الكاملة من معدات المطابخ التجارية — من ماكينات القهوة والتبريد إلى خطوط الطهي والأفران وتحضير الطعام. تصفّح جميع الفئات أدناه.'
            });

            const mains = sortByOrderIndex(
              allCats.filter((c: any) => !c.parent_id && c.is_active && !EXCLUDE.has(c.slug))
            ).map((main: any) => {
              // sub-categories, each carrying its own sub-sub-categories
              const subs = sortByOrderIndex(
                allCats.filter((sub: any) => sub.parent_id === main.id && sub.is_active)
              ).map((sub: any) => ({
                ...sub,
                subCategories: sortByOrderIndex(
                  allCats.filter((ss: any) => ss.parent_id === sub.id && ss.is_active)
                )
              }));
              return { ...main, subCategories: subs };
            });

            // Fetch each main's products (a main slug also covers its sub /
            // sub-sub products) — gives counts AND a pool to build the promo +
            // "Top products" rail strictly from the listed categories.
            const mainsWithProducts = await Promise.all(mains.map(async (m: any) => {
              try {
                const mSlug = m.slug || m.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                const pRes = await fetch(`${API_BASE_URL}/products?category=${mSlug}&limit=5&sort=price_desc`);
                const pData = await pRes.json();
                return { ...m, products_count: pData.total || 0, _products: pData.data || [] };
              } catch (err) {
                return { ...m, products_count: 0, _products: [] };
              }
            }));

            setSubCategories(mainsWithProducts.map(({ _products, ...m }: any) => m));

            // Pool products across the listed categories, dedupe, take top by price.
            const seen = new Set<number>();
            const pool: any[] = [];
            for (const m of mainsWithProducts) {
              for (const p of m._products) {
                if (!seen.has(p.id)) { seen.add(p.id); pool.push(p); }
              }
            }
            pool.sort((a, b) => Number(b.offer_price || b.price) - Number(a.offer_price || a.price));
            if (pool.length > 0) {
              setPromoProduct(pool[0]);
              setTopProducts(pool.slice(1, 5));
            }
            return;
          }

          const activeCat = allCats.find((c: any) => c.slug === categorySlug);

          if (activeCat) {
            setCategory(activeCat);

            // 2. Build sub-categories tree, sorted by order_index (slot-based)
            const subs = sortByOrderIndex(
              allCats.filter((c: any) => c.parent_id === activeCat.id && c.is_active)
            ).map((sub: any) => {
                const subSubs = sortByOrderIndex(
                  allCats.filter((ss: any) => ss.parent_id === sub.id && ss.is_active)
                );
                return { ...sub, subCategories: subSubs };
              });

            // Wait for counts concurrently for the main subcategories
            const subsWithCounts = await Promise.all(subs.map(async (sub: any) => {
              try {
                const subSlug = sub.slug || sub.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                const pRes = await fetch(`${API_BASE_URL}/products?category=${subSlug}&limit=1`);
                const pData = await pRes.json();
                return { ...sub, products_count: pData.total || 0 };
              } catch (err) {
                return { ...sub, products_count: 0 };
              }
            }));

            setSubCategories(subsWithCounts);

            // 3. Fetch top products and brands in parallel
            const [prodRes, brandRes] = await Promise.all([
              fetch(`${API_BASE_URL}/products?category=${categorySlug}&limit=5&sort=price_desc`),
              fetch(`${API_BASE_URL}/brands?all=1`)
            ]);

            const prodData = await prodRes.json();
            if (prodData.success && prodData.data.length > 0) {
              setTopProducts(prodData.data.slice(1, 5));
              setPromoProduct(prodData.data[0]);
            }

            const brandData = await brandRes.json();
            if (brandData.success) {
              const brandIds = activeCat.brand_ids || [];
              const matchedBrands = brandData.data.filter((b: any) => brandIds.includes(b.id));
              setBrands(matchedBrands);
            }
          }
        }

      } catch (err) {
        console.error('Error fetching category landing data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [categorySlug, retryCount]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.landingPage}>
        <div className={styles.container}>
          <div className={styles.notFoundWrapper}>
            <div className={styles.notFoundIcon}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h1 className={styles.notFoundTitle}>
              {isArabic ? 'حدث خطأ ما' : 'Something went wrong'}
            </h1>
            <p className={styles.notFoundText}>
              {isArabic
                ? 'تعذّر تحميل بيانات الفئة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'
                : "We couldn't load the category data. Please check your connection and try again."}
            </p>
            <button
              className={styles.backBtn}
              onClick={() => { setError(false); setRetryCount(c => c + 1); }}
            >
              {isArabic ? 'حاول مجدداً' : 'Try again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className={styles.landingPage}>
        <div className={styles.container}>
          <div className={styles.notFoundWrapper}>
            <div className={styles.notFoundIcon}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </div>
            <h1 className={styles.notFoundTitle}>
              {isArabic ? 'الفئة غير موجودة' : 'Category Not Found'}
            </h1>
            <p className={styles.notFoundText}>
              {isArabic
                ? 'عذراً، لم نتمكن من العثور على الفئة التي تبحث عنها. قد تكون تمت إزالتها أو تغيير اسمها.'
                : "Sorry, we couldn't find the category you're looking for. It might have been moved, renamed, or deleted."}
            </p>
            <Link href="/all-categories" className={styles.backBtn}>
              {isArabic ? 'العودة إلى جميع الفئات' : 'Back to All Categories'}
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const resolveImage = (url: string | null) => {
    if (!url) return '/assets/mariot-logo.webp';
    if (url.startsWith('http')) return url;
    return `${MEDIA_BASE_URL}${url}`;
  };

  const categoryName = isArabic && category.name_ar ? category.name_ar : category.name;
  // Prefer the Arabic-specific media when the site is in Arabic, fall back to the default.
  const pickMedia = (en?: string, ar?: string): string | null => (isArabic && ar ? ar : en) || null;
  const categoryBanner = pickMedia(category.banner_url, category.banner_url_ar);

  return (
    <div className={styles.landingPage}>
      {categoryBanner && (
        <div className={styles.categoryBanner}>
          <img
            src={resolveImage(categoryBanner)}
            alt={categoryName}
            className={styles.categoryBannerImg}
          />
        </div>
      )}
      <div className={styles.container}>
        {/* Breadcrumb Area */}
        <div className={styles.breadcrumbWrapper}>
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>{tCommon('home')}</Link>
            <ChevronRight size={14} style={{ margin: '0 8px', opacity: 0.5 }} />
            <span className={styles.breadcrumbItem}>{categoryName}</span>
          </div>
        </div>

        {/* Layout Grid - Starting from the Heading level */}
        <div className={styles.layoutGrid}>
          {/* Left Column: Heading + Grid + Brands */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: (categorySlug === 'cooking-equipment' || categorySlug === 'cooking') ? '0' : '20px' }}>
            {(categorySlug === 'cooking-equipment' || categorySlug === 'cooking') ? (
              <>
                <main className={`${styles.mainArea} ${styles.cookingMainArea}`}>
                  <header className={styles.headerSection}>
                    <div className={styles.offerBadge}>{isArabic ? 'خصم حتى 20%' : 'UP TO 20% OFF'}</div>
                    <h1 className={styles.title}>{categoryName}</h1>
                    <div className={styles.descriptionWrapper}>
                      <p className={styles.description}>
                        {(isArabic && category.description_ar) ? category.description_ar : category.description || `Professional ${category.name} equipment is built to withstand heavy-duty commercial use while ensuring consistent quality in cafes and restaurants. Whether you need an espresso machine or a specialized coffee brewer, we have the right solution for your business needs.`}
                      </p>
                    </div>
                  </header>
                </main>
                <div className={styles.cookingLayout}>
                  {subCategories.map((sub) => {
                    const subSlug = sub.slug || sub.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                    return (
                      <div key={sub.id} className={styles.cookingSection}>
                        <div className={styles.cookingSectionHeader}>
                          <h2 className={styles.cookingSectionTitle}>
                            {isArabic && sub.name_ar ? sub.name_ar : sub.name}
                          </h2>
                          <Link href={`/shop?category=${subSlug}`} className={styles.cookingShopAll}>
                            {t('shopAll')} {sub.products_count > 0 ? `${sub.products_count} ` : ''}products <ChevronRight size={14} />
                          </Link>
                        </div>
                        {(!sub.subCategories || sub.subCategories.length === 0) ? (
                          <div className={styles.emptyStateContainer}>
                            {sub.products_count === 0 ? (
                              <p className={styles.emptyStateText}>
                                {isArabic ? 'لا توجد منتجات متاحة حالياً' : 'No products currently available in this category.'}
                              </p>
                            ) : (
                              <div className={styles.exploreAction}>
                                <p className={styles.emptyStateText}>
                                  {isArabic ? 'اكتشف مجموعة المنتجات في هذه الفئة' : 'Explore the full range of products in this category.'}
                                </p>
                                <Link href={`/shop?category=${subSlug}`} className={styles.exploreBtn}>
                                  {isArabic ? 'تصفح المنتجات' : 'Browse Products'}
                                </Link>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.cookingGrid}>
                            {sub.subCategories?.map((ss: any) => {
                              const ssSlug = ss.slug || ss.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                              return (
                                <Link key={ss.id} href={`/shop?category=${ssSlug}`} className={styles.cookingCard}>
                                  <div className={styles.cookingImageWrapper}>
                                    <Image
                                      src={resolveImage(pickMedia(ss.image_url, ss.image_url_ar))}
                                      alt={ss.name}
                                      width={150}
                                      height={150}
                                      className={styles.cookingImage}
                                      unoptimized
                                    />
                                  </div>
                                  <span className={styles.cookingCardTitle}>
                                    {isArabic && ss.name_ar ? ss.name_ar : ss.name}
                                  </span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <main className={styles.mainArea}>
                <header className={styles.headerSection}>
                  <div className={styles.offerBadge}>{isArabic ? 'خصم حتى 20%' : 'UP TO 20% OFF'}</div>
                  <h1 className={styles.title}>{categoryName}</h1>
                  <div className={styles.descriptionWrapper}>
                    <p className={styles.description}>
                      {(isArabic && category.description_ar) ? category.description_ar : category.description || `Professional ${category.name} equipment is built to withstand heavy-duty commercial use while ensuring consistent quality in cafes and restaurants. Whether you need an espresso machine or a specialized coffee brewer, we have the right solution for your business needs.`}
                    </p>
                  </div>
                </header>
                <div className={styles.categoryGrid}>
                  {subCategories.map((sub) => {
                    const subSlug = sub.slug || sub.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                    return (
                      <div key={sub.id} className={styles.categoryCard}>
                        <Link href={`/shop?category=${subSlug}`} className={styles.imageWrapper}>
                          <Image
                            src={resolveImage(pickMedia(sub.image_url, sub.image_url_ar))}
                            alt={sub.name}
                            width={250}
                            height={250}
                            className={styles.cardImage}
                            unoptimized
                          />
                        </Link>
                        <div className={styles.cardContent}>
                          <Link href={`/shop?category=${subSlug}`} className={styles.cardTitle}>
                            {isArabic && sub.name_ar ? sub.name_ar : sub.name}
                          </Link>
                          <p className={styles.cardDescription}>
                            {(isArabic && sub.description_ar) ? sub.description_ar : sub.description || `Choosing a reliable ${sub.name.toLowerCase()} is essential to meet the needs of specialty coffee...`}
                          </p>

                          <ul className={styles.subList}>
                            {sub.subCategories?.slice(0, 4).map((ss: any) => {
                              const ssSlug = ss.slug || ss.name?.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
                              return (
                                <li key={ss.id}>
                                  <Link href={`/shop?category=${ssSlug}`} className={styles.subLink}>
                                    <span>{isArabic && ss.name_ar ? ss.name_ar : ss.name}</span>
                                    <ChevronRight size={14} className={styles.chevron} />
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                          <div className={styles.shopAllWrapper}>
                            <Link href={`/shop?category=${subSlug}`} className={styles.shopAll}>
                              {t('shopAll')} {sub.products_count > 0 ? `${sub.products_count} ` : ''}products <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </main>
            )}

            {/* Popular Brands Section - After categories in the same column */}
            {brands.length > 0 && (
              <section className={styles.brandsSection} style={{ marginTop: 0 }}>
                <h2 className={styles.brandsHeading}>{t('popularBrands')}</h2>
                <div className={styles.brandsGrid}>
                  {brands.map((brand: any) => (
                    <Link
                      key={brand.id}
                      href={`/shop?brand=${encodeURIComponent(brand.slug || brand.name.toLowerCase().replace(/ /g, '-'))}`}
                      className={styles.brandCard}
                    >
                      <div className={styles.brandLogoWrapper}>
                        {pickMedia(brand.image_url, brand.image_url_ar) ? (
                          <img
                            src={pickMedia(brand.image_url, brand.image_url_ar) || ''}
                            alt={isArabic && brand.name_ar ? brand.name_ar : brand.name}
                            className={styles.brandLogo}
                          />
                        ) : (
                          <span className={styles.brandFallbackText}>
                            {isArabic && brand.name_ar ? brand.name_ar : brand.name}
                          </span>
                        )}
                      </div>
                      <span className={styles.brandName}>
                        {isArabic && brand.name_ar ? brand.name_ar : brand.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Talk to Expert */}
            <a href="https://wa.me/97142882777" target="_blank" className={styles.expertCard}>
              <div className={styles.expertIconWrapper}>
                <Headphones size={22} />
              </div>
              <div className={styles.expertInfo}>
                <span className={styles.expertLabel}>{isArabic ? 'لست متأكداً مما تحتاج؟' : 'Not sure what you need?'}</span>
                <span className={styles.expertAction}>{isArabic ? 'تحدث مع خبير الآن' : 'Talk to an expert now'}</span>
              </div>
            </a>

            {/* Promo Card */}
            {promoProduct && (
              <Link href={`/product/${promoProduct.slug}`} className={styles.promoCard} style={{ textDecoration: 'none' }}>
                <div className={styles.promoHeader}>{isArabic ? 'حل مميز' : 'Featured Solution'}</div>
                <div className={styles.promoContent}>
                  <img src={resolveImage(promoProduct.primary_image)} alt={isArabic && promoProduct.name_ar ? promoProduct.name_ar : promoProduct.name} className={styles.promoImage} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/mariot-logo.webp'; }} />
                  <div className={styles.promoText}>
                    <span className={styles.promoTitle}>{isArabic && promoProduct.name_ar ? promoProduct.name_ar : promoProduct.name}</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{isArabic ? 'دقة تقنية وموثوقية.' : 'Technical precision and reliability.'}</span>
                  </div>
                </div>
              </Link>
            )}

            {/* Top Products */}
            {topProducts.length > 0 && (
              <div className={styles.topProducts}>
                <h3 className={styles.sectionTitle}>{isArabic ? 'أفضل المنتجات' : 'Top products'}</h3>
                <div className={styles.productList}>
                  {topProducts.map((prod) => (
                    <Link key={prod.id} href={`/product/${prod.slug}`} className={styles.productMini}>
                      <div className={styles.miniImgWrapper}>
                        <img src={resolveImage(prod.primary_image)} alt={prod.name} className={styles.miniImg} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/mariot-logo.webp'; }} />
                      </div>
                      <div className={styles.miniDetails}>
                        <span className={styles.miniName}>{isArabic && prod.name_ar ? prod.name_ar : prod.name}</span>
                        <span className={styles.miniPrice}><CurrencyPrice amount={Number(prod.offer_price || prod.price)} /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div >
      </div >
    </div >
  );
};

export default CategoryLanding;
