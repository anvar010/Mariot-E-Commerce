import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'لوحة البائع | متجر ماريوت' : 'Seller Dashboard | Mariot Store',
        description: isArabic
            ? 'إدارة منتجاتك وطلباتك على ماريوت من لوحة بائع متكاملة.'
            : 'Manage your Mariot products and orders from one seller dashboard.',
        robots: { index: false, follow: false },
    };
}

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
