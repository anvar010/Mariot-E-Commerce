import React from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import CategoryLanding from '@/components/Categories/CategoryLanding/CategoryLanding';
import { Metadata } from 'next';
import { API_BASE_URL } from '@/config';
import { localeAlternates, ogLocale } from '@/lib/seo';

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
        || `Buy professional ${title} in UAE at Mariot Store.`;
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
  return (
    <main>
      <Header />
      <CategoryLanding categorySlug={params.slug} />
      <Footer />
    </main>
  );
};

export default CategoryPage;
