'use client';

/**
 * The saved-card list, in two modes.
 *
 *  - "select" (checkout): radio rows plus a "use a new card" row, so the shopper
 *    picks what to pay with without leaving the page.
 *  - "manage" (profile, card manager modal): edit / default / remove actions.
 *
 * Card data lives in Stripe. Everything rendered here is the display fields the
 * API returns — brand, last four, expiry — never a card number.
 */
import React from 'react';
import { CreditCard, Pencil, Trash2, Plus, Check } from 'lucide-react';
import { SavedCard, brandLabel, formatExpiry } from '@/utils/paymentMethodsApi';
import styles from './SavedCards.module.css';

const brandClass = (brand: string) => {
    if (brand === 'visa') return styles.brandVisa;
    if (brand === 'mastercard') return styles.brandMastercard;
    if (brand === 'amex') return styles.brandAmex;
    return '';
};

interface Props {
    cards: SavedCard[];
    loading?: boolean;
    error?: string | null;
    mode: 'select' | 'manage';
    /** select mode: the chosen card, or null for "a new card" */
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    /** select mode: renders the "use a new card" row */
    showNewCardRow?: boolean;
    onEdit?: (card: SavedCard) => void;
    onDelete?: (card: SavedCard) => void;
    onSetDefault?: (card: SavedCard) => void;
    onAdd?: () => void;
    busyId?: string | null;
    labels: {
        newCard: string;
        addCard: string;
        empty: string;
        defaultBadge: string;
        expiredBadge: string;
        expires: string;
        makeDefault: string;
        edit: string;
        remove: string;
    };
}

const SavedCards: React.FC<Props> = ({
    cards, loading, error, mode, selectedId, onSelect, showNewCardRow,
    onEdit, onDelete, onSetDefault, onAdd, busyId, labels,
}) => {
    if (loading) {
        return (
            <div className={styles.list}>
                <div className={styles.skeleton} />
                <div className={styles.skeleton} />
            </div>
        );
    }

    if (error) return <div className={styles.error}>{error}</div>;

    const isSelect = mode === 'select';

    return (
        <div className={styles.list}>
            {cards.length === 0 && !isSelect && (
                <div className={styles.empty}>{labels.empty}</div>
            )}

            {cards.map((card) => {
                const selected = isSelect && selectedId === card.id;
                // An expired card cannot be charged, so it must not be selectable at
                // checkout — but it stays visible and flagged, otherwise a shopper
                // whose card just lapsed sees it silently disappear.
                const unusable = isSelect && card.is_expired;
                const busy = busyId === card.id;

                const body = (
                    <>
                        {isSelect && (
                            <span className={styles.radio}>
                                {selected && <span className={styles.radioDot} />}
                            </span>
                        )}

                        <span className={`${styles.brand} ${brandClass(card.brand)}`}>
                            {card.brand === 'visa' || card.brand === 'mastercard' || card.brand === 'amex'
                                ? brandLabel(card.brand)
                                : <CreditCard size={16} />}
                        </span>

                        <span className={styles.details}>
                            <span className={styles.numberRow}>
                                <span className={styles.dots}>••••</span>
                                <span>{card.last4}</span>
                                {card.is_default && (
                                    <span className={styles.badge}>{labels.defaultBadge}</span>
                                )}
                                {card.is_expired && (
                                    <span className={`${styles.badge} ${styles.badgeExpired}`}>
                                        {labels.expiredBadge}
                                    </span>
                                )}
                            </span>
                            <span className={styles.metaRow}>
                                {brandLabel(card.brand)} · {labels.expires} {formatExpiry(card.exp_month, card.exp_year)}
                                {card.name ? ` · ${card.name}` : ''}
                            </span>
                        </span>

                        {mode === 'manage' && (
                            <span className={styles.actions}>
                                {!card.is_default && !card.is_expired && onSetDefault && (
                                    <button
                                        type="button"
                                        className={styles.iconBtn}
                                        title={labels.makeDefault}
                                        aria-label={labels.makeDefault}
                                        disabled={busy}
                                        onClick={(e) => { e.stopPropagation(); onSetDefault(card); }}
                                    >
                                        <Check size={16} />
                                    </button>
                                )}
                                {onEdit && (
                                    <button
                                        type="button"
                                        className={styles.iconBtn}
                                        title={labels.edit}
                                        aria-label={labels.edit}
                                        disabled={busy}
                                        onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                                    >
                                        <Pencil size={15} />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        type="button"
                                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                        title={labels.remove}
                                        aria-label={labels.remove}
                                        disabled={busy}
                                        onClick={(e) => { e.stopPropagation(); onDelete(card); }}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </span>
                        )}
                    </>
                );

                // A row that selects is a button; a row that only displays is not, so
                // keyboard users don't tab through inert elements in manage mode.
                return isSelect ? (
                    <button
                        key={card.id}
                        type="button"
                        className={`${styles.card} ${styles.selectable} ${selected ? styles.selected : ''} ${unusable ? styles.disabled : ''}`}
                        disabled={unusable}
                        aria-pressed={selected}
                        onClick={() => onSelect?.(card.id)}
                    >
                        {body}
                    </button>
                ) : (
                    <div key={card.id} className={styles.card}>{body}</div>
                );
            })}

            {isSelect && showNewCardRow && (
                <button
                    type="button"
                    className={`${styles.addRow} ${selectedId === null ? styles.addRowSelected : ''}`}
                    aria-pressed={selectedId === null}
                    onClick={() => onSelect?.(null)}
                >
                    <Plus size={17} />
                    {labels.newCard}
                </button>
            )}

            {mode === 'manage' && onAdd && (
                <button type="button" className={styles.addRow} onClick={onAdd}>
                    <Plus size={17} />
                    {labels.addCard}
                </button>
            )}
        </div>
    );
};

export default SavedCards;
