import React from 'react';
import { redirect } from 'next/navigation';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import CategoryLanding from '@/components/Categories/CategoryLanding/CategoryLanding';
import CategoryProductIndex from '@/components/Categories/CategoryProductIndex/CategoryProductIndex';
import { Metadata } from 'next';
import { API_BASE_URL } from '@/config';
import { localeAlternates, ogLocale, SITE_URL, SITE_NAME } from '@/lib/seo';

// Categories that should skip the landing page and open the filtered product
// listing directly (brand / price / in-stock filters). Add slugs here as needed.
const DIRECT_TO_SHOP_SLUGS = ['parts', 'parts-accessories'];

interface CategoryPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
  const params = await props.params;
  const { slug, locale } = params;
  const isArabic = locale === 'ar';

  try {
    const res = await fetch(`${API_BASE_URL}/categories`);
    const data = await res.json();
    const category = data.data?.find((c: any) => c.slug === slug);
    
    if (category) {
      const title = isArabic && category.name_ar ? category.name_ar : category.name;
      const desc = (isArabic && category.description_ar ? category.description_ar : category.description)
        || `Buy professional ${title} from Mariot Store, delivered across the UAE, GCC and worldwide.`;
      return {
        title: `${title} | Mariot Store`,
        description: desc,
        alternates: localeAlternates(locale, `/category/${slug}`),
        openGraph: {
          title: `${title} | Mariot Store`,
          description: desc,
          url: `https://mariotstore.com/${locale}/category/${slug}`,
          siteName: 'Mariot Kitchen Equipment',
          type: 'website',
          ...ogLocale(locale),
        },
      };
    }
  } catch (err) {
    console.error('Metadata fetch error:', err);
  }

  return {
    title: 'Category | Mariot Store',
    alternates: localeAlternates(locale, `/category/${slug}`),
  };
}

const CategoryPage = async (props: CategoryPageProps) => {
  const params = await props.params;

  // Parts (and any slug listed above) go straight to the shop listing with
  // brand/price/in-stock filters instead of a category landing page.
  if (DIRECT_TO_SHOP_SLUGS.includes(params.slug.toLowerCase())) {
    redirect(`/${params.locale}/shop?category=${params.slug}`);
  }

  const isArabic = params.locale === 'ar';

  // Looked up on the server so the schema and the index heading carry the real category
  // name rather than the slug. A failed lookup falls back to the slug rather than blocking
  // the page.
  let categoryName = params.slug.replace(/-/g, ' ');
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const cat = data?.data?.find((c: any) => c.slug === params.slug);
    if (cat) categoryName = (isArabic && cat.name_ar) ? cat.name_ar : cat.name;
  } catch { /* fall back to the slug */ }

  const url = `${SITE_URL}/${params.locale}/category/${params.slug}`;

  /**
   * Breadcrumbs and a CollectionPage declaration -- neither existed on this route.
   * Breadcrumbs are what render the trail under a search result, and CollectionPage tells
   * an answer engine this page lists products rather than being one.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isArabic ? 'الرئيسية' : 'Home', item: `${SITE_URL}/${params.locale}` },
          { '@type': 'ListItem', position: 2, name: isArabic ? 'الفئات' : 'Categories', item: `${SITE_URL}/${params.locale}/all-categories` },
          { '@type': 'ListItem', position: 3, name: categoryName, item: url },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: categoryName,
        url,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
    ],
  };

  return (
    <main>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoryLanding categorySlug={params.slug} />
      {/* Rendered on the server: the interactive listing above fetches after mount, so
          without this a crawler reached this page and found no link to any product. */}
      <CategoryProductIndex
        categorySlug={params.slug}
        locale={params.locale}
        heading={isArabic ? `كل منتجات ${categoryName}` : `All ${categoryName} products`}
      />
      <Footer />
    </main>
  );
};

export default CategoryPage;
