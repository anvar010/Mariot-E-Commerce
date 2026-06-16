// Centralized SEO helpers: canonical + hreflang alternates and OpenGraph locale.
// Keep the production origin in ONE place so sitemap/canonicals/JSON-LD agree.
export const SITE_URL = 'https://mariotstore.com';

/**
 * Build `alternates` for a page: a per-locale canonical plus hreflang links for
 * en/ar and an x-default. `path` is the route WITHOUT the locale prefix
 * (e.g. '/product/foo', '/category/fryers', or '' for the home page).
 */
export function localeAlternates(locale: string, path: string = '') {
    const p = path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : '';
    return {
        canonical: `${SITE_URL}/${locale}${p}`,
        languages: {
            en: `${SITE_URL}/en${p}`,
            ar: `${SITE_URL}/ar${p}`,
            'x-default': `${SITE_URL}/en${p}`,
        } as Record<string, string>,
    };
}

/** og:locale + og:locale:alternate for the current locale. */
export function ogLocale(locale: string): { locale: string; alternateLocale: string } {
    return {
        locale: locale === 'ar' ? 'ar_AE' : 'en_US',
        alternateLocale: locale === 'ar' ? 'en_US' : 'ar_AE',
    };
}
