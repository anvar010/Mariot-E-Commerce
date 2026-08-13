import { Metadata } from 'next';
import React from 'react';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return pageMetadata({
        locale: params.locale,
        path: '/shopnow',
        title: isArabic
            ? 'تسوّق الآن معدات المطابخ التجارية | ماريوت الإمارات'
            : 'Shop Now – Commercial Kitchen Equipment | Mariot UAE',
        description: isArabic
            ? 'تصفح مجموعة ماريوت الكاملة من معدات المطابخ التجارية بأفضل الأسعار في الإمارات، مع التوصيل إلى دبي وجميع الإمارات.'
            : 'Browse the full Mariot range of commercial kitchen equipment at the best UAE prices, with delivery to Dubai and across the Emirates.',
        ogTitle: isArabic ? 'تسوّق الآن | ماريوت' : 'Shop Now | Mariot Store',
    });
}

export default function ShopNowLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
