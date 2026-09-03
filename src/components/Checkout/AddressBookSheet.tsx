'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import { statesFor, areasFor, countryLabel, SHIPPING_COUNTRIES } from '@/data/cities';
import {
    X as CloseIcon,
    Plus,
    Home,
    Building2,
    MapPin,
    MoreHorizontal,
    BadgeCheck,
    Edit2,
    Trash2,
    Check,
    Pencil,
} from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import styles from './AddressBookSheet.module.css';

interface AddressBookSheetProps {
    open: boolean;
    onClose: () => void;
    onSelect: (addr: any) => void;
    onAddressesChange?: (list: any[]) => void;
    selectedAddressId: number | string;
    user: any;
}

const emptyForm = (user?: any) => {
    const fullName = (user?.name || '').trim();
    return {
        address_type: 'home',
        address_label: '',
        first_name: fullName.split(' ')[0] || '',
        last_name: fullName.split(' ').slice(1).join(' ') || '',
        company_name: '',
        email: user?.email || '',
        address_line1: '',
        address_line2: '',
        city: '',
        // Blank, not "UAE". The old default was free text that meant nothing to the new
        // emirate list, and it left the field looking answered when nothing had been chosen.
        state: '',
        zip_code: '',
        country: 'United Arab Emirates',
        phone: user?.phone_number || '',
        is_default: false,
    };
};

export default function AddressBookSheet({ open, onClose, onSelect, onAddressesChange, selectedAddressId, user }: AddressBookSheetProps) {
    const t = useTranslations('userDashboard.addresses');
    const locale = useLocale();

    const [addresses, setAddresses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm(user));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [editReceiver, setEditReceiver] = useState(false);

    const states = statesFor(form.country);
    const areas = areasFor(form.country, form.state);

    // Each level clears the ones under it. Keeping them would let an address be saved
    // reading "Saudi Arabia / Dubai / Deira", and the shopper has already scrolled past
    // those fields by then, so they would never see it.
    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm(f => ({ ...f, country: e.target.value, state: '', city: '' }));
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm(f => ({ ...f, state: e.target.value, city: '' }));
    };

    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/addresses`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                setAddresses(data.data || []);
                onAddressesChange?.(data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch addresses', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchAddresses();
            setShowForm(false);
            setEditingId(null);
            setError(null);
        }
    }, [open]);

    // Lock body scroll while the sheet is open
    useEffect(() => {
        if (open) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [open]);

    const openAddForm = () => {
        const hasHome = addresses.some(a => a.address_type === 'home');
        const hasWork = addresses.some(a => a.address_type === 'work');
        const defaultType = !hasHome ? 'home' : !hasWork ? 'work' : 'other';
        setForm({ ...emptyForm(user), address_type: defaultType });
        setEditingId(null);
        setError(null);
        setEditReceiver(false);
        setShowForm(true);
    };

    const openEditForm = (addr: any) => {
        setOpenMenu(null);
        setForm({
            address_type: addr.address_type || 'other',
            address_label: addr.address_label || '',
            first_name: addr.first_name || '',
            last_name: addr.last_name || '',
            company_name: addr.company_name || '',
            email: addr.email || '',
            address_line1: addr.address_line1 || '',
            address_line2: addr.address_line2 || '',
            city: addr.city || '',
            // An address with no state left must open with the field empty, not invent
            // "UAE" -- that is not an emirate, so it would look answered while the shopper
            // still has nothing real selected.
            state: addr.state || '',
            zip_code: addr.zip_code || '',
            country: addr.country || 'United Arab Emirates',
            phone: addr.phone || '',
            is_default: addr.is_default || false,
        });
        setEditingId(addr.id);
        setError(null);
        setEditReceiver(false);
        setShowForm(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId
                ? `${API_BASE_URL}/users/addresses/${editingId}`
                : `${API_BASE_URL}/users/addresses`;
            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                await fetchAddresses();
                setShowForm(false);
                setEditingId(null);
            } else {
                setError(data.message || t('addError'));
            }
        } catch (err) {
            setError(t('addError'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setOpenMenu(null);
        try {
            const res = await fetch(`${API_BASE_URL}/users/addresses/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) await fetchAddresses();
        } catch (e) {
            console.error('Failed to delete address', e);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    const homeTaken = addresses.some(a => a.address_type === 'home' && a.id !== editingId);
    const workTaken = addresses.some(a => a.address_type === 'work' && a.id !== editingId);
    const types = [
        { key: 'home', label: t('typeHome'), icon: <Home size={17} />, disabled: homeTaken },
        { key: 'work', label: t('typeWork'), icon: <Building2 size={17} />, disabled: workTaken },
        { key: 'other', label: t('typeOther'), icon: <MapPin size={17} />, disabled: false },
    ];

    return createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                <div className={styles.handle} />
                <div className={styles.header}>
                    <h3 className={styles.title}>{t('title')}</h3>
                    <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <CloseIcon size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {showForm ? (
                        <form onSubmit={handleSave} className={styles.form}>
                            <div className={styles.typeRow}>
                                {types.map(tp => (
                                    <button
                                        type="button"
                                        key={tp.key}
                                        disabled={tp.disabled}
                                        className={`${styles.typeBtn} ${form.address_type === tp.key ? styles.typeBtnActive : ''}`}
                                        onClick={() => setForm({ ...form, address_type: tp.key })}
                                    >
                                        {tp.icon}
                                        <span>{tp.label}</span>
                                    </button>
                                ))}
                            </div>

                            {form.address_type === 'other' && (
                                <div className={`${styles.field} ${styles.full}`} style={{ marginBottom: '12px' }}>
                                    <label>{t('labelName')} <span className={styles.req}>*</span></label>
                                    <input type="text" required maxLength={100} value={form.address_label}
                                        onChange={(e) => setForm({ ...form, address_label: e.target.value })}
                                        placeholder={t('labelNamePlaceholder')} />
                                </div>
                            )}

                            {error && <div className={styles.error}>{error}</div>}

                            <span className={styles.sectionLabel}>{t('addressDetails')}</span>
                            <div className={styles.grid}>
                                {/* Country -> State/Emirate -> City/Area, each filled from the one
                                    above it. The sheet used to hold a country it never let anyone
                                    change, and a free-text city, so every address saved here read
                                    "United Arab Emirates" with whatever the shopper typed. */}
                                <div className={`${styles.field} ${styles.full}`}>
                                    <label>{t('country')} <span className={styles.req}>*</span></label>
                                    <select required value={form.country} onChange={handleCountryChange}>
                                        {SHIPPING_COUNTRIES.map(c => (
                                            <option key={c} value={c}>{countryLabel(c, locale)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>{t('state')} <span className={styles.req}>*</span></label>
                                    {states.length > 0 ? (
                                        <select required value={form.state} onChange={handleStateChange}>
                                            <option value="" disabled>{t('selectState')}</option>
                                            {states.map(st => (
                                                <option key={st.value} value={st.value}>{locale === 'ar' ? st.ar : st.value}</option>
                                            ))}
                                            {/* Addresses saved before these lists existed hold free text --
                                                "UAE" was the old default. Showing whatever is stored keeps
                                                the shopper's own address intact rather than blanking a
                                                field they already filled in. */}
                                            {form.state && !states.some(st => st.value === form.state) && (
                                                <option value={form.state}>{form.state}</option>
                                            )}
                                        </select>
                                    ) : (
                                        <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder={t('statePlaceholder')} />
                                    )}
                                </div>
                                <div className={styles.field}>
                                    <label>{t('city')} <span className={styles.req}>*</span></label>
                                    {areas.length > 0 ? (
                                        <select required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                                            <option value="" disabled>{t('selectCity')}</option>
                                            {areas.map(a => (
                                                <option key={a.value} value={a.value}>{locale === 'ar' ? a.ar : a.value}</option>
                                            ))}
                                            {form.city && !areas.some(a => a.value === form.city) && (
                                                <option value={form.city}>{form.city}</option>
                                            )}
                                        </select>
                                    ) : (
                                        // Nothing chosen above yet, or a state these lists do not know:
                                        // typing beats a dropdown with nothing in it.
                                        <input type="text" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('cityPlaceholder')} />
                                    )}
                                </div>
                                <div className={`${styles.field} ${styles.full}`}>
                                    <label>{t('line1')} <span className={styles.req}>*</span></label>
                                    <input type="text" required value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} placeholder={t('line1Placeholder')} />
                                </div>
                                <div className={`${styles.field} ${styles.full}`}>
                                    <label>{t('line2')}</label>
                                    <input type="text" value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} placeholder={t('line2Placeholder')} />
                                </div>
                                <div className={styles.field}>
                                    <label>{t('zip')}</label>
                                    <input type="text" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} placeholder={t('zipPlaceholder')} />
                                </div>
                            </div>

                            <span className={styles.sectionLabel}>{t('receiverDetails')}</span>
                            {editReceiver ? (
                                <div className={styles.grid}>
                                    <div className={`${styles.field} ${styles.full}`}>
                                        <label>{t('receiverName')} <span className={styles.req}>*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={`${form.first_name}${form.last_name ? ' ' + form.last_name : ''}`}
                                            onChange={(e) => {
                                                const parts = e.target.value.split(' ');
                                                setForm({ ...form, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') });
                                            }}
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                    <div className={`${styles.field} ${styles.full}`}>
                                        <label>{t('phone')} <span className={styles.req}>*</span></label>
                                        <input type="tel" required dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('phonePlaceholder')} />
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.receiverLine}>
                                    <span className={styles.receiverText}>
                                        {`${form.first_name} ${form.last_name}`.trim()}
                                        {!!form.phone && <span dir="ltr">, {form.phone}</span>}
                                    </span>
                                    <button type="button" className={styles.receiverEditBtn} onClick={() => setEditReceiver(true)} aria-label={t('edit')}>
                                        <Pencil size={16} />
                                    </button>
                                </div>
                            )}

                            <label className={styles.checkRow}>
                                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                                <span>{t('setAsDefault')}</span>
                            </label>

                            <div className={styles.actions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>{t('cancel')}</button>
                                <button type="submit" className={styles.saveBtn} disabled={saving}>
                                    {saving ? (editingId ? t('updating') : t('adding')) : (editingId ? t('update') : t('add'))}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <button type="button" className={styles.addNew} onClick={openAddForm}>
                                <Plus size={18} />
                                <span>{t('addNew')}</span>
                            </button>

                            {loading ? (
                                <div className={styles.loading}>…</div>
                            ) : (
                                <div className={styles.list}>
                                    {addresses.map(addr => {
                                        const selected = selectedAddressId.toString() === addr.id.toString();
                                        const icon = addr.address_type === 'home' ? <Home size={18} /> : addr.address_type === 'work' ? <Building2 size={18} /> : <MapPin size={18} />;
                                        const typeLabel = addr.address_type === 'home' ? t('typeHome') : addr.address_type === 'work' ? t('typeWork') : (addr.address_label || t('typeOther'));
                                        return (
                                            <div
                                                key={addr.id}
                                                className={`${styles.card} ${selected ? styles.cardActive : ''}`}
                                                onClick={() => onSelect(addr)}
                                            >
                                                <div className={styles.cardIcon}>{icon}</div>
                                                <div className={styles.cardBody}>
                                                    <div className={styles.cardTop}>
                                                        <span className={styles.cardType}>{typeLabel}</span>
                                                        {selected && <span className={styles.selectedTag}><Check size={12} /> {t('default')}</span>}
                                                        <div className={styles.menuWrap}>
                                                            <button
                                                                type="button"
                                                                className={styles.menuBtn}
                                                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === addr.id ? null : addr.id); }}
                                                                aria-label="Options"
                                                            >
                                                                <MoreHorizontal size={18} />
                                                            </button>
                                                            {openMenu === addr.id && (
                                                                <>
                                                                    <div className={styles.menuBackdrop} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); }} />
                                                                    <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
                                                                        <button type="button" className={styles.menuItem} onClick={() => openEditForm(addr)}>
                                                                            <Edit2 size={15} /> {t('edit')}
                                                                        </button>
                                                                        <button type="button" className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => handleDelete(addr.id)}>
                                                                            <Trash2 size={15} /> {t('delete')}
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={styles.cardLine}>
                                                        {[addr.address_line1, addr.address_line2, addr.city].filter(Boolean).join(', ')}
                                                    </p>
                                                    <p className={styles.cardContact}>
                                                        <span>{addr.first_name} {addr.last_name}</span>
                                                        {!!addr.phone && <span dir="ltr"> {addr.phone}</span>}
                                                        <BadgeCheck size={15} className={styles.verified} />
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
