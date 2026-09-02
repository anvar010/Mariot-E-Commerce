import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * The storefront the shop actually trades under. Hostinger also exposes the same app on an
 * auto-generated *.hostingersite.com hostname, and that copy is broken in ways that are
 * invisible until someone tries to buy something: the API rejects it (not in the CORS
 * allowlist), brand logos are refused as hotlinks, and — the costly one — Stripe will not
 * offer Apple Pay or Google Pay, because wallets are only enabled on domains registered with
 * Stripe. It is also a duplicate of the whole shop for search engines.
 *
 * Sending it to the canonical host is simpler than keeping four separate allowlists in step.
 */
const CANONICAL_HOST = 'uae.mariotstore.com';

export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const host = req.headers.get('host') || '';
    if (host.endsWith('.hostingersite.com')) {
        const url = req.nextUrl.clone();
        url.host = CANONICAL_HOST;
        url.protocol = 'https:';
        url.port = '';
        // Permanent: this hostname is never the right address, so browsers and crawlers
        // should stop asking for it.
        return NextResponse.redirect(url, 308);
    }

    // Check if it's an admin route with Arabic locale
    if (pathname.startsWith('/ar/admin')) {
        const newPathname = pathname.replace('/ar/admin', '/en/admin');
        const url = req.nextUrl.clone();
        url.pathname = newPathname;
        return NextResponse.redirect(url);
    }

    return intlMiddleware(req);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|assets|favicon.ico|.*\\..*).*)']
};
