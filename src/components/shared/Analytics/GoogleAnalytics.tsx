'use client';

import Script from 'next/script';

/**
 * Google Analytics 4.
 *
 * The id comes from NEXT_PUBLIC_GA_ID rather than being written into the code, so the
 * property can be changed, or analytics switched off entirely, without a code change. With
 * no id set nothing is rendered and no request is made -- which is also what keeps local
 * development and preview builds out of the production property's data.
 *
 * afterInteractive rather than beforeInteractive: analytics must never sit in front of the
 * page rendering. A shop measures worse when it loads slower.
 *
 * Note that CSP has to allow googletagmanager.com in script-src and google-analytics.com in
 * connect-src, or this loads and silently reports nothing. See next.config.mjs.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalytics() {
    if (!GA_ID) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_ID}');
                `}
            </Script>
        </>
    );
}
