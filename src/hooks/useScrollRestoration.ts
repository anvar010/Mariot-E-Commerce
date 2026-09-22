'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

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
    const pathname = usePathname();
    // Distinguishes the first mount from a later navigation: on first mount the page is
    // already where it should be (or is being restored below), and forcing it to the top
    // would undo a reload landing on a saved offset.
    const mounted = useRef(false);
    /**
     * Set by onPopState, and read by the pathname effect to leave a back/forward alone.
     *
     * A ref rather than state because it must be readable without causing a render, and
     * because popstate and the re-render it triggers happen in the same tick. It is
     * cleared on a timer rather than on read: React may or may not re-render for a given
     * popstate (the path can be unchanged), and a flag cleared only on read would then
     * stay set and swallow the NEXT forward navigation's scroll-to-top.
     */
    const poppingRef = useRef(false);

    /**
     * Send a forward navigation to the top of the page.
     *
     * Setting history.scrollRestoration to 'manual' below turns OFF the browser's own
     * scroll handling -- including the scroll-to-top it would normally do when pushing a
     * new entry. Nothing was putting it back, so clicking a product from halfway down a
     * long listing opened the product page still scrolled to the old offset: the viewport
     * landed near the bottom of the not-yet-filled page, with the footer in view. That is
     * the footer appearing "before" the product, and it is a scroll position, not a
     * height -- which is why giving the loading states a full viewport never fixed it.
     *
     * Back/forward is excluded: those have a saved offset and are handled by onPopState.
     */
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        // Back/forward: onPopState owns the scroll for these and is mid-restore.
        if (poppingRef.current) return;
        window.scrollTo(0, 0);
    }, [pathname]);

    /**
     * Marks back/forward navigations, registered separately and in the capture phase so
     * the flag is set before the listener that does the restoring -- and before React
     * re-renders with the new path, which is what the effect above reacts to.
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let clear: number | undefined;
        const mark = () => {
            poppingRef.current = true;
            // Held just long enough to cover the re-render popstate triggers, then
            // released so a later forward click still scrolls to the top.
            window.clearTimeout(clear);
            clear = window.setTimeout(() => { poppingRef.current = false; }, 400) as unknown as number;
        };
        window.addEventListener('popstate', mark, true);
        return () => {
            window.removeEventListener('popstate', mark, true);
            window.clearTimeout(clear);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const supported = 'scrollRestoration' in window.history;
        const previous = supported ? window.history.scrollRestoration : undefined;
        if (supported) window.history.scrollRestoration = 'manual';

        /**
         * True from the moment a back/forward starts until we have finished restoring.
         *
         * The browser swaps the history entry BEFORE popstate fires, while the old page is
         * still painted at its old offset. Any scroll event in that window would be saved
         * under the entry being restored -- overwriting its real position with the position
         * of the page being left. That is not a missed restore but a wrong one: come back to
         * a short category page from a long listing and it would be sent to the listing's
         * offset, which lands on the footer.
         *
         * So saving is suspended for the whole restore, including the scrolls our own
         * scrollTo generates.
         */
        let restoring = false;

        // Written continuously rather than on unload: a client-side navigation replaces
        // the entry without firing any unload event, and pagehide does not fire reliably
        // on mobile Safari. rAF-throttled, so a scroll costs one write per frame at most.
        let ticking = false;
        const onScroll = () => {
            if (restoring || ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                if (restoring) return;
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
        const done = () => {
            restoring = false;
        };

        const restore = (target: number) => {
            cancel();
            if (target <= 0) {
                // Nothing to restore, but the page must not keep the offset it was left at:
                // going back to a page that was never scrolled belongs at the top.
                window.scrollTo(0, 0);
                done();
                return;
            }

            const started = Date.now();
            const tick = () => {
                const reachable = document.documentElement.scrollHeight - window.innerHeight;
                if (reachable >= target) {
                    window.scrollTo(0, target);
                    // One more frame: an image decoding right after the scroll can shift
                    // layout, and the second application settles it.
                    raf = requestAnimationFrame(() => {
                        window.scrollTo(0, target);
                        done();
                    });
                    return;
                }
                if (Date.now() - started > 3000) {
                    done();
                    return;
                }
                timer = window.setTimeout(tick, 60) as unknown as number;
            };
            tick();
        };

        // popstate is back/forward. A fresh push gets no restore -- it should start at the
        // top, which is what Next already does for it.
        //
        // The saved value is read synchronously here, before any scroll handler can run:
        // by the time popstate fires the entry has already changed, so a late write would
        // clobber exactly the number being read.
        const onPopState = () => {
            restoring = true;
            const saved = read(entryKey());
            restore(saved ?? 0);
        };

        // Covers a reload landing on an entry that already has an offset.
        const initial = read(entryKey());
        if (initial !== null && initial > 0) {
            restoring = true;
            restore(initial);
        }

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
