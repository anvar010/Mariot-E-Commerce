import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'نسيت كلمة المرور | متجر ماريوت' : 'Forgot Password | Mariot Store',
        description: isArabic
            ? 'استعد الوصول إلى حسابك على ماريوت بإعادة تعيين كلمة المرور عبر البريد الإلكتروني.'
            : 'Reset your Mariot account password securely via email.',
        robots: { index: false, follow: false },
    };
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
