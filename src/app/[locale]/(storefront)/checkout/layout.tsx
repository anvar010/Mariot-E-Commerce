import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'إتمام الطلب | متجر ماريوت' : 'Checkout | Mariot Store',
        description: isArabic
            ? 'أكمل عملية الشراء بأمان واختر طريقة الدفع المناسبة لأعمالك.'
            : 'Complete your purchase securely and choose the payment method that suits your business.',
        robots: { index: false, follow: false },
    };
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
