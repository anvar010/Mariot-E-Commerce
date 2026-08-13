import type { Metadata } from 'next';
import React from 'react';
import { pageMetadata } from '@/lib/seo';

// page.tsx is a client component and so cannot export metadata itself. Without this
// the route inherited the root layout's tags and rendered under the HOME PAGE title,
// which is also what its canonical pointed at.
//
// The route is a redirect shim into the cart drawer, so it is noindex: there is no
// content to rank, and the destination differs per visitor. `follow` stays on so the
// links it lands on still pass signals.
export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await props.params;
    const isArabic = locale === 'ar';
    return pageMetadata({
        locale,
        path: '/cart',
        noindex: true,
        title: isArabic ? 'سلة التسوق | متجر ماريوت' : 'Your Cart | Mariot Store',
        description: isArabic
            ? 'راجع معدات المطابخ في سلتك، وحدّث الكميات، وأكمل طلبك أو حمّل عرض سعر.'
            : 'Review the kitchen equipment in your cart, update quantities, and check out or download a quotation.',
    });
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
