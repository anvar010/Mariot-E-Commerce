import { Metadata } from 'next';
import React from 'react';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;

    const {
        locale
    } = params;

    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/contact',
        title: isArabic
            ? 'تواصل معنا – معدات المطابخ في دبي | ماريوت'
            : 'Contact Mariot – Kitchen Equipment Dubai | Call or Visit',
        description: isArabic
            ? 'تواصل مع فريق ماريوت لمعدات المطابخ التجارية في دبي للحصول على عرض سعر أو دعم المنتجات. نخدم الإمارات ودول الخليج والعملاء حول العالم.'
            : 'Get in touch with the Mariot commercial kitchen equipment team in Dubai for a quotation, product support or B2B enquiries. Serving the UAE, GCC and worldwide.',
        ogTitle: isArabic ? 'تواصل معنا | ماريوت' : 'Contact Us | Mariot Store',
    });
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
