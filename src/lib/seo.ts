import type { Metadata } from 'next';

// Centralized SEO helpers: canonical + hreflang alternates and OpenGraph locale.
// Keep the production origin in ONE place so sitemap/canonicals/JSON-LD agree.
export const SITE_URL = 'https://mariotstore.com';

export const SITE_NAME = 'Mariot Kitchen Equipment';

// Shared share-card image. 1200x630 is the size Facebook/LinkedIn/X all crop from,
// so it is declared once here rather than guessed per page.
export const OG_IMAGE = {
    url: `${SITE_URL}/assets/mariot-logo.webp`,
    width: 1200,
    height: 630,
};

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

type PageMetaInput = {
    locale: string;
    /** Route WITHOUT the locale prefix, e.g. '/shop'. '' for the home page. */
    path: string;
    title: string;
    description: string;
    /** Defaults to `title` / `description` when the share copy is the same. */
    ogTitle?: string;
    ogDescription?: string;
    /** Transactional/account pages: keep them out of the index. */
    noindex?: boolean;
    image?: { url: string; width: number; height: number };
};

/**
 * One call that produces every tag a page needs. Pages must pass their own `path`:
 * metadata from a page merges over the layout's, but any field the page omits is
 * INHERITED — so a page that set only a title kept the layout's canonical, which
 * points at the home page. That silently told Google ~20 routes were duplicates of
 * '/'. Going through this helper makes the canonical impossible to forget.
 */
export function pageMetadata({
    locale,
    path,
    title,
    description,
    ogTitle,
    ogDescription,
    noindex,
    image = OG_IMAGE,
}: PageMetaInput): Metadata {
    const images = [{ ...image, alt: title }];
    return {
        title,
        description,
        alternates: localeAlternates(locale, path),
        ...(noindex ? { robots: { index: false, follow: true } } : {}),
        openGraph: {
            title: ogTitle ?? title,
            description: ogDescription ?? description,
            url: `${SITE_URL}/${locale}${path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : ''}`,
            siteName: SITE_NAME,
            images,
            ...ogLocale(locale),
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle ?? title,
            description: ogDescription ?? description,
            images: [image.url],
        },
    };
}
