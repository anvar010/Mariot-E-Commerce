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
  const [category, setCategory] = useState<any>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [promoProduct, setPromoProduct] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
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

      } catch (error) {
        console.error('Error fetching category landing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [categorySlug]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </div>
    );
  }

  if (!category) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '100px 0', textAlign: 'center' }}>
          <h2>Category not found</h2>
          <Link href="/all-categories" className={styles.readMoreBtn}>Back to all categories</Link>
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
          {/* Left Column: Heading + Grid */}
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

        {/* Popular Brands Section - Separate container but same width alignment */}
        {brands.length > 0 && (
          <div className={styles.layoutGrid} style={{ marginTop: '-10px' }}>
            <section className={styles.brandsSection}>
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
            <div /> {/* Empty space to maintain width alignment with mainArea card above */}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryLanding;
