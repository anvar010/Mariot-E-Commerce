import { SITE_URL } from '@/lib/seo';

/**
 * Google Shopping product feed.
 *
 * Merchant Center fetches this on a schedule, which is steadier than letting Google crawl
 * the site and infer products from page markup. Crawling produced ghost items: while a
 * product URL answered 200 for any slug, Google built listings out of page titles for
 * products that do not exist, and they sat in the account as "Not approved" with no price.
 * A feed only ever contains rows this code chose to put in it.
 *
 * It also carries fields crawling cannot: condition, MPN, product type, shipping weight.
 *
 * Add it in Merchant Center as a scheduled fetch of https://mariotstore.com/feed/google.xml
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.mariotstore.com/api/v1';
const MEDIA_BASE = API_BASE.replace(/\/api\/v1\/?$/, '');

// Built on request, not at build time.
//
// As a static route this fetched the whole catalogue -- nearly 8MB of JSON -- during every
// deployment, alongside the sitemap doing the same and 2,834 product pages being generated.
// Next logs "items over 2MB can not be cached" for it, so the work was repeated and thrown
// away each time, and on a build container with less memory than a laptop that is enough to
// get the process killed: a build that dies partway with no log output at all.
//
// Merchant Center fetches this once a day, so there was never anything to gain from having
// it ready in advance. The CDN caches the response for an hour, which is what actually
// spares the origin.
export const dynamic = 'force-dynamic';

/** XML text, with the five characters that would otherwise break the document escaped. */
const esc = (v: unknown): string =>
    String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

/** Strips HTML and collapses whitespace. Google rejects markup in a description. */
const plain = (html: unknown, max = 4900): string => {
    const text = String(html ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const imageUrl = (path: unknown): string => {
    const p = String(path ?? '').trim();
    if (!p) return '';
    if (p.startsWith('http')) return p;
    return `${MEDIA_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
};

const priceOf = (p: any): number => {
    const now = Date.now();
    const onOffer = p.offer_price != null && Number(p.offer_price) > 0
        && (!p.offer_start || new Date(p.offer_start).getTime() <= now)
        && (!p.offer_end || new Date(p.offer_end).getTime() >= now);
    return Number(onOffer ? p.offer_price : p.price) || 0;
};

/**
 * The same rule the shop applies: a product is available unless it tracks inventory and has
 * none. Most of the catalogue is "always in stock", where stock_quantity is meaningless.
 */
const inStock = (p: any): boolean => {
    const hasVariants = Number(p.has_variants) === 1
        || (Array.isArray(p.variants) && p.variants.length > 0);
    const tracks = hasVariants || Number(p.track_inventory) === 1;
    return !tracks || Number(p.stock_quantity) > 0;
};

export async function GET() {
    let products: any[] = [];
    try {
        const res = await fetch(`${API_BASE}/products?limit=5000`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(25000),
        });
        const data = await res.json();
        products = data?.success ? (data.data || []) : [];
    } catch (err) {
        console.error('[feed] Could not load products:', err);
        // An empty feed would tell Merchant Center every product has gone and wipe the
        // account's listings. A 503 says "ask again later" and leaves the last good fetch
        // in place, which is the only safe answer when the catalogue cannot be read.
        return new Response('Product feed temporarily unavailable', {
            status: 503,
            headers: { 'Retry-After': '3600' },
        });
    }

    const items: string[] = [];
    let skippedNoImage = 0;
    let skippedNoPrice = 0;
    let skippedOutOfStock = 0;

    for (const p of products) {
        if (Number(p.is_active) === 0) continue;

        const price = priceOf(p);
        const image = imageUrl(p.primary_image || p.images?.[0]?.image_url);

        // Rows Google would reject are left out rather than submitted. A disapproval counts
        // against the account's data quality; an absent row costs nothing.
        if (!image) { skippedNoImage++; continue; }
        if (price <= 0) { skippedNoPrice++; continue; }
        if (!inStock(p)) { skippedOutOfStock++; continue; }

        const slug = String(p.slug || p.id);
        const link = `${SITE_URL}/en/product/${encodeURIComponent(slug)}`;
        const title = plain(p.name, 145);
        const description = plain(p.short_description || p.description) || title;

        items.push(`    <item>
      <g:id>${esc(p.id)}</g:id>
      <g:title>${esc(title)}</g:title>
      <g:description>${esc(description)}</g:description>
      <g:link>${esc(link)}</g:link>
      <g:image_link>${esc(image)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${price.toFixed(2)} AED</g:price>
      <g:condition>new</g:condition>
      <g:brand>${esc(p.brand_name || 'Mariot')}</g:brand>
${p.model ? `      <g:mpn>${esc(p.model)}</g:mpn>\n` : ''}\
      <g:identifier_exists>${p.model ? 'yes' : 'no'}</g:identifier_exists>
${p.category_name ? `      <g:product_type>${esc(p.category_name)}</g:product_type>\n` : ''}\
${Number(p.weight_kg) > 0 ? `      <g:shipping_weight>${Number(p.weight_kg).toFixed(2)} kg</g:shipping_weight>\n` : ''}\
    </item>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Mariot Kitchen Equipment</title>
    <link>${SITE_URL}</link>
    <description>Commercial kitchen equipment supplied across the UAE and GCC.</description>
    <!-- ${items.length} products offered.
         Left out: ${skippedNoImage} with no image, ${skippedNoPrice} with no price,
         ${skippedOutOfStock} out of stock. Google rejects all three, so submitting them
         would only accumulate disapprovals. -->
${items.join('\n')}
  </channel>
</rss>
`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
