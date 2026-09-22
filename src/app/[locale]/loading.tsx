import { getLocale } from 'next-intl/server';

/**
 * The fallback shown while any route without its own loading.tsx is being prepared.
 *
 * This used to be a fixed, full-screen white panel at z-index 10000. It covered the
 * header, the footer and the whole viewport, so every navigation blanked the screen --
 * which reads as the site stalling even when the next page arrives quickly, and threw
 * away the benefit of keeping the header mounted in the first place.
 *
 * It occupies the page body now, so the header stays put. The branding is the original:
 * two counter-rotating rings around the logo, with the label and progress bar beneath.
 * An earlier pass at the footer problem replaced all of that with a bare spinner, which
 * was never the point of the change.
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
                // Tall enough that the footer stays below the fold while the page is on
                // its way. The storefront layout renders Header -> children -> Footer, so
                // a short placeholder here pulls the footer up under the header and puts
                // it on screen before the content it belongs beneath -- which reads as the
                // page loading footer-first.
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes _l_spin{to{transform:rotate(360deg)}}
                    @keyframes _l_rev{to{transform:rotate(-360deg)}}
                    @keyframes _l_scan{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
                    @media (prefers-reduced-motion: reduce){
                        ._l_anim{animation:none!important}
                    }
                `}} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                <div style={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div
                        className="_l_anim"
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            border: '2px solid #e2e8f0',
                            borderTopColor: '#16a1db',
                            borderRadius: '50%',
                            animation: '_l_spin 2s linear infinite',
                        }}
                    />
                    <div
                        className="_l_anim"
                        style={{
                            position: 'absolute',
                            width: '70%',
                            height: '70%',
                            border: '2px solid #e2e8f0',
                            borderBottomColor: '#EE2225',
                            borderRadius: '50%',
                            animation: '_l_rev 1.5s linear infinite',
                        }}
                    />
                    {/* Brand logo centered inside the spinning rings */}
                    <img
                        src="/assets/mariot-logo.webp"
                        alt="Mariot"
                        style={{
                            width: 40,
                            height: 40,
                            objectFit: 'contain',
                        }}
                    />
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                }}>
                    <span dir={isArabic ? 'rtl' : 'ltr'} style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#475569',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.1em',
                    }}>{loadingLabel}</span>
                    <div style={{
                        width: 160,
                        height: 3,
                        background: '#f1f5f9',
                        borderRadius: 10,
                        overflow: 'hidden',
                    }}>
                        <div
                            className="_l_anim"
                            style={{
                                width: '40%',
                                height: '100%',
                                background: 'linear-gradient(90deg, #16a1db, #79d1f3)',
                                borderRadius: 10,
                                animation: '_l_scan 1.5s ease-in-out infinite',
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
