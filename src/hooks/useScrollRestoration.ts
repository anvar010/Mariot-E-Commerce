'use client';

import { useEffect } from 'react';

/**
 * Scroll restoration for a storefront whose pages fill in after they mount.
 *
 * The browser restores a remembered scroll offset the moment a history entry is
 * re-entered. That works when the page arrives at full height. Ours do not: every
 * listing fetches its own content client-side, so at the instant of restore the
 * document is a spinner or an empty grid -- a fraction of its eventual height. The
 * offset is clamped to that short document, the real content renders underneath it,
 * and the viewport is left stranded partway down the page. Going from a category into
 * a subcategory and pressing back is the trip where it shows up worst, because the
 * listing left behind is long and the category page is 60vh while it loads.
 *
 * So restoration is taken off the browser and redone once the content is actually
 * there. The offset is saved per history entry, and re-applied only when the document
 * has grown tall enough to hold it.
 *
 * Mounted once in the locale layout; it covers every route under it, and no page needs
 * to know about it.
 */

const KEY_PREFIX = 'mariot:scroll:';

/**
 * Keyed by history entry, not by URL.
 *
 * Two entries can share a URL -- the same category visited twice in one session, or a
 * shop page returned to after a filter -- and each deserves its own offset. history.state
 * carries a key across a reload; a URL would collide.
 */
const entryKey = (): string => {
    if (typeof window === 'undefined') return '';
    const state = window.history.state;
    let key = state?.__mariotKey;
    if (!key) {
        key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
            window.history.replaceState({ ...state, __mariotKey: key }, '');
        } catch {
            /* replaceState can throw when entries are exhausted; fall through to the
               generated key, which simply will not survive a reload. */
        }
    }
    return KEY_PREFIX + key;
};

const read = (key: string): number | null => {
    try {
        const v = sessionStorage.getItem(key);
        return v === null ? null : Number(v);
    } catch {
        return null; // private mode, or storage disabled
    }
};

const write = (key: string, y: number): void => {
    try {
        sessionStorage.setItem(key, String(y));
    } catch {
        /* nothing to do -- scrolling is not worth an exception */
    }
};

export default function useScrollRestoration(): void {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const supported = 'scrollRestoration' in window.history;
        const previous = supported ? window.history.scrollRestoration : undefined;
        if (supported) window.history.scrollRestoration = 'manual';

        // Written continuously rather than on unload: a client-side navigation replaces
        // the entry without firing any unload event, and pagehide does not fire reliably
        // on mobile Safari. rAF-throttled, so a scroll costs one write per frame at most.
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                write(entryKey(), window.scrollY);
            });
        };

        let raf = 0;
        let timer = 0;

        const cancel = () => {
            if (raf) cancelAnimationFrame(raf);
            if (timer) clearTimeout(timer);
            raf = 0;
            timer = 0;
        };

        /**
         * Re-applies the saved offset once the document can actually hold it.
         *
         * Each of our pages grows in steps as its fetches land -- the homepage in eleven
         * of them -- so a single restore on mount would be applied to a page that is still
         * short. Instead the height is watched and the offset applied as soon as it fits,
         * then kept applied while the page continues to grow.
         *
         * Bounded at 3s: if the content never reaches that height (a failed fetch, a
         * category that lost products since the visit) the page is left where it is
         * rather than being scrolled somewhere arbitrary.
         */
        const restore = (target: number) => {
            cancel();
            if (target <= 0) return;

            const started = Date.now();
            const tick = () => {
                const reachable = document.documentElement.scrollHeight - window.innerHeight;
                if (reachable >= target) {
                    window.scrollTo(0, target);
                    // One more frame: an image decoding right after the scroll can shift
                    // layout, and the second application settles it.
                    raf = requestAnimationFrame(() => window.scrollTo(0, target));
                    return;
                }
                if (Date.now() - started > 3000) return;
                timer = window.setTimeout(tick, 60) as unknown as number;
            };
            tick();
        };

        // popstate is back/forward. A fresh push gets no restore -- it should start at the
        // top, which is what Next already does for it.
        const onPopState = () => {
            const saved = read(entryKey());
            if (saved !== null) restore(saved);
        };

        // Covers a reload landing on an entry that already has an offset.
        const initial = read(entryKey());
        if (initial !== null && initial > 0) restore(initial);

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('popstate', onPopState);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('popstate', onPopState);
            cancel();
            if (supported && previous) window.history.scrollRestoration = previous;
        };
    }, []);
}
