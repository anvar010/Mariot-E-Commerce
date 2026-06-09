import { getLocale } from 'next-intl/server';

export default async function Loading() {
    const locale = await getLocale();
    const isArabic = locale === 'ar';
    const loadingLabel = isArabic ? 'جاري التحميل' : 'Loading';
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#ffffff',
            zIndex: 10000,
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2rem',
            }}>
                <div style={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {/* Spinning ring via inline keyframes */}
                    <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes _l_spin{to{transform:rotate(360deg)}}
                        @keyframes _l_rev{to{transform:rotate(-360deg)}}
                        @keyframes _l_scan{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
                    `}} />
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        border: '2px solid #e2e8f0',
                        borderTopColor: '#16a1db',
                        borderRadius: '50%',
                        animation: '_l_spin 2s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute',
                        width: '70%',
                        height: '70%',
                        border: '2px solid #e2e8f0',
                        borderBottomColor: '#EE2225',
                        borderRadius: '50%',
                        animation: '_l_rev 1.5s linear infinite',
                    }} />
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
                        <div style={{
                            width: '40%',
                            height: '100%',
                            background: 'linear-gradient(90deg, #16a1db, #79d1f3)',
                            borderRadius: 10,
                            animation: '_l_scan 1.5s ease-in-out infinite',
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
