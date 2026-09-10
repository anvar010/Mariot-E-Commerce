'use client';

import React, { useEffect, useState } from 'react';
import { MEDIA_BASE_URL } from '@/config';
import styles from './Model3DViewer.module.css';

/**
 * A rotatable 3D view of the product, shown as a slide inside the product gallery.
 *
 * It sits with the photographs rather than behind a button beside them, because it is another
 * way of looking at the same product: you reach it by swiping to the end of the gallery, the
 * way you reach the video.
 *
 * The viewer library is ~300KB and is fetched only when this slide becomes the active one --
 * so a product page carrying a model costs nothing extra until someone actually swipes to it,
 * and a product without one never references the library at all.
 */

const VIEWER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';

interface Props {
    /** Path under /uploads, as stored on the product. Empty renders nothing. */
    modelUrl?: string | null;
    productName: string;
    posterImage?: string | null;
    /** True while this gallery slide is the one on screen. */
    active: boolean;
    /** Overlay hint, already localised by the caller. */
    label: string;
}

// <model-viewer> is a custom element the library defines at runtime, so TypeScript has no
// knowledge of it. Aliasing it to a component type is enough, and avoids declaring a global
// JSX namespace that the app's React types would fight with.
const ModelViewer = 'model-viewer' as unknown as React.ComponentType<Record<string, unknown>>;

export default function Model3DViewer({ modelUrl, productName, posterImage, active, label }: Props) {
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    const src = modelUrl
        ? (modelUrl.startsWith('http') ? modelUrl : `${MEDIA_BASE_URL}${modelUrl.startsWith('/') ? '' : '/'}${modelUrl}`)
        : null;

    // Loaded the first time this slide is looked at, once per page.
    useEffect(() => {
        if (!active || ready || failed) return;

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
        // A blocked CDN leaves the poster in place rather than a permanent spinner.
        script.onerror = () => setFailed(true);
        document.head.appendChild(script);
    }, [active, ready, failed]);

    if (!src) return null;

    // Until the slide is reached -- or if the library will not load -- the product photo
    // stands in, so the slide always has something in it and never jumps in height.
    if (!active || !ready) {
        return (
            <div className={styles.stage}>
                {posterImage && <img src={posterImage} alt={productName} className={styles.poster} />}
                <span className={styles.badge}>{failed ? '—' : label}</span>
            </div>
        );
    }

    return (
        <div className={styles.stage}>
            <ModelViewer
                src={src}
                alt={productName}
                poster={posterImage || undefined}
                camera-controls
                auto-rotate
                shadow-intensity="1"
                ar
                ar-modes="webxr scene-viewer quick-look"
                // The gallery is a horizontal swiper; without this the viewer takes every
                // drag for its own rotation and the page can no longer be scrolled on a
                // phone once a finger lands on it.
                touch-action="pan-y"
                className={styles.viewer}
            />
        </div>
    );
}
