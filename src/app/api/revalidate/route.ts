import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * Refresh a cached page on demand, so an admin edit is live in about a second.
 *
 * Product pages are ISR-cached, which is what makes them fast but also means a price or
 * stock change would otherwise sit stale until the revalidate window expires. The backend
 * calls this the moment a product is saved, and Next rebuilds that one path.
 *
 * Guarded by a shared secret: revalidation is cheap to ask for and expensive to serve, so
 * an open endpoint is a way to make the site rebuild pages continuously. The secret is
 * compared in constant time and the route refuses to run at all when none is configured,
 * rather than defaulting to open.
 */

// Length-independent comparison. A plain === leaks how much of the secret matched via
// timing, which is enough to recover it one character at a time.
const safeEqual = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
};

export async function POST(request: NextRequest) {
    const configured = process.env.REVALIDATE_SECRET;
    if (!configured) {
        // Refusing is the safe default: a missing secret must not mean "no check".
        return NextResponse.json(
            { success: false, message: 'Revalidation is not configured' },
            { status: 503 },
        );
    }

    const provided = request.headers.get('x-revalidate-secret') || '';
    if (!safeEqual(provided, configured)) {
        return NextResponse.json({ success: false, message: 'Invalid secret' }, { status: 401 });
    }

    let body: { paths?: unknown; slug?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    // Either an explicit list of paths, or a product slug expanded to both locales --
    // the caller usually knows the slug, not the routes it appears under.
    const paths: string[] = [];
    if (Array.isArray(body.paths)) {
        paths.push(...body.paths.filter((p): p is string => typeof p === 'string'));
    }
    if (typeof body.slug === 'string' && body.slug.trim()) {
        const slug = body.slug.trim();
        paths.push(`/en/product/${slug}`, `/ar/product/${slug}`);
    }

    if (paths.length === 0) {
        return NextResponse.json(
            { success: false, message: 'Provide `slug` or a non-empty `paths` array' },
            { status: 400 },
        );
    }

    // Only ever our own paths. A caller-supplied absolute URL or a traversal segment must
    // not reach revalidatePath.
    const safe = paths.filter(p => p.startsWith('/') && !p.startsWith('//') && !p.includes('..'));
    if (safe.length === 0) {
        return NextResponse.json({ success: false, message: 'No valid paths' }, { status: 400 });
    }

    const revalidated: string[] = [];
    for (const path of safe) {
        try {
            revalidatePath(path);
            revalidated.push(path);
        } catch (e) {
            // One bad path must not abandon the rest: a product save that also refreshes
            // its category should still refresh what it can.
            console.warn('[revalidate] failed for', path, (e as Error).message);
        }
    }

    return NextResponse.json({ success: true, revalidated });
}
