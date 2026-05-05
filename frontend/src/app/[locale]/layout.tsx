import React from 'react';
import type { Metadata, Viewport } from 'next';
import dynamicImport from 'next/dynamic';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Providers from './providers';
import { Inter, Alexandria } from 'next/font/google';

// Deferred — not needed for initial render, load after page is interactive
const CartDrawer = dynamicImport(() => import('@/components/Layout/CartDrawer/CartDrawer'), { ssr: false });
const FloatingActions = dynamicImport(() => import('@/components/shared/FloatingActions/FloatingActions'), { ssr: false });
const Promotions = dynamicImport(() => import('@/components/shared/Promotions/Promotions'), { ssr: false });

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

const alexandria = Alexandria({
    subsets: ['latin', 'arabic'],
    display: 'swap',
    variable: '--font-alexandria',
});

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
    return [{ locale: 'en' }, { locale: 'ar' }];
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const isArabic = locale === 'ar';

    return {
        title: isArabic ? 'ماريوت | أفضل مورد لمعدات المطابخ في الإمارات' : 'Mariot | Best Kitchen Equipment Supplier in UAE',
        description: isArabic ? 'معدات مطابخ فاخرة وتجارية في الإمارات العربية المتحدة' : 'Premium Commercial Kitchen Equipment in UAE',
        icons: {
            icon: '/favicon.ico',
            shortcut: '/favicon.ico',
            apple: '/favicon.ico',
        },
        openGraph: {
            title: isArabic ? 'ماريوت | أفضل مورد لمعدات المطابخ في الإمارات' : 'Mariot | Best Kitchen Equipment Supplier in UAE',
            description: isArabic ? 'تصفح مجموعتنا الواسعة من معدات المطابخ. جودة فائقة وأسعار لا تقبل المنافسة.' : 'Browse our wide range of premium commercial kitchen equipment with unbeatable prices.',
            url: `https://mariotstore.com/${locale}`,
            siteName: 'Mariot Kitchen Equipment',
            images: [
                {
                    url: 'https://mariotstore.com/assets/mariot-logo.webp',
                    width: 1200,
                    height: 630,
                    alt: isArabic ? 'ماريوت لمعدات المطابخ' : 'Mariot Kitchen Equipment',
                }
            ],
            locale: isArabic ? 'ar_AE' : 'en_US',
            type: 'website',
        }
    };
}

export default async function LocaleLayout({
    children,
    params: { locale },
}: Readonly<{
    children: React.ReactNode;
    params: { locale: string };
}>) {
    const messages = await getMessages();
    const isRTL = locale === 'ar';

    return (
        <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className={`${inter.variable} ${alexandria.variable}`}>
            <head>
                {/* Preconnect to API origin — skip localhost (no DNS needed) */}
                {process.env.NEXT_PUBLIC_API_BASE_URL && !process.env.NEXT_PUBLIC_API_BASE_URL.includes('localhost') && (
                    <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/v1\/?$/, '')} />
                )}
                <link rel="dns-prefetch" href="https://checkout.tabby.ai" />
                <link rel="dns-prefetch" href="https://accounts.google.com" />
            </head>
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>
                        <Promotions />
                        <CartDrawer />
                        <FloatingActions />
                        {children}
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
