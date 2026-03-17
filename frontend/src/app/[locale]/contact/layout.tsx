import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const isArabic = locale === 'ar';
    return {
        title: isArabic ? 'تواصل معنا | متجر ماريوت' : 'Contact Us | Mariot Store',
        description: isArabic ? 'تواصل مع فريق ماريوت لمعدات المطابخ. نحن هنا لمساعدتك في أي استفسارات تخص أعمالك.' : 'Get in touch with the Mariot Kitchen Equipment team. We are here to help you with your B2B inquiries and product support.',
        openGraph: {
            title: isArabic ? 'تواصل معنا | ماريوت' : 'Contact Us | Mariot Store',
            url: `https://mariotstore.com/${locale}/contact`,
            type: 'website',
        }
    };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
