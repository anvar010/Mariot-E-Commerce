import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * The storefront the shop actually trades under.
 *
 * Hostinger also exposes every site on an auto-generated *.hostingersite.com hostname
 * nobody asked for. That copy is broken in ways that stay invisible until someone tries
 * to buy something: the API rejects it (not in the CORS allowlist), brand logos are
 * refused as hotlinks, and Stripe will not offer Apple Pay or Google Pay, because
 * wallets are enabled per registered domain. It is also a duplicate of the whole shop
 * for search engines. So it is sent to the canonical host instead.
 *
 * Set CANONICAL_HOST to move the site to a new domain. Set DISABLE_CANONICAL_REDIRECT
 * to turn the redirect off entirely -- needed while standing a new site up, when the
 * *.hostingersite.com hostname is the only way to reach it before its real domain is
 * attached, and redirecting away from it would make the new site impossible to verify.
 */
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'uae.mariotstore.com';
const CANONICAL_REDIRECT_ENABLED = process.env.DISABLE_CANONICAL_REDIRECT !== '1';

export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];
    if (
        CANONICAL_REDIRECT_ENABLED &&
        host.endsWith('.hostingersite.com') &&
        // Never redirect a host to itself. NextURL ignores a reassigned .host, which is
        // why the first version of this sent that hostname into an endless loop; this
        // guard means a mistake like that fails visibly rather than bricking the page.
        host !== CANONICAL_HOST
    ) {
        // Built as a plain absolute string rather than by mutating req.nextUrl: a cloned
        // NextURL keeps the incoming host regardless of what .host is set to, so the
        // redirect pointed straight back at the hostname it was meant to leave.
        const search = req.nextUrl.search || '';
        // Permanent: this hostname is never the right address, so browsers and crawlers
        // should stop asking for it.
        return NextResponse.redirect(`https://${CANONICAL_HOST}${pathname}${search}`, 308);
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
