'use client';

/**
 * Sending a quotation to its customer, with CC addresses and the record of past sends.
 *
 * Emailing used to be a single icon that fired immediately. That is fine the first time
 * and wrong every time after: there was no way to copy anyone, no way to tell whether the
 * customer had already been sent it, and a second click silently sent a duplicate.
 *
 * So the icon opens this instead. The CC list last used for this quotation is offered
 * again, because a resend almost always goes to the same people, and the history below it
 * answers the question that actually decides whether to press send.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Mail, Plus, Loader2, Clock, Send } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import styles from './QuotationEmailModal.module.css';

interface SendRecord {
    id: number;
    sent_to: string;
    cc_emails: string[];
    sent_at: string;
    sent_by_name: string | null;
}

interface Props {
    quotation: any;
    onClose: () => void;
    /** Performs the send. Resolves true when the mail went. */
    onSend: (ccEmails: string[]) => Promise<boolean>;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const formatWhen = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

const QuotationEmailModal: React.FC<Props> = ({ quotation, onClose, onSend }) => {
    const [cc, setCc] = useState<string[]>([]);
    const [draft, setDraft] = useState('');
    const [history, setHistory] = useState<SendRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const draftRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/staff-quotations/${quotation.id}/emails`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success && data.data) {
                setHistory(data.data.sends || []);
                setCc(Array.isArray(data.data.last_cc) ? data.data.last_cc : []);
            }
        } catch {
            // The history is context, not a precondition for sending, so a failure here
            // leaves the dialog usable rather than blocking it.
        } finally {
            setLoading(false);
        }
    }, [quotation.id]);

    useEffect(() => { load(); }, [load]);

    // Escape closes, as it does for every other dialog in the admin.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const addDraft = () => {
        const v = draft.trim();
        if (!v) return;
        if (!isEmail(v)) { setError(`${v} is not a valid email address`); return; }
        if (cc.some(e => e.toLowerCase() === v.toLowerCase())) { setDraft(''); return; }
        if (v.toLowerCase() === String(quotation.customer_email || '').toLowerCase()) {
            setError('That is already the main recipient');
            return;
        }
        setCc(prev => [...prev, v]);
        setDraft('');
        setError(null);
        draftRef.current?.focus();
    };

    const send = async () => {
        // A half-typed address in the box is almost certainly meant to be included;
        // silently dropping it would send the mail without someone who was supposed to
        // get it.
        let list = cc;
        const pending = draft.trim();
        if (pending) {
            if (!isEmail(pending)) { setError(`${pending} is not a valid email address`); return; }
            list = [...cc, pending];
            setCc(list);
            setDraft('');
        }
        setSending(true);
        setError(null);
        try {
            const ok = await onSend(list);
            if (ok) onClose();
        } finally {
            setSending(false);
        }
    };

    // Whether this has gone before decides the wording: "Send" promises something new,
    // and pressing it on a quotation already with the customer is how a duplicate gets
    // sent without meaning to.
    const alreadySent = history.length > 0 || Number(quotation.email_sent) === 1;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className={styles.header}>
                    <h2><Mail size={17} /> {alreadySent ? 'Resend quotation' : 'Send quotation'}</h2>
                    <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>

                <div className={styles.body}>
                    <div className={styles.field}>
                        <label className={styles.label}>To</label>
                        <div className={styles.readonly}>{quotation.customer_email || '—'}</div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="cc-input">CC</label>
                        {cc.length > 0 && (
                            <div className={styles.chips}>
                                {cc.map(e => (
                                    <span key={e} className={styles.chip}>
                                        {e}
                                        <button
                                            type="button"
                                            onClick={() => setCc(prev => prev.filter(x => x !== e))}
                                            aria-label={`Remove ${e}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className={styles.addRow}>
                            <input
                                id="cc-input"
                                ref={draftRef}
                                type="email"
                                className={styles.input}
                                placeholder="Add an email address"
                                value={draft}
                                onChange={e => { setDraft(e.target.value); setError(null); }}
                                // Enter adds the address rather than submitting: this sits
                                // inside a form-like panel and a stray Enter must not send.
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }}
                            />
                            <button type="button" className={styles.addBtn} onClick={addDraft}>
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {error && <p className={styles.error}>{error}</p>}
                    </div>

                    <div className={styles.historyBlock}>
                        <h3 className={styles.historyTitle}><Clock size={13} /> Previously sent</h3>
                        {loading ? (
                            <p className={styles.muted}>Loading…</p>
                        ) : history.length === 0 ? (
                            <p className={styles.muted}>This quotation has not been emailed yet.</p>
                        ) : (
                            <ul className={styles.historyList}>
                                {history.map(h => (
                                    <li key={h.id} className={styles.historyRow}>
                                        <div>
                                            <span className={styles.when}>{formatWhen(h.sent_at)}</span>
                                            {h.sent_by_name && <span className={styles.who}>{h.sent_by_name}</span>}
                                        </div>
                                        <div className={styles.historyTo}>{h.sent_to}</div>
                                        {h.cc_emails.length > 0 && (
                                            <div className={styles.historyCc}>cc {h.cc_emails.join(', ')}</div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={sending}>
                        Close
                    </button>
                    <button
                        type="button"
                        className={styles.sendBtn}
                        onClick={send}
                        disabled={sending || !quotation.customer_email}
                    >
                        {sending
                            ? <><Loader2 size={15} className={styles.spin} /> Sending…</>
                            : <><Send size={15} /> {alreadySent ? 'Resend' : 'Send'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationEmailModal;
