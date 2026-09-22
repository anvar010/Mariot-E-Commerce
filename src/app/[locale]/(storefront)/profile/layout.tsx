import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'حسابي | متجر ماريوت' : 'My Account | Mariot Store',
        description: isArabic
            ? 'إدارة حسابك على ماريوت: الطلبات، عروض الأسعار، العناوين، ونقاط المكافآت.'
            : 'Manage your Mariot account: orders, quotations, addresses and reward points.',
        robots: { index: false, follow: false },
    };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
