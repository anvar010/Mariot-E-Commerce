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
        title: isArabic
            ? 'ماريوت | مورد معدات المطابخ في الإمارات والخليج'
            : 'Kitchen Equipment Supplier UAE & GCC | Mariot Dubai',
        // ~155 chars: long enough that Google shows the whole line rather than padding it
        // with scraped page text, short enough not to be truncated.
        description: isArabic
            ? 'مورد معدات المطابخ التجارية في دبي مع التوصيل إلى الإمارات والسعودية والكويت وعُمان وقطر والبحرين وجميع أنحاء العالم. تجهيز المطاعم والفنادق والمخابز.'
            : 'Commercial kitchen equipment supplier in Dubai, delivering across the UAE, Saudi Arabia, Kuwait, Oman, Qatar, Bahrain and worldwide. Restaurant & hotel gear.',
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
            title: isArabic
                ? 'ماريوت | مورد معدات المطابخ في الإمارات والخليج'
                : 'Kitchen Equipment Supplier UAE & GCC | Mariot Dubai',
            description: isArabic
                ? 'معدات مطابخ تجارية بجودة فائقة مع التوصيل إلى الإمارات ودول الخليج وجميع أنحاء العالم.'
                : 'Premium commercial kitchen equipment with delivery across the UAE, GCC and worldwide.',
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
            title: isArabic
                ? 'ماريوت | مورد معدات المطابخ في الإمارات والخليج'
                : 'Kitchen Equipment Supplier UAE & GCC | Mariot Dubai',
            description: isArabic
                ? 'معدات مطابخ تجارية بجودة فائقة مع التوصيل إلى الإمارات ودول الخليج وجميع أنحاء العالم.'
                : 'Premium commercial kitchen equipment with delivery across the UAE, GCC and worldwide.',
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
