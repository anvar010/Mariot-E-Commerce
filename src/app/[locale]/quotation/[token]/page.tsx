'use client';

/**
 * The page a customer lands on from a WhatsApp or email link.
 *
 * WhatsApp click-to-chat links cannot carry a file -- the wa.me format takes a phone
 * number and a message and nothing else -- so the quotation is sent as a link instead,
 * and this page turns that link back into the PDF.
 *
 * The download starts on its own. The recipient asked for a quotation, not for a web
 * page, so making them find and press a button first is a step with no purpose. A manual
 * button is still offered underneath, because an automatic download is blocked often
 * enough -- pop-up blockers, in-app browsers, a slow connection -- that a page which only
 * works automatically is a page that sometimes does not work at all.
 *
 * No login. The token in the URL is the authorisation, which is why the server issues 24
 * random bytes rather than anything derived from the quotation id.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileDown, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import { resolveUrl } from '@/utils/resolveUrl';
import styles from './page.module.css';

interface Props {
    params: Promise<{ token: string; locale: string }>;
}

export default function SharedQuotationPage({ params }: Props) {
    const [quotation, setQuotation] = useState<any>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [downloading, setDownloading] = useState(false);
    // Guards the automatic download so a re-render cannot fire a second one.
    const autoStarted = useRef(false);

    const [token, setToken] = useState<string | null>(null);
    const [locale, setLocale] = useState('en');

    useEffect(() => {
        params.then(p => { setToken(p.token); setLocale(p.locale || 'en'); });
    }, [params]);

    const build = useCallback(async (q: any) => {
        const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
        await generateQuotationPDF({
            ...q,
            items: items.map((i: any) => ({ ...i, image: resolveUrl(i.image) })),
        }, 'download', locale === 'ar');
    }, [locale]);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/staff-quotations/shared/${encodeURIComponent(token)}`);
                const data = await res.json();
                if (cancelled) return;
                if (!data.success || !data.data) { setState('error'); return; }
                setQuotation(data.data);
                setState('ready');
            } catch {
                if (!cancelled) setState('error');
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    // Fires once, as soon as the quotation is in hand.
    useEffect(() => {
        if (state !== 'ready' || !quotation || autoStarted.current) return;
        autoStarted.current = true;
        setDownloading(true);
        build(quotation).finally(() => setDownloading(false));
    }, [state, quotation, build]);

    const manualDownload = async () => {
        if (!quotation) return;
        setDownloading(true);
        try { await build(quotation); } finally { setDownloading(false); }
    };

    if (state === 'loading') {
        return (
            <main className={styles.wrap}>
                <div className={styles.card}>
                    <Loader2 size={28} className={styles.spin} />
                    <p className={styles.muted}>Preparing your quotation…</p>
                </div>
            </main>
        );
    }

    if (state === 'error') {
        return (
            <main className={styles.wrap}>
                <div className={styles.card}>
                    <AlertCircle size={28} className={styles.errorIcon} />
                    <h1 className={styles.title}>Quotation not available</h1>
                    {/* Deliberately vague. A withdrawn quotation and a wrong link look the
                        same from here, and saying which would confirm to a stranger that a
                        given token is real. */}
                    <p className={styles.muted}>
                        This link is no longer valid. Please contact us for an up-to-date quotation.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.wrap}>
            <div className={styles.card}>
                <FileDown size={30} className={styles.icon} />
                <h1 className={styles.title}>Quotation {quotation.quotation_ref}</h1>
                <p className={styles.muted}>
                    {quotation.customer_name ? `Prepared for ${quotation.customer_name}. ` : ''}
                    Your download should start automatically.
                </p>

                <button
                    type="button"
                    className={styles.button}
                    onClick={manualDownload}
                    disabled={downloading}
                >
                    {downloading
                        ? <><Loader2 size={16} className={styles.spin} /> Preparing…</>
                        : <><FileDown size={16} /> Download again</>}
                </button>

                {quotation.created_by_name && (
                    <p className={styles.footerNote}>
                        Questions? Contact {quotation.created_by_name}
                        {quotation.created_by_phone ? ` on ${quotation.created_by_phone}` : ''}.
                    </p>
                )}
            </div>
        </main>
    );
}
