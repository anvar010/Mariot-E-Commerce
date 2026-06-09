import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'تم تأكيد الطلب | متجر ماريوت' : 'Order Confirmed | Mariot Store',
        description: isArabic
            ? 'تم استلام طلبك بنجاح. شكرًا لاختيارك ماريوت.'
            : 'Your order has been received successfully. Thank you for choosing Mariot.',
        robots: { index: false, follow: false },
    };
}

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
