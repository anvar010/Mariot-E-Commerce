import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    localePrefix: 'always'
});

export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

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
    matcher: ['/((?!api|_next|_vercel|assets|.*\\..*).*)']
};
