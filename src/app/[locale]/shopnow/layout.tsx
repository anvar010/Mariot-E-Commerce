import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'تسوّق الآن | متجر ماريوت' : 'Shop Now | Mariot Store',
        description: isArabic
            ? 'تصفح مجموعة ماريوت الكاملة من معدات المطابخ التجارية بأفضل الأسعار في الإمارات.'
            : 'Browse the full Mariot range of commercial kitchen equipment at the best UAE prices.',
        openGraph: {
            title: isArabic ? 'تسوّق الآن | ماريوت' : 'Shop Now | Mariot Store',
            url: `https://mariotstore.com/${params.locale}/shopnow`,
            type: 'website',
        }
    };
}

export default function ShopNowLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
