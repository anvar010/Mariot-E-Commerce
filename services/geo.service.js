/**
 * Which country is this visitor in?
 *
 * Two sources, cheapest first:
 *   1. A geo header from the CDN/proxy. Free, exact, no latency -- when one is present.
 *      Hostinger's edge may or may not send one, so every common name is checked and the
 *      first hit wins. If one turns up, no lookup ever runs.
 *   2. An IP lookup, cached per address. Only reached when no header is present.
 *
 * Never throws and never blocks for long: a delivery date must still render if this fails,
 * so the caller falls back to the default zone.
 */

// Every CDN spells it differently. Order does not matter -- a request carries at most one.
const HEADER_CANDIDATES = [
    'cf-ipcountry',                 // Cloudflare
    'cloudfront-viewer-country',    // AWS CloudFront
    'x-vercel-ip-country',          // Vercel
    'x-geo-country',
    'x-country-code',
    'x-appengine-country',          // Google
    'fastly-client-country',
    'x-client-geo-country',
];

const LOOKUP_TIMEOUT_MS = Number(process.env.GEO_LOOKUP_TIMEOUT_MS) || 2500;
const CACHE_TTL_MS = Number(process.env.GEO_CACHE_TTL_MS) || 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

const cache = new Map(); // ip -> { code, expires }

/** Logged once so we learn what this edge actually forwards, without noise on every request. */
let headersReported = false;

const isCode = (v) => typeof v === 'string' && /^[A-Za-z]{2}$/.test(v.trim());

const fromHeaders = (req) => {
    for (const name of HEADER_CANDIDATES) {
        const value = req.get(name);
        if (isCode(value)) return value.trim().toUpperCase();
    }
    if (!headersReported) {
        headersReported = true;
        const geoish = Object.keys(req.headers).filter(h => /country|geo|ip-/i.test(h));
        console.log('[geo] no country header; geo-ish headers seen:', geoish.length ? geoish.join(', ') : 'none');
    }
    return null;
};

/** The caller's address, honouring the proxy chain the app already trusts. */
const clientIp = (req) => {
    const fwd = (req.get('x-forwarded-for') || '').split(',')[0].trim();
    const ip = fwd || req.ip || req.socket?.remoteAddress || '';
    return ip.replace(/^::ffff:/, '');
};

const isPrivate = (ip) =>
    !ip || ip === '::1' || /^127\./.test(ip) || /^10\./.test(ip)
    || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

const lookup = async (ip) => {
    const hit = cache.get(ip);
    if (hit && hit.expires > Date.now()) return hit.code;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
        const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, {
            signal: controller.signal,
        });
        const data = await res.json();
        const code = data?.success && isCode(data.country_code) ? data.country_code.toUpperCase() : null;
        if (code) {
            // Bounded so a burst of unique addresses cannot grow this without limit.
            if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
            cache.set(ip, { code, expires: Date.now() + CACHE_TTL_MS });
        }
        return code;
    } catch (err) {
        console.warn('[geo] lookup failed:', err.name === 'AbortError' ? 'timed out' : err.message);
        return null;
    } finally {
        clearTimeout(timer);
    }
};

const resolveCountry = async (req) => {
    const fromHeader = fromHeaders(req);
    if (fromHeader) return { country_code: fromHeader, source: 'header' };

    const ip = clientIp(req);
    if (isPrivate(ip)) return { country_code: null, source: 'private-ip' };

    const code = await lookup(ip);
    return { country_code: code, source: code ? 'lookup' : 'unresolved' };
};

module.exports = { resolveCountry, HEADER_CANDIDATES };
