// Lightweight client-side fetch cache with TTL + in-flight de-duplication.
//
// Many client components (Header, CategoryBrowse, CategoriesLayout, …) mount on
// every navigation and independently re-fetch slow-changing reference data such
// as /categories and /cms/homepage. That puts avoidable load on the backend and
// adds latency on every page. This memoizes responses in-memory for `ttlMs` and
// coalesces concurrent callers onto a single request.
//
// Scope: per browser tab / session (module-level Map). Not persisted — a hard
// reload starts fresh, which is the desired freshness/perf trade-off for
// reference data.

interface CacheEntry {
    ts: number;
    data: any;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

/**
 * Fetch JSON with a short-lived in-memory cache.
 *
 * @param url    Request URL (also the cache key).
 * @param ttlMs  How long a cached response stays fresh. Default 60s.
 * @param init   Optional fetch init. Note: requests with different `init` but
 *               the same URL still share a cache entry — only pass `init` for
 *               endpoints whose response doesn't depend on it.
 */
export async function cachedJson<T = any>(url: string, ttlMs = 60000, init?: RequestInit): Promise<T> {
    const now = Date.now();

    const hit = cache.get(url);
    if (hit && now - hit.ts < ttlMs) {
        return hit.data as T;
    }

    const pending = inflight.get(url);
    if (pending) return pending as Promise<T>;

    const promise = (async () => {
        try {
            const res = await fetch(url, init);
            const data = await res.json();
            cache.set(url, { ts: Date.now(), data });
            return data;
        } finally {
            inflight.delete(url);
        }
    })();

    inflight.set(url, promise);
    return promise as Promise<T>;
}

/** Manually invalidate a cached URL (e.g. after a mutation that changes it). */
export function invalidateCachedJson(url: string): void {
    cache.delete(url);
    inflight.delete(url);
}
