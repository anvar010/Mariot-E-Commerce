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

export const metadata: Metadata = {
    title: 'Mariot | Best Kitchen Equipment Supplier in UAE',
    description: 'Premium Kitchen Equipment in UAE',
    icons: {
        icon: '/assets/mariot-icon.webp',
        shortcut: '/assets/mariot-icon.webp',
        apple: '/assets/mariot-icon.webp',
    }
};

export default async function LocaleLayout({
    children,
    params: { locale },
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
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
