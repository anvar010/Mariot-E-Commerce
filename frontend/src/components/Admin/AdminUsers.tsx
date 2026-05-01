'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminUsers.module.css';
import { Search, Trash2, Shield, User, Users, X, Edit2, Calendar, Ban, CheckCircle, Coins, UserPlus, Wrench } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';

// All admin menu items with their permission keys
const ADMIN_PERMISSIONS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'products', label: 'Products' },
    { key: 'categories', label: 'Categories' },
    { key: 'brands', label: 'Brands' },
    { key: 'orders', label: 'Orders' },
    { key: 'coupons', label: 'Coupons' },
    { key: 'users', label: 'Users' },
    { key: 'seo', label: 'SEO' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'cms', label: 'CMS Manager' },
    { key: 'settings', label: 'Settings' },
    { key: 'quotations', label: 'Quotations' },
    { key: 'reviews', label: 'Reviews' },
];

function parsePerms(raw: any): string[] {
    if (!raw) return [];
    try { return typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); } catch { return []; }
}

function getRoleBadgeClass(role: string, styles: any) {
    if (role === 'admin') return styles.admin;
    if (role === 'staff') return styles.staff;
    return styles.user;
}

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showNotification } = useNotification();
    const { user: currentUser } = useAuth();
    const t = useTranslations('admin.users');

    // --- Edit modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', email: '', role_id: '' });
    const [editPerms, setEditPerms] = useState<string[]>([]);

    // --- Create modal ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role_id: '' });
    const [createPerms, setCreatePerms] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // --- Points form (inside edit modal) ---
    const [pointsForm, setPointsForm] = useState<{ amount: string; action: 'add' | 'remove' }>({ amount: '', action: 'add' });
    const [isPointsSubmitting, setIsPointsSubmitting] = useState(false);
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

    // --- Confirm modal ---
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; title: string; message: string;
        onConfirm: () => void; type: 'danger' | 'warning' | 'info'; confirmLabel?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'danger' });
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => { fetchUsers(); fetchRoles(); }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/roles`, { credentials: 'include', headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) setRoles(data.data);
        } catch { /* silent */ }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include', headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) setUsers(data.data);
        } catch { /* silent */ } finally { setLoading(false); }
    };

    const isStaffRole = (roleId: string) => {
        const found = roles.find(r => r.id.toString() === roleId.toString());
        return found?.name === 'staff';
    };

    // ---------- Create ----------
    const openCreateModal = () => {
        setCreateForm({ name: '', email: '', password: '', role_id: roles.find(r => r.name === 'user')?.id?.toString() || '' });
        setCreatePerms([]);
        setIsCreateOpen(true);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            const payload: any = { ...createForm };
            if (isStaffRole(createForm.role_id)) payload.staff_permissions = createPerms;
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                method: 'POST', credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showNotification(t('notifications.createSuccess'));
                setIsCreateOpen(false);
                fetchUsers();
            } else {
                showNotification(data.message || t('notifications.createError'), 'error');
            }
        } catch { showNotification(t('notifications.genericError'), 'error'); }
        finally { setIsCreating(false); }
    };

    const toggleCreatePerm = (key: string) => {
        setCreatePerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    // ---------- Edit ----------
    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, role_id: user.role_id ? user.role_id.toString() : '2' });
        setEditPerms(parsePerms(user.staff_permissions));
        setPointsForm({ amount: '', action: 'add' });
        setIsModalOpen(true);
    };

    const toggleEditPerm = (key: string) => {
        setEditPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...formData };
            if (isStaffRole(formData.role_id)) {
                payload.staff_permissions = editPerms;
            } else {
                payload.staff_permissions = null;
            }
            const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}`, {
                credentials: 'include', method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showNotification(t('notifications.updateSuccess'));
                setIsModalOpen(false);
                setEditingUser(null);
                fetchUsers();
            } else {
                showNotification(data.message || t('notifications.updateError'), 'error');
            }
        } catch { showNotification(t('notifications.genericError'), 'error'); }
    };

    // ---------- Status / Points / Delete ----------
    const handleToggleStatusInModal = async () => {
        if (!editingUser) return;
        const isActive = (editingUser.status || 'active') === 'active';
        try {
            setIsStatusSubmitting(true);
            const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}/status`, {
                method: 'PATCH', credentials: 'include', headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message);
                setEditingUser({ ...editingUser, status: isActive ? 'suspended' : 'active' });
                fetchUsers();
            } else {
                showNotification(data.message || t('notifications.statusUpdateError'), 'error');
            }
        } catch { showNotification(t('notifications.statusUpdateError'), 'error'); }
        finally { setIsStatusSubmitting(false); }
    };

    const handlePointsApply = async () => {
        if (!editingUser) return;
        const amount = parseInt(pointsForm.amount, 10);
        if (!amount || amount <= 0) return;
        try {
            setIsPointsSubmitting(true);
            const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}/points`, {
                method: 'POST', credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: amount, action: pointsForm.action })
            });
            const data = await res.json();
            if (data.success) {
                showNotification(t('notifications.pointsUpdateSuccess'));
                setEditingUser({ ...editingUser, reward_points: data.data.reward_points });
                setPointsForm({ amount: '', action: 'add' });
                fetchUsers();
            } else {
                showNotification(data.message || t('notifications.pointsUpdateError'), 'error');
            }
        } catch { showNotification(t('notifications.pointsUpdateError'), 'error'); }
        finally { setIsPointsSubmitting(false); }
    };

    const handleDeleteUser = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: t('modals.deleteTitle'),
            message: t('modals.deleteMessage'),
            type: 'danger',
            confirmLabel: t('modals.deleteConfirm'),
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
                        method: 'DELETE', credentials: 'include', headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) { showNotification(t('notifications.deleteSuccess')); fetchUsers(); }
                } catch { showNotification(t('notifications.deleteError'), 'error'); }
                finally { setIsActionLoading(false); setConfirmModal(prev => ({ ...prev, isOpen: false })); }
            }
        });
    };

    const filteredUsers = users.filter(u => {
        if (currentUser?.role === 'staff' && (u.role || '').toLowerCase() === 'admin') return false;
        return u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Shared staff-permissions checkbox UI
    const PermissionsPanel = ({ perms, onToggle }: { perms: string[]; onToggle: (k: string) => void }) => (
        <div className={styles.formGroup} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={14} />
                {t('modals.staffPermsLabel')}
            </label>
            <div className={styles.permissionsGrid}>
                {ADMIN_PERMISSIONS.map(p => (
                    <label
                        key={p.key}
                        className={`${styles.permCheckbox} ${perms.includes(p.key) ? styles.checked : ''}`}
                    >
                        <input
                            type="checkbox"
                            checked={perms.includes(p.key)}
                            onChange={() => onToggle(p.key)}
                        />
                        {p.label}
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <div className={styles.adminUsers}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>{t('title')}</h1>
                        <div className={styles.totalBadge}>
                            <Users size={14} />
                            <span>{t('totalBadge', { count: users.length })}</span>
                        </div>
                    </div>
                    <p>{t('subtitle')}</p>
                </div>
                <button className={styles.createBtn} onClick={openCreateModal}>
                    <UserPlus size={16} />
                    {t('createBtn')}
                </button>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t('table.details')}</th>
                            <th>{t('table.role')}</th>
                            <th>{t('table.status')}</th>
                            <th>{t('table.points')}</th>
                            <th>{t('table.joined')}</th>
                            <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px' }}><AdminLoader message={t('loader')} /></td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px' }}>{t('empty')}</td></tr>
                        ) : (
                            filteredUsers.map((u) => {
                                const role = (u.role || 'user').toLowerCase();
                                return (
                                    <tr key={u.id}>
                                        <td>
                                            <div className={styles.userCell}>
                                                <div className={styles.avatar}><User size={20} /></div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className={styles.userName}>{u.name}</span>
                                                    <span className={styles.userEmail}>{u.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${getRoleBadgeClass(role, styles)}`}>
                                                {role === 'admin' && <Shield size={12} style={{ marginInlineEnd: '6px' }} />}
                                                {role === 'staff' && <Wrench size={12} style={{ marginInlineEnd: '6px' }} />}
                                                {t(`roles.${role}` as any, { defaultValue: role.toUpperCase() })}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                                background: (u.status || 'active') === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: (u.status || 'active') === 'active' ? '#16a34a' : '#dc2626',
                                                border: `1px solid ${(u.status || 'active') === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                                            }}>
                                                {(u.status || 'active') === 'active' ? <CheckCircle size={12} /> : <Ban size={12} />}
                                                {t(`status.${(u.status || 'active').toLowerCase()}` as any)}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                                background: 'rgba(234,179,8,0.1)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.2)'
                                            }}>
                                                <Coins size={12} />{Number(u.reward_points) || 0}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                                                <Calendar size={14} />
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                                <button className={styles.editBtn} onClick={() => handleEditClick(u)} title={t('tooltips.edit')}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    disabled={role === 'admin'}
                                                    title={role === 'admin' ? t('tooltips.adminNoDelete') : t('tooltips.delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Create User Modal ── */}
            {isCreateOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{t('modals.createTitle')}</h2>
                            <button className={styles.closeBtn} onClick={() => setIsCreateOpen(false)}><X size={20} /></button>
                        </div>
                        <form className={styles.form} onSubmit={handleCreateUser}>
                            <div className={styles.formGroup}>
                                <label>{t('modals.nameLabel')}</label>
                                <input type="text" value={createForm.name} required placeholder={t('modals.namePlaceholder')}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('modals.emailLabel')}</label>
                                <input type="email" value={createForm.email} required placeholder={t('modals.emailPlaceholder')}
                                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('modals.passwordLabel')}</label>
                                <input type="password" value={createForm.password} required placeholder={t('modals.passwordPlaceholder')}
                                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('modals.roleLabel')}</label>
                                <select value={createForm.role_id} required
                                    onChange={e => { setCreateForm({ ...createForm, role_id: e.target.value }); setCreatePerms([]); }}>
                                    <option value="" disabled>{t('modals.selectRole')}</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            {isStaffRole(createForm.role_id) && (
                                <PermissionsPanel perms={createPerms} onToggle={toggleCreatePerm} />
                            )}
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsCreateOpen(false)}>
                                    {t('modals.cancel')}
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isCreating}>
                                    {isCreating ? '...' : t('modals.createConfirm')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit User Modal ── */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{t('modals.editTitle')}</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form className={styles.form} onSubmit={handleUpdateUser}>
                            <div className={styles.formGroup}>
                                <label>{t('modals.nameLabel')}</label>
                                <input type="text" value={formData.name} required placeholder={t('modals.namePlaceholder')}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('modals.emailLabel')}</label>
                                <input type="email" value={formData.email} required placeholder={t('modals.emailPlaceholder')}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('modals.roleLabel')}</label>
                                <select value={formData.role_id} required
                                    onChange={e => { setFormData({ ...formData, role_id: e.target.value }); setEditPerms([]); }}>
                                    <option value="" disabled>{t('modals.selectRole')}</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>

                            {isStaffRole(formData.role_id) && (
                                <PermissionsPanel perms={editPerms} onToggle={toggleEditPerm} />
                            )}

                            {editingUser && (() => {
                                const isAdmin = (editingUser.role || 'user').toLowerCase() === 'admin';
                                const isActive = (editingUser.status || 'active') === 'active';
                                return (
                                    <div className={styles.formGroup} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                        <label>{t('table.status')}</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                                background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: isActive ? '#16a34a' : '#dc2626',
                                                border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                                            }}>
                                                {isActive ? <CheckCircle size={12} /> : <Ban size={12} />}
                                                {t(`status.${(editingUser.status || 'active').toLowerCase()}` as any)}
                                            </span>
                                            <button type="button" onClick={handleToggleStatusInModal}
                                                disabled={isAdmin || isStatusSubmitting}
                                                title={isAdmin ? t('tooltips.adminNoSuspend') : (isActive ? t('tooltips.suspend') : t('tooltips.activate'))}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                                    background: isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                                                    color: isActive ? '#dc2626' : '#16a34a',
                                                    border: `1px solid ${isActive ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                                                    cursor: isAdmin || isStatusSubmitting ? 'not-allowed' : 'pointer',
                                                    opacity: isAdmin ? 0.4 : 1
                                                }}>
                                                {isActive ? <Ban size={14} /> : <CheckCircle size={14} />}
                                                {isActive ? t('modals.suspendConfirm') : t('modals.activateConfirm')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {editingUser && (
                                <div className={styles.formGroup} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                    <label>{t('modals.pointsTitle')}</label>
                                    <div style={{ marginBottom: '10px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 12px', borderRadius: '10px',
                                            background: 'rgba(234,179,8,0.1)', color: '#ca8a04',
                                            border: '1px solid rgba(234,179,8,0.2)', fontSize: '13px', fontWeight: 600
                                        }}>
                                            <Coins size={14} />
                                            {t('modals.pointsCurrent')}: {Number(editingUser.reward_points) || 0}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <select value={pointsForm.action}
                                            onChange={e => setPointsForm({ ...pointsForm, action: e.target.value as 'add' | 'remove' })}
                                            style={{ flex: '1 1 140px' }}>
                                            <option value="add">{t('modals.pointsActionAdd')}</option>
                                            <option value="remove">{t('modals.pointsActionRemove')}</option>
                                        </select>
                                        <input type="number" min="1" value={pointsForm.amount}
                                            onChange={e => setPointsForm({ ...pointsForm, amount: e.target.value })}
                                            placeholder={t('modals.pointsAmountPlaceholder')}
                                            style={{ flex: '1 1 140px' }} />
                                        <button type="button" onClick={handlePointsApply}
                                            disabled={isPointsSubmitting || !pointsForm.amount}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                                background: 'rgba(234,179,8,0.1)', color: '#ca8a04',
                                                border: '1px solid rgba(234,179,8,0.3)',
                                                cursor: isPointsSubmitting || !pointsForm.amount ? 'not-allowed' : 'pointer',
                                                opacity: isPointsSubmitting || !pointsForm.amount ? 0.5 : 1
                                            }}>
                                            {t('modals.pointsApply')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                                    {t('modals.cancel')}
                                </button>
                                <button type="submit" className={styles.submitBtn}>{t('modals.save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                type={confirmModal.type}
                isLoading={isActionLoading}
            />
        </div>
    );
};

export default AdminUsers;
