import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const isArabic = params.locale === 'ar';
    return {
        title: isArabic ? 'إعادة تعيين كلمة المرور | متجر ماريوت' : 'Reset Password | Mariot Store',
        description: isArabic
            ? 'حدّد كلمة مرور جديدة لحسابك على ماريوت.'
            : 'Set a new password for your Mariot account.',
        robots: { index: false, follow: false },
    };
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
