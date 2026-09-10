'use client';

import React, { useEffect, useState } from 'react';
import { Box, X } from 'lucide-react';
import { MEDIA_BASE_URL } from '@/config';
import styles from './Model3DViewer.module.css';

/**
 * A rotatable 3D view of the product, and on a phone the option to place it in the room.
 *
 * Renders nothing at all unless a model has been attached to the product, so the overwhelming
 * majority of the catalogue is untouched by it.
 *
 * The viewer library is not loaded with the page. It is ~300KB, and loading that for every
 * product page so that a handful of them can offer a 3D view would be a poor trade -- so the
 * script is fetched the first time someone actually opens the viewer.
 */

const VIEWER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';

interface Props {
    /** Path under /uploads, as stored on the product. Null or empty renders nothing. */
    modelUrl?: string | null;
    productName: string;
    posterImage?: string | null;
    /** Button label, already localised by the caller. */
    label: string;
}

// <model-viewer> is a custom element defined by the library at runtime, so TypeScript has
// no knowledge of it. Aliasing it to a plain component type is enough and avoids declaring
// a global JSX namespace that the app's React types would fight with.
const ModelViewer = 'model-viewer' as unknown as React.ComponentType<Record<string, unknown>>;

export default function Model3DViewer({ modelUrl, productName, posterImage, label }: Props) {
    const [open, setOpen] = useState(false);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    const src = modelUrl
        ? (modelUrl.startsWith('http') ? modelUrl : `${MEDIA_BASE_URL}${modelUrl.startsWith('/') ? '' : '/'}${modelUrl}`)
        : null;

    // Loaded on first open, once per page. A second open reuses the script already there.
    useEffect(() => {
        if (!open || ready || failed) return;

        if (customElements.get('model-viewer')) {
            setReady(true);
            return;
        }

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${VIEWER_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => setReady(true), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.type = 'module';
        script.src = VIEWER_SRC;
        script.onload = () => setReady(true);
        // A blocked CDN or an offline visitor closes the viewer rather than leaving a
        // permanent spinner behind.
        script.onerror = () => setFailed(true);
        document.head.appendChild(script);
    }, [open, ready, failed]);

    // Escape closes it, as with any other modal on the site.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!src) return null;

    return (
        <>
            <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
                <Box size={17} /> {label}
            </button>

            {open && (
                <div className={styles.overlay} onClick={() => setOpen(false)}>
                    <div className={styles.frame} onClick={e => e.stopPropagation()}>
                        <button
                            type="button"
                            className={styles.close}
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>

                        {failed ? (
                            <p className={styles.message}>The 3D view could not be loaded.</p>
                        ) : ready ? (
                            <ModelViewer
                                src={src}
                                alt={productName}
                                poster={posterImage || undefined}
                                camera-controls
                                auto-rotate
                                shadow-intensity="1"
                                ar
                                ar-modes="webxr scene-viewer quick-look"
                                touch-action="pan-y"
                                style={{ width: '100%', height: '100%', backgroundColor: '#f8fafc' }}
                            />
                        ) : (
                            <p className={styles.message}>Loading 3D view…</p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
