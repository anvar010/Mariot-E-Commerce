'use client';

import Script from 'next/script';

/**
 * Google Tag Manager.
 *
 * A container rather than a measurement tool: it does nothing on its own, and only reports
 * what the tags configured inside it report. Installing this restores whatever the previous
 * container already held -- a GA4 tag, conversion tracking, remarketing pixels -- without
 * any of them being written into this codebase, and lets tags be changed later without a
 * deployment.
 *
 * Set NEXT_PUBLIC_GTM_ID to switch it on. With no id nothing renders and no request is made,
 * which keeps local and preview builds out of production's data.
 *
 * IMPORTANT: if the container already contains a GA4 tag, do NOT also set NEXT_PUBLIC_GA_ID.
 * Both would fire and every pageview would be counted twice.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function GoogleTagManager() {
    if (!GTM_ID) return null;

    return (
        <>
            <Script id="gtm-init" strategy="afterInteractive">
                {`
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','${GTM_ID}');
                `}
            </Script>
            {/* For visitors with JavaScript disabled. Rare, but it costs nothing and GTM's
                own install instructions expect it. */}
            <noscript>
                <iframe
                    src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                    height="0"
                    width="0"
                    style={{ display: 'none', visibility: 'hidden' }}
                    title="Google Tag Manager"
                />
            </noscript>
        </>
    );
}
