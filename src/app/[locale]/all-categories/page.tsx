import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import CategoriesLayout from '@/components/Categories/CategoriesLayout';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import type { Metadata } from 'next';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const isArabic = locale === 'ar';
    return {
        title: isArabic ? 'تصفح جميع فئات معدات المطابخ | ماريوت' : 'Browse Kitchen Equipment Categories | Mariot Store',
        description: isArabic ? 'اكتشف مجموعتنا الشاملة من معدات المطابخ التجارية، وآلات القهوة، والثلاجات.' : 'Explore our comprehensive selection of commercial kitchen equipment, coffee machines, refrigeration, and more.',
        openGraph: {
            title: isArabic ? 'فئات المنتجات | ماريوت' : 'Product Categories | Mariot Store',
            url: `https://mariotstore.com/${locale}/all-categories`,
            type: 'website',
        }
    };
}

export default function CategoriesPage() {
    return (
        <main>
            <Header />
            <CategoriesLayout />
            <Footer />
            <FloatingActions />
        </main>
    );
}
