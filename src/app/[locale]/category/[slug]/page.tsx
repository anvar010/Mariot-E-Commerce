import React from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import CategoryLanding from '@/components/Categories/CategoryLanding/CategoryLanding';
import { Metadata } from 'next';
import { API_BASE_URL } from '@/config';

interface CategoryPageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug, locale } = params;
  const isArabic = locale === 'ar';
  
  try {
    const res = await fetch(`${API_BASE_URL}/categories`);
    const data = await res.json();
    const category = data.data?.find((c: any) => c.slug === slug);
    
    if (category) {
      const title = isArabic && category.name_ar ? category.name_ar : category.name;
      return {
        title: `${title} | Mariot Store`,
        description: category.description || `Buy professional ${title} in UAE at Mariot Store.`
      };
    }
  } catch (err) {
    console.error('Metadata fetch error:', err);
  }
  
  return {
    title: 'Category | Mariot Store'
  };
}

const CategoryPage = ({ params }: CategoryPageProps) => {
  return (
    <main>
      <Header />
      <CategoryLanding categorySlug={params.slug} />
      <Footer />
    </main>
  );
};

export default CategoryPage;
