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
            ? 'تسوّق الآن معدات المطابخ | الإمارات والخليج'
            : 'Shop Now – Commercial Kitchen Equipment | UAE & GCC',
        description: isArabic
            ? 'تصفح مجموعة ماريوت الكاملة من معدات المطابخ التجارية بأفضل الأسعار، مع التوصيل إلى الإمارات ودول الخليج والشحن الدولي.'
            : 'Browse the full Mariot range of commercial kitchen equipment at the best prices, with delivery across the UAE, the GCC and worldwide shipping.',
        ogTitle: isArabic ? 'تسوّق الآن | ماريوت' : 'Shop Now | Mariot Store',
    });
}

export default function ShopNowLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
