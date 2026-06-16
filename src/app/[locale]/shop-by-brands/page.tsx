import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import BrandsLayout from '@/components/Brands/BrandsLayout';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import { SITE_URL, localeAlternates, ogLocale } from '@/lib/seo';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await props.params;
    const isArabic = locale === 'ar';
    const title = isArabic ? 'أفضل ماركات معدات المطابخ | متجر ماريوت' : 'Top Kitchen Equipment Brands | Mariot Store';
    const description = isArabic
        ? 'تسوّق حسب الماركة واكتشف معدات من كبرى الشركات العالمية مثل لا مارزوكو وراشيونال وهوشيزاكي. نتعامل فقط مع أفضل المصنّعين.'
        : 'Shop by brand and find industry-leading equipment from La Marzocco, Rational, Hoshizaki, and more. We only partner with the best global manufacturers.';
    return {
        title,
        description,
        alternates: localeAlternates(locale, '/shop-by-brands'),
        openGraph: {
            title,
            description,
            url: `${SITE_URL}/${locale}/shop-by-brands`,
            siteName: 'Mariot Kitchen Equipment',
            type: 'website',
            ...ogLocale(locale),
        },
    };
}

const BrandsPage = () => {
    return (
        <main>
            <Header />
            <Suspense fallback={<div>Loading brands...</div>}>
                <BrandsLayout />
            </Suspense>
            <FloatingActions />
            <Footer />
        </main>
    );
};

export default BrandsPage;
