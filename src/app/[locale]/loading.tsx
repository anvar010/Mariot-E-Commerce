import { getLocale } from 'next-intl/server';

/**
 * The fallback shown while any route without its own loading.tsx is being prepared.
 *
 * This used to be a fixed, full-screen white panel at z-index 10000. It covered the
 * header, the footer and the whole viewport, so every navigation blanked the screen --
 * which reads as the site stalling even when the next page arrives quickly, and threw
 * away the benefit of keeping the header mounted in the first place.
 *
 * It now occupies the page body only. The header stays put, the page keeps its shape,
 * and a modest panel marks the spot the content will fill. Routes with a real skeleton
 * (product, shop, category) override this with their own.
 *
 * Server-rendered with no client JS, so it paints on the very first frame.
 */
export default async function Loading() {
    const locale = await getLocale();
    const isArabic = locale === 'ar';
    const loadingLabel = isArabic ? 'جاري التحميل' : 'Loading';

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={loadingLabel}
            style={{
                // min-height keeps the footer from jumping up to meet the header while
                // the page is still on its way.
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes _l_spin{to{transform:rotate(360deg)}}
                    @media (prefers-reduced-motion: reduce){
                        ._l_ring{animation:none!important}
                    }
                `}} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
                <div
                    className="_l_ring"
                    style={{
                        width: 38,
                        height: 38,
                        border: '3px solid #e2e8f0',
                        borderTopColor: '#16a1db',
                        borderRadius: '50%',
                        animation: '_l_spin 0.8s linear infinite',
                    }}
                />
                <span
                    dir={isArabic ? 'rtl' : 'ltr'}
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}
                >
                    {loadingLabel}
                </span>
            </div>
        </div>
    );
}
