// Single source of truth for "which sites may use this backend".
//
// Two different rules are driven from this one list:
//   - CORS, which governs browser fetch/XHR against /api/v1/* (see app.js)
//   - the hotlink guard on /uploads and /product_images, which governs whether another
//     site may embed our media (see app.js)
//
// CORS alone does NOT protect images: browsers do not apply it to <img src>, so a
// competitor can embed our files no matter what the CORS list says. That is why the
// media guard checks Referer instead. Referer is client-supplied and therefore
// spoofable -- this stops casual hotlinking and the bandwidth it costs, it is not a
// security boundary.
//
// ALLOWED_ORIGINS replaces this list outright when set (comma-separated), so production
// can lock the set down without a redeploy. FRONTEND_URL stays additive for compatibility.
// Careful: setting ALLOWED_ORIGINS without our own storefront in it will block our own site.
const DEFAULT_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.0.100:3000',
    'https://uae.mariotstore.com',
    'https://mariotstore.com',
    'https://www.mariotstore.com',
    'https://api.mariotstore.com',
    // TEMPORARY -- the auto-generated hostname of the new storefront site, so it can be
    // tested against this API before mariotstore.com is attached to it. Remove once the
    // real domain is live.
    //
    // Listed by exact hostname on purpose. A wildcard for *.hostingersite.com would let
    // any Hostinger customer's site call this API and embed our media, since every site
    // on the platform gets one of these names.
    'https://lightsalmon-leopard-120325.hostingersite.com',
];

const fromEnv = (value) => (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : []);

// "https://Site.com/" and "https://site.com" are the same origin; keep one spelling.
const normalizeOrigin = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    try {
        return new URL(raw).origin.toLowerCase();
    } catch {
        const stripped = raw.replace(/\/+$/, '').toLowerCase();
        return stripped || null;
    }
};

const configured = process.env.ALLOWED_ORIGINS ? fromEnv(process.env.ALLOWED_ORIGINS) : DEFAULT_ORIGINS;
const allowedOrigins = [...configured, ...fromEnv(process.env.FRONTEND_URL)];
const allowedSet = new Set(allowedOrigins.map(normalizeOrigin).filter(Boolean));

const isAllowedOrigin = (origin) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) return false;
    if (allowedSet.has(normalized)) return true;
    // Preview deployments.
    try {
        return new URL(normalized).hostname.endsWith('.vercel.app');
    } catch {
        return false;
    }
};

// A Referer is a full URL ("https://site.com/page?x=1"); only its origin matters here.
const isAllowedReferer = (referer) => isAllowedOrigin(referer);

console.log('[origins] allowing', Array.from(allowedSet).join(', '));

module.exports = { allowedOrigins: Array.from(allowedSet), isAllowedOrigin, isAllowedReferer };
