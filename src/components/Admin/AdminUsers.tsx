'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminUsers.module.css';
import { Search, Trash2, Shield, User, Users, X, Edit2, Calendar, Ban, CheckCircle, Coins } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import { useTranslations } from 'next-intl';

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showNotification } = useNotification();
    const t = useTranslations('admin.users');

    // Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role_id: ''
    });

    // Points form state (lives inside edit modal)
    const [pointsForm, setPointsForm] = useState<{ amount: string; action: 'add' | 'remove' }>({
        amount: '',
        action: 'add'
    });
    const [isPointsSubmitting, setIsPointsSubmitting] = useState(false);
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
        confirmLabel?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/roles`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setRoles(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch roles', error);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
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
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification(t('notifications.deleteSuccess'));
                        fetchUsers();
                    }
                } catch (error) {
                    showNotification(t('notifications.deleteError'), 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleToggleStatusInModal = async () => {
        if (!editingUser) return;
        const isActive = (editingUser.status || 'active') === 'active';
        try {
            setIsStatusSubmitting(true);
            const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}/status`, {
                method: 'PATCH',
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message);
                setEditingUser({ ...editingUser, status: isActive ? 'suspended' : 'active' });
                fetchUsers();
            } else {
                showNotification(data.message || t('notifications.statusUpdateError'), 'error');
            }
        } catch (error) {
            showNotification(t('notifications.statusUpdateError'), 'error');
        } finally {
            setIsStatusSubmitting(false);
        }
    };

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role_id: user.role_id ? user.role_id.toString() : '2'
        });
        setPointsForm({ amount: '', action: 'add' });
        setIsModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}`, {
                credentials: "include",
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
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
        } catch (error) {
            showNotification(t('notifications.genericError'), 'error');
        }
    };

    const handlePointsApply = async () => {
        if (!editingUser) return;
        const amount = parseInt(pointsForm.amount, 10);
        if (!amount || amount <= 0) return;
        try {
            setIsPointsSubmitting(true);
            const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}/points`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
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
        } catch (error) {
            showNotification(t('notifications.pointsUpdateError'), 'error');
        } finally {
            setIsPointsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
                            filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            <div className={styles.avatar}>
                                                <User size={20} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span className={styles.userName}>{user.name}</span>
                                                <span className={styles.userEmail}>{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${(user.role || 'user').toLowerCase() === 'admin' ? styles.admin : styles.user}`}>
                                            {(user.role || 'user').toLowerCase() === 'admin' && <Shield size={12} style={{ marginInlineEnd: '6px' }} />}
                                            {t(`roles.${(user.role || 'USER').toLowerCase()}` as any)}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            background: (user.status || 'active') === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: (user.status || 'active') === 'active' ? '#16a34a' : '#dc2626',
                                            border: `1px solid ${(user.status || 'active') === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                        }}>
                                            {(user.status || 'active') === 'active' ? <CheckCircle size={12} /> : <Ban size={12} />}
                                            {t(`status.${(user.status || 'active').toLowerCase()}` as any)}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            background: 'rgba(234, 179, 8, 0.1)',
                                            color: '#ca8a04',
                                            border: '1px solid rgba(234, 179, 8, 0.2)'
                                        }}>
                                            <Coins size={12} />
                                            {Number(user.reward_points) || 0}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                                            <Calendar size={14} />
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                            <button
                                                className={styles.editBtn}
                                                onClick={() => handleEditClick(user)}
                                                title={t('tooltips.edit')}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={(user.role || 'user').toLowerCase() === 'admin'}
                                                title={(user.role || 'user').toLowerCase() === 'admin' ? t('tooltips.adminNoDelete') : t('tooltips.delete')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{t('modals.editTitle')}</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleUpdateUser}>
                            <div className={styles.formGroup}>
                                <label>{t('modals.nameLabel')}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('modals.namePlaceholder')}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('modals.emailLabel')}</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder={t('modals.emailPlaceholder')}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('modals.roleLabel')}</label>
                                <select
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>{t('modals.selectRole')}</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {editingUser && (() => {
                                const isAdmin = (editingUser.role || 'user').toLowerCase() === 'admin';
                                const isActive = (editingUser.status || 'active') === 'active';
                                return (
                                    <div className={styles.formGroup} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                        <label>{t('table.status')}</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: isActive ? '#16a34a' : '#dc2626',
                                                border: `1px solid ${isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                            }}>
                                                {isActive ? <CheckCircle size={12} /> : <Ban size={12} />}
                                                {t(`status.${(editingUser.status || 'active').toLowerCase()}` as any)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleToggleStatusInModal}
                                                disabled={isAdmin || isStatusSubmitting}
                                                title={isAdmin ? t('tooltips.adminNoSuspend') : (isActive ? t('tooltips.suspend') : t('tooltips.activate'))}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '8px 14px',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    background: isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                                                    color: isActive ? '#dc2626' : '#16a34a',
                                                    border: `1px solid ${isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                                                    cursor: isAdmin || isStatusSubmitting ? 'not-allowed' : 'pointer',
                                                    opacity: isAdmin ? 0.4 : 1
                                                }}
                                            >
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
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            borderRadius: '10px',
                                            background: 'rgba(234, 179, 8, 0.1)',
                                            color: '#ca8a04',
                                            border: '1px solid rgba(234, 179, 8, 0.2)',
                                            fontSize: '13px',
                                            fontWeight: 600
                                        }}>
                                            <Coins size={14} />
                                            {t('modals.pointsCurrent')}: {Number(editingUser.reward_points) || 0}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <select
                                            value={pointsForm.action}
                                            onChange={(e) => setPointsForm({ ...pointsForm, action: e.target.value as 'add' | 'remove' })}
                                            style={{ flex: '1 1 140px' }}
                                        >
                                            <option value="add">{t('modals.pointsActionAdd')}</option>
                                            <option value="remove">{t('modals.pointsActionRemove')}</option>
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={pointsForm.amount}
                                            onChange={(e) => setPointsForm({ ...pointsForm, amount: e.target.value })}
                                            placeholder={t('modals.pointsAmountPlaceholder')}
                                            style={{ flex: '1 1 140px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePointsApply}
                                            disabled={isPointsSubmitting || !pointsForm.amount}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                background: 'rgba(234, 179, 8, 0.1)',
                                                color: '#ca8a04',
                                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                                cursor: isPointsSubmitting || !pointsForm.amount ? 'not-allowed' : 'pointer',
                                                opacity: isPointsSubmitting || !pointsForm.amount ? 0.5 : 1
                                            }}
                                        >
                                            {t('modals.pointsApply')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    {t('modals.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                >
                                    {t('modals.save')}
                                </button>
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
