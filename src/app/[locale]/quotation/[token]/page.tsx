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
import { FileDown, Eye, Loader2, AlertCircle, ShieldCheck, Share2 } from 'lucide-react';
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
    const [busy, setBusy] = useState<'download' | 'preview' | 'share' | null>(null);
    const [notice, setNotice] = useState('');

    /**
     * The PDF, built once and reused by Preview, Download and Share.
     *
     * It used to be built again for every button, and a second copy in the background for
     * sharing -- two builds at once on a phone, which is what made the page slow. Now the
     * first build is shared: it starts as soon as the quotation loads, and every button
     * waits for that same build. After it, all three are instant.
     *
     * Building it in advance also matters for sharing: iOS only lets a page open the share
     * sheet in direct response to a tap, and a PDF takes longer than that allowance to make.
     */
    const pdfPromise = React.useRef<Promise<File> | null>(null);
    const [pdfReady, setPdfReady] = useState(false);

    const [token, setToken] = useState<string | null>(null);
    const [locale, setLocale] = useState('en');

    useEffect(() => {
        params.then(p => { setToken(p.token); setLocale(p.locale || 'en'); });
    }, [params]);

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

    const getPdf = useCallback((): Promise<File> => {
        if (!pdfPromise.current) {
            pdfPromise.current = (async () => {
                const items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : (quotation.items || []);
                const dataUri = await generateQuotationPDF({
                    ...quotation,
                    items: items.map((i: any) => ({ ...i, image: resolveUrl(i.image) })),
                }, 'silent', locale === 'ar');
                const bytes = Uint8Array.from(atob(dataUri.replace(/^data:application\/pdf[^,]*,/, '')), c => c.charCodeAt(0));
                return new File([bytes], `${quotation.quotation_ref || 'Quotation'}.pdf`, { type: 'application/pdf' });
            })();
            pdfPromise.current.then(() => setPdfReady(true), () => { pdfPromise.current = null; });
        }
        return pdfPromise.current;
    }, [quotation, locale]);

    // Starts the one build as soon as the quotation is on screen.
    useEffect(() => {
        if (quotation) getPdf().catch(() => { /* retried on the next tap */ });
    }, [quotation, getPdf]);

    const saveFile = (file: File) => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    const preview = async () => {
        if (!quotation) return;
        setNotice('');
        // Opened in the tap itself; a tab opened after the build has finished would be
        // blocked as a pop-up. It is filled once the PDF is ready.
        const win = window.open('', '_blank');
        setBusy('preview');
        try {
            const file = await getPdf();
            const url = URL.createObjectURL(file);
            if (win) win.location.href = url;
            else saveFile(file);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            win?.close();
            setNotice('Could not prepare the PDF. Please try again.');
        } finally {
            setBusy(null);
        }
    };

    const download = async () => {
        if (!quotation) return;
        setNotice('');
        setBusy('download');
        try { saveFile(await getPdf()); }
        catch { setNotice('Could not prepare the PDF. Please try again.'); }
        finally { setBusy(null); }
    };

    /**
     * Sends the PDF file itself -- named after the quotation -- through the phone's share
     * sheet. Where a browser cannot share files (the in-app browser inside WhatsApp, for
     * one), it downloads the file instead and says so, so the button always produces the
     * PDF rather than doing nothing or sending a link.
     */
    const share = async () => {
        if (!quotation) return;
        setNotice('');
        setBusy('share');
        try {
            const file = await getPdf();
            const canShare = typeof navigator !== 'undefined'
                && typeof navigator.share === 'function'
                && typeof navigator.canShare === 'function'
                && navigator.canShare({ files: [file] });
            if (canShare) {
                try {
                    await navigator.share({ files: [file], title: `Quotation ${quotation.quotation_ref || ''}`.trim() });
                } catch (e: any) {
                    if (e?.name === 'AbortError') return; // closed the share sheet
                    // The tap's allowance ran out while the PDF was still being made.
                    // The file is ready now, so a second tap shares at once.
                    if (e?.name === 'NotAllowedError') { setNotice('Your PDF is ready -- tap Share PDF again.'); return; }
                    throw e;
                }
            } else {
                saveFile(file);
                setNotice(`This browser can't share files, so ${file.name} was downloaded. You can send it from your Downloads -- or open this link in Chrome or Safari to share it directly.`);
            }
        } catch {
            setNotice('Could not share the PDF. Please use Download instead.');
        } finally {
            setBusy(null);
        }
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
                        onClick={preview}
                        disabled={busy !== null}
                    >
                        {busy === 'preview'
                            ? <><Loader2 size={16} className={styles.spin} /> Opening…</>
                            : <><Eye size={16} /> Preview</>}
                    </button>
                    <button
                        type="button"
                        className={styles.button}
                        onClick={download}
                        disabled={busy !== null}
                    >
                        {busy === 'download'
                            ? <><Loader2 size={16} className={styles.spin} /> Preparing…</>
                            : <><FileDown size={16} /> Download</>}
                    </button>
                    {/* The PDF file itself to WhatsApp, Mail and the rest, named after the
                        quotation -- unlike the browser's share button, which sends a link.
                        Always shown: it says "Preparing" until the PDF is ready, and falls
                        back to a download where a browser cannot share files. */}
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={share}
                        disabled={busy !== null}
                    >
                        {busy === 'share' || !pdfReady
                            ? <><Loader2 size={16} className={styles.spin} /> {pdfReady ? 'Sharing…' : 'Preparing…'}</>
                            : <><Share2 size={16} /> Share PDF</>}
                    </button>
                </div>
                {notice && <p className={styles.muted}>{notice}</p>}

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
