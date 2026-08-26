/**
 * Read a fetch Response as JSON without throwing when it isn't JSON.
 *
 * Server-rendered pages fetch the API during render. When the API answers with
 * something that is not JSON — a CDN/WAF error page, a gateway timeout, an HTML
 * 403 — calling `res.json()` throws `SyntaxError: Unexpected token '<'` and takes
 * the whole render down, even though every call site already has a fallback for
 * "no data". The failures seen in production were exactly that: a 403 logged,
 * then the parse attempted anyway.
 *
 * Returns an empty object rather than null so existing `data.success` checks stay
 * falsy and callers need no other change.
 */
export const readJson = async (res: Response, context?: string): Promise<any> => {
    if (!res.ok) {
        console.error(`[readJson] ${res.status} ${res.statusText}${context ? ` for ${context}` : ''} — ${res.url}`);
        return {};
    }

    // A 200 can still carry HTML: some proxies serve an error page with a 200.
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) {
        const preview = await res.text().catch(() => '');
        console.error(
            `[readJson] expected JSON but got "${type || 'no content-type'}"` +
            `${context ? ` for ${context}` : ''} — ${res.url} — starts: ${preview.slice(0, 80)}`
        );
        return {};
    }

    try {
        return await res.json();
    } catch (e: any) {
        console.error(`[readJson] malformed JSON${context ? ` for ${context}` : ''} — ${res.url}: ${e?.message}`);
        return {};
    }
};

/**
 * Fetch and parse JSON, retrying once on a transient upstream failure.
 *
 * The API sits behind a CDN/WAF that intermittently answers a server-side render
 * with an HTML 403 — the body is HTML, which our own Express app never returns for
 * an error, so the refusal is coming from in front of it. A single render then
 * loses its data even though the very next request succeeds.
 *
 * One retry after a short pause covers that case without turning a genuinely dead
 * upstream into a doubled page-load time: 404 and 401/403-with-JSON are treated as
 * real answers and are not retried.
 */
export const fetchJsonWithRetry = async (
    url: string,
    init: RequestInit & { next?: any },
    context?: string,
): Promise<any> => {
    const attempt = async () => {
        const res = await fetch(url, init);
        const type = res.headers.get('content-type') || '';
        // Transient == the response did not even come from the API (non-JSON body),
        // or the gateway itself failed. A JSON 404 is the API answering properly.
        const transient = !res.ok && !type.includes('json');
        return { res, transient };
    };

    try {
        const first = await attempt();
        if (!first.transient) return readJson(first.res, context);

        console.warn(`[fetchJsonWithRetry] transient ${first.res.status} for ${context || url} — retrying once`);
        await new Promise(r => setTimeout(r, 400));
        const second = await attempt();
        return readJson(second.res, context);
    } catch (e: any) {
        console.error(`[fetchJsonWithRetry] ${context || url} failed: ${e?.message}`);
        return {};
    }
};
