'use client';

import React, { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ChevronRight, Headphones } from 'lucide-react';
import styles from './CategoryLanding.module.css';
import { API_BASE_URL, MEDIA_BASE_URL } from '@/config';
import { useLocale, useTranslations } from 'next-intl';
import Loader from '@/components/shared/Loader/Loader';

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
          const activeCat = allCats.find((c: any) => c.slug === categorySlug);

          if (activeCat) {
            setCategory(activeCat);

            // 2. Build sub-categories tree
            const subs = allCats
              .filter((c: any) => c.parent_id === activeCat.id && c.is_active)
              .map((sub: any) => {
                const subSubs = allCats.filter((ss: any) => ss.parent_id === sub.id && ss.is_active);
                return { ...sub, subCategories: subSubs };
              });
            setSubCategories(subs);

            // 3. Fetch top products and brands in parallel
            const [prodRes, brandRes] = await Promise.all([
              fetch(`${API_BASE_URL}/products?category=${categorySlug}&limit=5&sort=price_desc`),
              fetch(`${API_BASE_URL}/brands`)
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
    if (!url) return '/assets/placeholder-image.webp';
    if (url.startsWith('http')) return url;
    return `${MEDIA_BASE_URL}${url}`;
  };

  const categoryName = isArabic && category.name_ar ? category.name_ar : category.name;

  return (
    <div className={styles.landingPage}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <main className={styles.mainArea}>
              <header className={styles.headerSection}>
                <div className={styles.offerBadge}>UP TO 20% OFF</div>
                <h1 className={styles.title}>{categoryName}</h1>
                <div className={styles.descriptionWrapper}>
                  <p className={styles.description}>
                    {category.description || `Professional ${category.name} equipment is built to withstand heavy-duty commercial use while ensuring consistent quality in cafes and restaurants. Whether you need an espresso machine or a specialized coffee brewer, we have the right solution for your business needs.`}
                  </p>
                </div>
              </header>

              <div className={styles.categoryGrid}>
                {subCategories.map((sub) => (
                  <div key={sub.id} className={styles.categoryCard}>
                    <Link href={`/shop?category=${sub.slug}`} className={styles.imageWrapper}>
                      <Image
                        src={resolveImage(sub.image_url)}
                        alt={sub.name}
                        width={250}
                        height={250}
                        className={styles.cardImage}
                        unoptimized
                      />
                    </Link>
                    <div className={styles.cardContent}>
                      <Link href={`/shop?category=${sub.slug}`} className={styles.cardTitle}>
                        {isArabic && sub.name_ar ? sub.name_ar : sub.name}
                      </Link>
                      <p className={styles.cardDescription}>
                        {sub.description || `Choosing a reliable ${sub.name.toLowerCase()} is essential to meet the needs of specialty coffee...`}
                      </p>

                      <ul className={styles.subList}>
                        {sub.subCategories?.slice(0, 4).map((ss: any) => (
                          <li key={ss.id}>
                            <Link href={`/shop?category=${ss.slug}`} className={styles.subLink}>
                              <span style={{ flex: 1 }}>{isArabic && ss.name_ar ? ss.name_ar : ss.name}</span>
                              <ChevronRight className={styles.chevron} size={14} />
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link href={`/shop?category=${sub.slug}`} className={styles.shopAll}>
                            {t('shopAll')} <ChevronRight size={14} />
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </main>

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
                        {brand.image_url ? (
                          <img
                            src={brand.image_url}
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
                <span className={styles.expertLabel}>Not sure what you need?</span>
                <span className={styles.expertAction}>Talk to an expert now</span>
              </div>
            </a>

            {/* Promo Card */}
            {promoProduct && (
              <div className={styles.promoCard}>
                <div className={styles.promoHeader}>Featured Solution</div>
                <div className={styles.promoContent}>
                  <img src={resolveImage(promoProduct.primary_image)} alt={promoProduct.name} className={styles.promoImage} />
                  <div className={styles.promoText}>
                    <span className={styles.promoTitle}>{promoProduct.name}</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Technical precision and reliability.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Products */}
            {topProducts.length > 0 && (
              <div className={styles.topProducts}>
                <h3 className={styles.sectionTitle}>Top products</h3>
                <div className={styles.productList}>
                  {topProducts.map((prod) => (
                    <Link key={prod.id} href={`/product/${prod.slug}`} className={styles.productMini}>
                      <div className={styles.miniImgWrapper}>
                        <img src={resolveImage(prod.primary_image)} alt={prod.name} className={styles.miniImg} />
                      </div>
                      <div className={styles.miniDetails}>
                        <span className={styles.miniName}>{prod.name}</span>
                        <span className={styles.miniPrice}>AED {prod.offer_price || prod.price}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CategoryLanding;
