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
    const [notice, setNotice] = useState('');

    /**
     * The PDF, built once when the page opens and then used by all three buttons.
     *
     * The buttons say "Preparing..." until it exists, and only then act -- straight away,
     * inside the tap. An earlier version opened the preview tab first and finished the PDF
     * afterwards; phones pause a tab that is not on screen, so the build stopped the moment
     * the new tab took over and the preview loaded forever. Acting only on a finished file
     * also keeps every action inside the tap, which is what lets the browser open a tab or
     * the share sheet at all rather than blocking it.
     */
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfFailed, setPdfFailed] = useState(false);

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

    const buildPdf = useCallback(async () => {
        if (!quotation) return;
        setPdfFailed(false);
        try {
            const items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : (quotation.items || []);
            const dataUri = await generateQuotationPDF({
                ...quotation,
                items: items.map((i: any) => ({ ...i, image: resolveUrl(i.image) })),
            }, 'silent', locale === 'ar');
            const bytes = Uint8Array.from(atob(dataUri.replace(/^data:application\/pdf[^,]*,/, '')), c => c.charCodeAt(0));
            setPdfFile(new File([bytes], `${quotation.quotation_ref || 'Quotation'}.pdf`, { type: 'application/pdf' }));
        } catch {
            setPdfFailed(true);
        }
    }, [quotation, locale]);

    // Built once, as soon as the quotation is on screen.
    useEffect(() => { buildPdf(); }, [buildPdf]);

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

    // All three act on the finished file, synchronously within the tap.
    const preview = () => {
        if (!pdfFile) return;
        setNotice('');
        const url = URL.createObjectURL(pdfFile);
        if (!window.open(url, '_blank')) saveFile(pdfFile); // pop-up refused: save it instead
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    const download = () => {
        if (!pdfFile) return;
        setNotice('');
        saveFile(pdfFile);
    };

    /**
     * Sends the PDF file itself -- named after the quotation -- through the phone's share
     * sheet. Where a browser cannot share files (the in-app browser inside WhatsApp, for
     * one), it downloads the file instead and says so, so the button always produces the
     * PDF rather than doing nothing or sending a link.
     */
    const share = () => {
        if (!pdfFile) return;
        setNotice('');
        const canShare = typeof navigator.share === 'function'
            && typeof navigator.canShare === 'function'
            && navigator.canShare({ files: [pdfFile] });
        if (!canShare) {
            saveFile(pdfFile);
            setNotice(`This browser can't share files, so ${pdfFile.name} was downloaded. You can send it from your Downloads -- or open this link in Chrome or Safari to share it directly.`);
            return;
        }
        navigator.share({ files: [pdfFile], title: `Quotation ${quotation?.quotation_ref || ''}`.trim() })
            .catch((e: any) => {
                if (e?.name !== 'AbortError') setNotice('Could not share the PDF. Please use Download instead.');
            });
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
                        the document before saving it is the safer order. Every button waits
                        for the one PDF build, then acts immediately. */}
                    <button type="button" className={styles.secondaryBtn} onClick={preview} disabled={!pdfFile}>
                        {pdfFile ? <><Eye size={16} /> Preview</> : <><Loader2 size={16} className={styles.spin} /> Preparing…</>}
                    </button>
                    <button type="button" className={styles.button} onClick={download} disabled={!pdfFile}>
                        {pdfFile ? <><FileDown size={16} /> Download</> : <><Loader2 size={16} className={styles.spin} /> Preparing…</>}
                    </button>
                    {/* The PDF file itself to WhatsApp, Mail and the rest, named after the
                        quotation -- unlike the browser's share button, which sends a link. */}
                    <button type="button" className={styles.secondaryBtn} onClick={share} disabled={!pdfFile}>
                        {pdfFile ? <><Share2 size={16} /> Share PDF</> : <><Loader2 size={16} className={styles.spin} /> Preparing…</>}
                    </button>
                </div>
                {pdfFailed && (
                    <p className={styles.muted}>
                        The PDF could not be prepared.{' '}
                        <button type="button" className={styles.linkBtn} onClick={buildPdf}>Try again</button>
                    </p>
                )}
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
