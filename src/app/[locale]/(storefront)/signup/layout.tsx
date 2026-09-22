import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'إنشاء حساب | متجر ماريوت' : 'Create Account | Mariot Store',
        description: isArabic
            ? 'أنشئ حساب أعمال مجاني على ماريوت للوصول إلى عروض الأسعار المخصصة وإدارة طلباتك بسهولة.'
            : 'Create a free Mariot business account for tailored quotations and easy order management.',
        robots: { index: false, follow: true },
    };
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
