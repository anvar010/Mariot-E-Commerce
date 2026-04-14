'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminReviews.module.css';
import { Trash2, Search, Star, Loader2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { stripHtml } from '@/utils/formatters';
import { resolveUrl } from '@/utils/resolveUrl';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import { useTranslations } from 'next-intl';

const AdminReviews = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showNotification } = useNotification();
    const t = useTranslations('admin.reviews');

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
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/reviews`, {
                credentials: "include",
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`Fetch failed with status ${res.status}: ${errorText}`);
                showNotification(`${t('notifications.fetchError')}: ${res.status}`, 'error');
                setLoading(false);
                return;
            }

            const data = await res.json();
            if (data.success) {
                console.log(`Successfully fetched ${data.data.length} reviews`);
                setReviews(data.data);
            } else {
                console.error('API returned success: false', data.message);
                showNotification(data.message || t('notifications.fetchError'), 'error');
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch reviews', error);
            showNotification(t('notifications.networkError'), 'error');
            setLoading(false);
        }
    };

    const handleDelete = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: t('modal.deleteTitle'),
            message: t('modal.deleteMessage'),
            type: 'danger',
            confirmLabel: t('modal.deleteConfirm'),
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/reviews/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification(t('notifications.deleteSuccess'));
                        setReviews(prev => prev.filter(r => r.id !== id));
                    } else {
                        showNotification(data.message || t('notifications.deleteError'), 'error');
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

    const filteredReviews = reviews.filter(r =>
        r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.adminReviews}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>{t('title')}</h1>
                        <span className={styles.totalBadge}>
                            {t('totalBadge', { count: filteredReviews.length })}
                        </span>
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

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t('table.product')}</th>
                            <th>{t('table.user')}</th>
                            <th>{t('table.rating')}</th>
                            <th>{t('table.comment')}</th>
                            <th>{t('table.date')}</th>
                            <th>{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <AdminLoader message={t('loader')} />
                                </td>
                            </tr>
                        ) : filteredReviews.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <p style={{ color: '#64748b', fontSize: '14px' }}>{t('empty')}</p>
                                </td>
                            </tr>
                        ) : (
                            filteredReviews.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <div className={styles.productInfo}>
                                            <img
                                                src={resolveUrl(r.product_image) || 'https://via.placeholder.com/40'}
                                                alt={r.product_name}
                                                className={styles.productImage}
                                                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/40'; }}
                                            />
                                            <span className={styles.productName} title={stripHtml(r.product_name)}>{stripHtml(r.product_name)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>{r.user_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.ratingWrapper}>
                                            <Star size={14} fill="#f59e0b" />
                                            <span className={styles.ratingValue}>{r.rating}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.commentCell}>
                                            {r.comment}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ color: '#475569', fontWeight: 500 }}>
                                            {new Date(r.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className={styles.actions}>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(r.id)} title={t('table.actions')}>
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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

export default AdminReviews;
