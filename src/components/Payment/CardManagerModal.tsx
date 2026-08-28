'use client';

/**
 * Add, edit and remove saved cards from a popup.
 *
 * Lives in a modal so checkout can manage cards in place — the shopper never has
 * to abandon a filled-in order to go to their profile. The same component backs
 * the profile screen.
 *
 * Adding a card uses a SetupIntent: Stripe authorises the card (and runs 3-D
 * Secure if the bank asks for it) without taking any money. The card number is
 * entered into Stripe Elements, which are iframes owned by Stripe — the number
 * never reaches our JavaScript, our server, or our database.
 *
 * Must be rendered inside an <Elements> provider.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import SavedCards from './SavedCards';
import {
    SavedCard, listCards, createSetupIntent, confirmCard, updateCard,
    setDefaultCard, deleteCard, brandLabel, formatExpiry,
} from '@/utils/paymentMethodsApi';
import styles from './CardManagerModal.module.css';

// Module scope: one Stripe instance for the whole app, not one per modal open.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');

type View = 'list' | 'add' | 'edit' | 'confirmDelete';

export interface CardManagerLabels {
    manageTitle: string; addTitle: string; editTitle: string; removeTitle: string;
    nameOnCard: string; namePlaceholder: string; cardNumber: string; expiry: string; cvc: string;
    expiryMonth: string; expiryYear: string;
    setAsDefault: string; secureNote: string; editHint: string;
    removeConfirm: string; removeConfirmSub: string;
    save: string; saving: string; cancel: string; add: string; adding: string; remove: string; removing: string; done: string;
    newCard: string; addCard: string; empty: string; defaultBadge: string; expiredBadge: string;
    expires: string; makeDefault: string; edit: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    /** Fires whenever the card list changes, so the parent can refresh its copy. */
    onChange?: (cards: SavedCard[]) => void;
    /**
     * Which screen to open on. A host that already shows its own card list — the
     * profile — has a row's edit and delete controls right there, so clicking one
     * should land on that action, not on a second copy of the list.
     */
    initialView?: View;
    /** The card `initialView` acts on, for 'edit' and 'confirmDelete'. */
    initialCard?: SavedCard | null;
    labels: CardManagerLabels;
    isRtl?: boolean;
}

const elementStyle = {
    base: {
        fontSize: '14px',
        color: '#0f172a',
        fontFamily: 'inherit',
        '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#dc2626' },
};

const CardManagerModalInner: React.FC<Props> = ({ open, onClose, onChange, initialView, initialCard, labels, isRtl }) => {
    const stripe = useStripe();
    const elements = useElements();

    const [view, setView] = useState<View>('list');
    const [cards, setCards] = useState<SavedCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [target, setTarget] = useState<SavedCard | null>(null);

    const [addName, setAddName] = useState('');
    const [addDefault, setAddDefault] = useState(false);
    const [editName, setEditName] = useState('');
    const [editMonth, setEditMonth] = useState('');
    const [editYear, setEditYear] = useState('');

    // onChange lives in a ref rather than in refresh's dependencies. Callers pass an
    // inline arrow, so its identity changes on every parent render; depending on it
    // directly gave refresh a new identity each time, which re-fired the effect
    // below, which called setLoading(true), which re-rendered the parent — a loop
    // that left the modal on its skeleton forever and hammered the API.
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const next = await listCards();
            setCards(next);
            onChangeRef.current?.(next);
        } catch (e: any) {
            setError(e.message || 'Could not load your saved cards.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        setError(null);

        // Open straight onto the requested action, prefilling the edit form from the
        // card the host already has in hand rather than waiting on the refresh below.
        if (initialCard && (initialView === 'edit' || initialView === 'confirmDelete')) {
            setTarget(initialCard);
            setEditName(initialCard.name || '');
            setEditMonth(initialCard.exp_month ? String(initialCard.exp_month).padStart(2, '0') : '');
            setEditYear(initialCard.exp_year ? String(initialCard.exp_year) : '');
            setView(initialView);
        } else {
            setView(initialView || 'list');
        }

        refresh();
        // initialView/initialCard are read once per open on purpose: changing them
        // mid-flow would yank the shopper off the screen they are working on.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, refresh]);

    // Escape closes, and the page behind must not scroll while the sheet is open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
        window.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [open, busy, onClose]);

    if (!open || typeof document === 'undefined') return null;

    // ── add ──────────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!stripe || !elements) return;
        const numberElement = elements.getElement(CardNumberElement);
        if (!numberElement) return;

        setBusy(true);
        setError(null);
        try {
            const clientSecret = await createSetupIntent();
            const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
                payment_method: {
                    card: numberElement,
                    billing_details: { name: addName.trim() || undefined },
                },
            });

            if (stripeError) throw new Error(stripeError.message || 'Could not save this card.');

            const pmId = typeof setupIntent?.payment_method === 'string'
                ? setupIntent.payment_method
                : setupIntent?.payment_method?.id;
            if (!pmId) throw new Error('Could not save this card.');

            await confirmCard(pmId, addDefault);
            setAddName('');
            setAddDefault(false);
            // Elements keep their entered value after a successful save; clearing
            // stops a stray second submit re-adding the same card.
            numberElement.clear();
            elements.getElement(CardExpiryElement)?.clear();
            elements.getElement(CardCvcElement)?.clear();
            await refresh();
            setView('list');
        } catch (e: any) {
            setError(e.message || 'Could not save this card.');
        } finally {
            setBusy(false);
        }
    };

    // ── edit ─────────────────────────────────────────────────────────────────
    const openEdit = (card: SavedCard) => {
        setTarget(card);
        setEditName(card.name || '');
        setEditMonth(card.exp_month ? String(card.exp_month).padStart(2, '0') : '');
        setEditYear(card.exp_year ? String(card.exp_year) : '');
        setError(null);
        setView('edit');
    };

    const handleEdit = async () => {
        if (!target) return;
        setBusy(true);
        setError(null);
        try {
            await updateCard(target.id, {
                exp_month: Number(editMonth),
                exp_year: Number(editYear),
                name: editName.trim(),
            });
            await refresh();
            setView('list');
        } catch (e: any) {
            setError(e.message || 'Could not update this card.');
        } finally {
            setBusy(false);
        }
    };

    // ── default / delete ─────────────────────────────────────────────────────
    const handleSetDefault = async (card: SavedCard) => {
        setBusyId(card.id);
        setError(null);
        try {
            await setDefaultCard(card.id);
            await refresh();
        } catch (e: any) {
            setError(e.message || 'Could not update your default card.');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async () => {
        if (!target) return;
        setBusy(true);
        setError(null);
        try {
            await deleteCard(target.id);
            await refresh();
            setView('list');
        } catch (e: any) {
            setError(e.message || 'Could not remove this card.');
        } finally {
            setBusy(false);
        }
    };

    const titles: Record<View, string> = {
        list: labels.manageTitle,
        add: labels.addTitle,
        edit: labels.editTitle,
        confirmDelete: labels.removeTitle,
    };

    const currentYear = new Date().getFullYear();
    const editValid = Number(editMonth) >= 1 && Number(editMonth) <= 12
        && Number(editYear) >= currentYear && Number(editYear) <= currentYear + 25;

    return createPortal(
        <div
            className={styles.overlay}
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={titles[view]}
        >
            <div className={styles.sheet}>
                <div className={styles.header}>
                    {view !== 'list' && (
                        <button
                            type="button"
                            className={styles.backBtn}
                            onClick={() => { setError(null); setView('list'); }}
                            disabled={busy}
                            aria-label={labels.cancel}
                        >
                            <ArrowLeft size={18} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
                        </button>
                    )}
                    <h3 className={styles.title}>{titles[view]}</h3>
                    <button type="button" className={styles.closeBtn} onClick={onClose} disabled={busy} aria-label={labels.done}>
                        <X size={17} />
                    </button>
                </div>

                <div className={styles.body}>
                    {error && <div className={styles.error}>{error}</div>}

                    {view === 'list' && (
                        <SavedCards
                            cards={cards}
                            loading={loading}
                            mode="manage"
                            busyId={busyId}
                            onEdit={openEdit}
                            onDelete={(c) => { setTarget(c); setError(null); setView('confirmDelete'); }}
                            onSetDefault={handleSetDefault}
                            onAdd={() => { setError(null); setView('add'); }}
                            labels={labels}
                        />
                    )}

                    {view === 'add' && (
                        <>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="cm-name">{labels.nameOnCard}</label>
                                <input
                                    id="cm-name"
                                    className={styles.input}
                                    value={addName}
                                    onChange={(e) => setAddName(e.target.value)}
                                    placeholder={labels.namePlaceholder}
                                    autoComplete="cc-name"
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>{labels.cardNumber}</label>
                                <div className={styles.elementBox}>
                                    <CardNumberElement options={{ style: elementStyle, showIcon: true }} />
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className={styles.label}>{labels.expiry}</label>
                                    <div className={styles.elementBox}>
                                        <CardExpiryElement options={{ style: elementStyle }} />
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>{labels.cvc}</label>
                                    <div className={styles.elementBox}>
                                        <CardCvcElement options={{ style: elementStyle }} />
                                    </div>
                                </div>
                            </div>

                            <label className={styles.checkboxRow}>
                                <input type="checkbox" checked={addDefault} onChange={(e) => setAddDefault(e.target.checked)} />
                                {labels.setAsDefault}
                            </label>

                            <div className={styles.secureNote}>
                                <ShieldCheck size={15} />
                                {labels.secureNote}
                            </div>
                        </>
                    )}

                    {view === 'edit' && target && (
                        <>
                            <div className={styles.field}>
                                <label className={styles.label}>{labels.cardNumber}</label>
                                <input className={styles.input} value={`•••• •••• •••• ${target.last4}`} disabled />
                                <p className={styles.hint}>{labels.editHint}</p>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="cm-edit-name">{labels.nameOnCard}</label>
                                <input
                                    id="cm-edit-name"
                                    className={styles.input}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder={labels.namePlaceholder}
                                />
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="cm-mm">{labels.expiryMonth}</label>
                                    <input
                                        id="cm-mm"
                                        className={styles.input}
                                        inputMode="numeric"
                                        maxLength={2}
                                        value={editMonth}
                                        onChange={(e) => setEditMonth(e.target.value.replace(/\D/g, ''))}
                                        placeholder="MM"
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="cm-yy">{labels.expiryYear}</label>
                                    <input
                                        id="cm-yy"
                                        className={styles.input}
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={editYear}
                                        onChange={(e) => setEditYear(e.target.value.replace(/\D/g, ''))}
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {view === 'confirmDelete' && target && (
                        <>
                            <p className={styles.confirmText}>
                                <AlertTriangle size={16} style={{ verticalAlign: '-3px', marginInlineEnd: 6, color: '#dc2626' }} />
                                {labels.removeConfirm.replace('{card}', `${brandLabel(target.brand)} •••• ${target.last4}`)}
                            </p>
                            <p className={styles.confirmSub}>{labels.removeConfirmSub}</p>
                        </>
                    )}
                </div>

                {view !== 'list' && (
                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => { setError(null); setView('list'); }}
                            disabled={busy}
                        >
                            {labels.cancel}
                        </button>

                        {view === 'add' && (
                            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAdd} disabled={busy || !stripe}>
                                {busy ? labels.adding : labels.add}
                            </button>
                        )}
                        {view === 'edit' && (
                            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleEdit} disabled={busy || !editValid}>
                                {busy ? labels.saving : labels.save}
                            </button>
                        )}
                        {view === 'confirmDelete' && (
                            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDelete} disabled={busy}>
                                {busy ? labels.removing : labels.remove}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};

/**
 * The modal carries its own <Elements> group, and that is deliberate.
 *
 * Stripe allows exactly one Element of a given type per group. Checkout already
 * has a CardNumberElement mounted for the "new card" form, so opening this modal
 * inside that same group and rendering a second one threw
 * "Can only create one Element of type cardNumber" and took the page down with
 * it. A separate group gives the modal its own card fields, independent of
 * whatever the host page has mounted.
 *
 * Rendering nothing while closed also means the group is only created when the
 * shopper actually opens the manager.
 */
const CardManagerModal: React.FC<Props> = (props) => {
    if (!props.open) return null;
    return (
        <Elements stripe={stripePromise}>
            <CardManagerModalInner {...props} />
        </Elements>
    );
};

export default CardManagerModal;
