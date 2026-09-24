'use client';

/**
 * The page a customer lands on from a WhatsApp or email link.
 *
 * WhatsApp click-to-chat links cannot carry a file -- the wa.me format takes a phone
 * number and a message and nothing else -- so the quotation is sent as a link instead,
 * and this page turns that link back into the PDF.
 *
 * Nothing downloads on its own. The recipient chooses: preview it in the browser, which
 * is what most people want on a phone, or save it. An automatic download is worse than it
 * sounds -- it lands a file in someone's downloads before they have seen what it is, and
 * is blocked often enough by pop-up blockers and in-app browsers that the page then
 * appears to do nothing at all.
 *
 * No login. The token in the URL is the authorisation, which is why the server issues 24
 * random bytes rather than anything derived from the quotation id.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FileDown, Eye, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import { resolveUrl } from '@/utils/resolveUrl';
import { whatsappLink } from '@/utils/whatsappLink';
import WhatsappIcon from '@/components/shared/icons/WhatsappIcon';
import styles from './page.module.css';

interface Props {
    params: Promise<{ token: string; locale: string }>;
}

export default function SharedQuotationPage({ params }: Props) {
    const [quotation, setQuotation] = useState<any>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    // Tracked separately so only the button that was pressed shows a spinner.
    const [busy, setBusy] = useState<'download' | 'preview' | null>(null);

    const [token, setToken] = useState<string | null>(null);
    const [locale, setLocale] = useState('en');

    useEffect(() => {
        params.then(p => { setToken(p.token); setLocale(p.locale || 'en'); });
    }, [params]);

    const build = useCallback(async (q: any, mode: 'download' | 'open') => {
        const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
        await generateQuotationPDF({
            ...q,
            items: items.map((i: any) => ({ ...i, image: resolveUrl(i.image) })),
        }, mode, locale === 'ar');
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

    const run = async (mode: 'download' | 'open') => {
        if (!quotation) return;
        setBusy(mode === 'open' ? 'preview' : 'download');
        try { await build(quotation, mode); } finally { setBusy(null); }
    };

    if (state === 'loading') {
        return (
            <main className={styles.wrap}>
                <div className={styles.card}>
                    <Loader2 size={28} className={styles.spin} />
                    <p className={styles.muted}>Loading your quotation…</p>
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
                <SecuredBy />
            </main>
        );
    }

    const staffWa = whatsappLink(quotation.created_by_phone);

    return (
        <main className={styles.wrap}>
            <div className={styles.card}>
                <FileDown size={30} className={styles.icon} />
                <h1 className={styles.title}>Quotation {quotation.quotation_ref}</h1>
                {quotation.customer_name && (
                    <p className={styles.muted}>Prepared for {quotation.customer_name}.</p>
                )}

                <div className={styles.actions}>
                    {/* Preview first: on a phone this is what most people want, and seeing
                        the document before saving it is the safer order. */}
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => run('open')}
                        disabled={busy !== null}
                    >
                        {busy === 'preview'
                            ? <><Loader2 size={16} className={styles.spin} /> Opening…</>
                            : <><Eye size={16} /> Preview</>}
                    </button>
                    <button
                        type="button"
                        className={styles.button}
                        onClick={() => run('download')}
                        disabled={busy !== null}
                    >
                        {busy === 'download'
                            ? <><Loader2 size={16} className={styles.spin} /> Preparing…</>
                            : <><FileDown size={16} /> Download</>}
                    </button>
                </div>

                {quotation.created_by_name && (
                    <div className={styles.contact}>
                        <span className={styles.contactLabel}>Questions about this quotation?</span>
                        {staffWa ? (
                            // Opens a chat with the person who raised it, rather than
                            // printing a number to be copied out by hand.
                            <a
                                href={staffWa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.contactLink}
                            >
                                <WhatsappIcon size={15} />
                                {quotation.created_by_name}
                                <span className={styles.contactPhone}>{quotation.created_by_phone}</span>
                            </a>
                        ) : (
                            <span className={styles.contactPlain}>{quotation.created_by_name}</span>
                        )}
                    </div>
                )}
            </div>
            <SecuredBy />
        </main>
    );
}

/**
 * Who this page belongs to.
 *
 * The link arrives in a WhatsApp message from a number the recipient may not have saved,
 * and asks them to open a document. Naming the site it comes from is the one thing that
 * makes that feel like a quotation rather than something to be suspicious of.
 */
const SecuredBy = () => (
    <p className={styles.secured}>
        <ShieldCheck size={13} />
        Secured by <a href="https://mariotstore.com" target="_blank" rel="noopener noreferrer">mariotstore.com</a>
    </p>
);
