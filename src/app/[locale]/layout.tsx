import React from 'react';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Providers from './providers';
import DeferredChrome from './DeferredChrome';
import { Inter, Alexandria } from 'next/font/google';
import { localeAlternates, ogLocale, SITE_URL, SITE_NAME, OG_IMAGE } from '@/lib/seo';

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
        // ~155 chars: long enough that Google shows the whole line rather than padding it
        // with scraped page text, short enough not to be truncated.
        description: isArabic
            ? 'ماريوت مورد معدات المطابخ التجارية في الإمارات: آلات القهوة، ومعدات التبريد، وأفران المخابز، ومعدات الطهي للمطاعم والفنادق، مع التوصيل في جميع الإمارات.'
            : 'Mariot supplies commercial kitchen equipment across the UAE — coffee machines, refrigeration, bakery ovens and cooking ranges for restaurants and hotels.',
        icons: {
            icon: '/favicon.ico',
            shortcut: '/favicon.ico',
            apple: '/favicon.ico',
        },
        // Relative URLs in child pages' metadata resolve against this, so a page that
        // forgets an absolute origin still emits a valid tag rather than a bare path.
        metadataBase: new URL(SITE_URL),
        alternates: localeAlternates(locale, ''),
        openGraph: {
            title: isArabic ? 'ماريوت | أفضل مورد لمعدات المطابخ في الإمارات' : 'Mariot | Best Kitchen Equipment Supplier in UAE',
            description: isArabic ? 'تصفح مجموعتنا الواسعة من معدات المطابخ. جودة فائقة وأسعار لا تقبل المنافسة.' : 'Browse our wide range of premium commercial kitchen equipment with unbeatable prices.',
            url: `${SITE_URL}/${locale}`,
            siteName: SITE_NAME,
            images: [
                {
                    ...OG_IMAGE,
                    alt: isArabic ? 'ماريوت لمعدات المطابخ' : 'Mariot Kitchen Equipment',
                }
            ],
            ...ogLocale(locale),
            type: 'website',
        },
        // Without an explicit card X/Twitter falls back to a small thumbnail, and the
        // previous build emitted a single twitter:* tag, so shares rendered untitled.
        twitter: {
            card: 'summary_large_image',
            title: isArabic ? 'ماريوت | أفضل مورد لمعدات المطابخ في الإمارات' : 'Mariot | Best Kitchen Equipment Supplier in UAE',
            description: isArabic
                ? 'تصفح مجموعة ماريوت الواسعة من معدات المطابخ التجارية بجودة فائقة وأسعار لا تقبل المنافسة في الإمارات.'
                : 'Browse our wide range of premium commercial kitchen equipment with unbeatable prices.',
            images: [OG_IMAGE.url],
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
