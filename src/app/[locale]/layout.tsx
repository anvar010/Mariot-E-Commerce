import React from 'react';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Providers from './providers';
import DeferredChrome from './DeferredChrome';
import { Inter, Alexandria } from 'next/font/google';
import { localeAlternates, ogLocale } from '@/lib/seo';

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

// NOTE: do NOT set `dynamic = 'force-dynamic'` here. This layout wraps every
// route under /[locale]; forcing it dynamic opts the whole app out of the
// full-route cache and negates per-fetch `revalidate` (ISR). Pages that truly
// need per-request rendering (e.g. today-offers) declare `force-dynamic`
// themselves. Everything else is statically generated / ISR-cached.

export function generateStaticParams() {
    return [{ locale: 'en' }, { locale: 'ar' }];
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;

    const {
        locale
    } = params;

    const isArabic = locale === 'ar';

    return {
        title: isArabic ? 'ماريوت | أفضل مورد لمعدات المطابخ في الإمارات' : 'Mariot | Best Kitchen Equipment Supplier in UAE',
        description: isArabic ? 'معدات مطابخ فاخرة وتجارية في الإمارات العربية المتحدة' : 'Premium Commercial Kitchen Equipment in UAE',
        icons: {
            icon: '/favicon.ico',
            shortcut: '/favicon.ico',
            apple: '/favicon.ico',
        },
        alternates: localeAlternates(locale, ''),
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
            ...ogLocale(locale),
            type: 'website',
        }
    };
}

export default async function LocaleLayout(
    props: Readonly<{
        children: React.ReactNode;
        params: Promise<{ locale: string }>;
    }>
) {
    const params = await props.params;

    const {
        locale
    } = params;

    const {
        children
    } = props;

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
                <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
            </head>
            <body suppressHydrationWarning>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>
                        <DeferredChrome />
                        {children}
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
