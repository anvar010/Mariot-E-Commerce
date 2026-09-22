import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'تسجيل الدخول | متجر ماريوت' : 'Sign In | Mariot Store',
        description: isArabic
            ? 'سجّل الدخول إلى حسابك على ماريوت لإدارة طلباتك ومتابعة عروض الأسعار.'
            : 'Sign in to your Mariot account to manage orders, quotations and saved equipment.',
        robots: { index: false, follow: true },
    };
}

export default function SigninLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
