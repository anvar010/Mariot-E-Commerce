import React from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Providers from './providers';
import CartDrawer from '@/components/Layout/CartDrawer/CartDrawer';
import { Inter, Alexandria } from 'next/font/google';

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

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const isArabic = locale === 'ar';

    return {
        title: isArabic ? 'ماريوت | أفضل مورد لمعدات المطابخ في الإمارات' : 'Mariot | Best Kitchen Equipment Supplier in UAE',
        description: isArabic ? 'معدات مطابخ فاخرة وتجارية في الإمارات العربية المتحدة' : 'Premium Commercial Kitchen Equipment in UAE',
        viewport: {
            width: 'device-width',
            initialScale: 1,
            maximumScale: 1,
            userScalable: false,
        },
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
            </head>
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>
                        <CartDrawer />
                        {children}
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
