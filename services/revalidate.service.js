/**
 * Tell the storefront to rebuild a cached page.
 *
 * Product pages are ISR-cached on the Next side, which is what makes them fast to open
 * but also means an edit would sit stale until the revalidate window expires. Calling
 * this after a save gets the change live in about a second instead.
 *
 * Every call is best-effort and never throws: a storefront that is down, slow or simply
 * not configured must not fail the admin's save. The worst case is the old behaviour --
 * the page refreshes itself when its timer expires.
 */

const REVALIDATE_TIMEOUT_MS = 5000;

/**
 * Refresh a product's pages, by slug. Returns nothing and rejects nothing on purpose:
 * callers treat this as fire-and-forget.
 */
const revalidateProduct = async (slug) => {
    const base = process.env.FRONTEND_URL;
    const secret = process.env.REVALIDATE_SECRET;

    // Not configured is a normal state in development, so it is a quiet no-op rather
    // than an error logged on every product save.
    if (!base || !secret || !slug) return;

    try {
        const res = await fetch(`${base.replace(/\/$/, '')}/api/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': secret,
            },
            body: JSON.stringify({ slug }),
            // A hanging storefront must not hold a connection open behind every save.
            signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
        });
        if (!res.ok) {
            console.warn(`[revalidate] ${slug}: storefront replied ${res.status}`);
        }
    } catch (err) {
        console.warn(`[revalidate] ${slug}: ${err.message}`);
    }
};

module.exports = { revalidateProduct };
