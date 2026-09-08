'use client';

import useScrollRestoration from '@/hooks/useScrollRestoration';

/**
 * Mount point for useScrollRestoration.
 *
 * The locale layout is a server component, so the hook needs a client boundary to run
 * in. This renders nothing and exists only to hold it.
 */
export default function ScrollRestoration() {
    useScrollRestoration();
    return null;
}
