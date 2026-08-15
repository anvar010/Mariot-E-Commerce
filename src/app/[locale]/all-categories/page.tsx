import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import CategoriesLayout from '@/components/Categories/CategoriesLayout';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;

    const {
        locale
    } = params;

    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/all-categories',
        title: isArabic
            ? 'جميع فئات معدات المطابخ | الإمارات والخليج'
            : 'All Kitchen Equipment Categories | UAE & GCC',
        description: isArabic
            ? 'تصفح جميع فئات معدات المطابخ التجارية لدى ماريوت: التبريد وآلات القهوة وأفران المخابز والطهي والتحضير، مع التوصيل إلى الخليج والعالم.'
            : 'Browse every commercial kitchen equipment category at Mariot: refrigeration, coffee machines, bakery ovens, cooking and prep. Delivered GCC-wide and worldwide.',
        ogTitle: isArabic ? 'فئات المنتجات | ماريوت' : 'Product Categories | Mariot Store',
    });
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
