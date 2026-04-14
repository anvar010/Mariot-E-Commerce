'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminQuotations.module.css';
import { FileText, Search, Printer, Trash2, Eye, X, Calendar, User, Phone, Mail, Hash, Loader2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { generateQuotationPDF } from '@/utils/pdfGenerator';
import { resolveUrl } from '@/utils/resolveUrl';
import ConfirmModal from '@/components/shared/ConfirmModal/ConfirmModal';
import AdminLoader from '@/components/shared/AdminLoader/AdminLoader';
import { useTranslations } from 'next-intl';

const AdminQuotations = () => {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const { showNotification } = useNotification();
    const t = useTranslations('admin.quotations');

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
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/quotations`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setQuotations(data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch quotations', error);
            setLoading(false);
        }
    };

    const handleDelete = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: t('deleteModal.title'),
            message: t('deleteModal.message'),
            type: 'danger',
            confirmLabel: t('deleteModal.confirm'),
            onConfirm: async () => {
                try {
                    setIsActionLoading(true);
                    const res = await fetch(`${API_BASE_URL}/quotations/${id}`, {
                        method: 'DELETE',
                        credentials: "include",
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification(t('notifications.deleteSuccess'));
                        setQuotations(prev => prev.filter(q => q.id !== id));
                    } else {
                        showNotification(data.message || t('notifications.deleteError'), 'error');
                    }
                } catch (error) {
                    showNotification('Error deleting quotation', 'error');
                } finally {
                    setIsActionLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleViewDetails = (quotation: any) => {
        setSelectedQuotation(quotation);
        setIsModalOpen(true);
    };

    const filteredQuotations = quotations.filter(q =>
        q.quotation_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedQuotation(null);
    };

    const handlePrint = async (quotation: any) => {
        setIsPrinting(true);
        try {
            await generateQuotationPDF(quotation);
            showNotification(t('notifications.pdfSuccess'));
        } catch (error) {
            console.error('PDF Generation failed', error);
            showNotification(t('notifications.pdfError'), 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className={styles.adminQuotations}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>{t('title')}</h1>
                        <span className={styles.totalBadge}>
                            {t('totalBadge', { count: filteredQuotations.length })}
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
                            <th>{t('table.ref')}</th>
                            <th>{t('table.customer')}</th>
                            <th>{t('table.date')}</th>
                            <th>{t('table.value')}</th>
                            <th>{t('table.vat')}</th>
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
                        ) : filteredQuotations.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <p style={{ color: '#64748b', fontSize: '14px' }}>{t('empty')}</p>
                                </td>
                            </tr>
                        ) : (
                            filteredQuotations.map((q) => (
                                <tr key={q.id}>
                                    <td>
                                        <span className={styles.refCode}>{q.quotation_ref}</span>
                                    </td>
                                    <td>
                                        <div className={styles.customerInfo}>
                                            <span className={styles.customerName}>{q.customer_name}</span>
                                            <span className={styles.customerEmail}>{q.customer_email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ color: '#475569', fontWeight: 500 }}>
                                            {new Date(q.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.totalAmount}>
                                            {Number(q.total_amount).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.vatText}>{q.vat_number || 'TRN: UNSET'}</span>
                                    </td>
                                    <td className={styles.actions}>
                                        <button className={styles.viewBtn} onClick={() => handleViewDetails(q)} title={t('modal.summary')}>
                                            <Eye size={18} />
                                        </button>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(q.id)} title={t('deleteModal.confirm')}>
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && selectedQuotation && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{t('modal.title', { ref: selectedQuotation.quotation_ref })}</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={24} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailSection}>
                                    <h3>{t('modal.customerInfo')}</h3>
                                    <div className={styles.detailItem}>
                                        <User size={16} />
                                        <span><strong>{t('modal.name')}:</strong> {selectedQuotation.customer_name}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <Mail size={16} />
                                        <span><strong>{t('modal.email')}:</strong> {selectedQuotation.customer_email}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <Phone size={16} />
                                        <span><strong>{t('modal.phone')}:</strong> {selectedQuotation.customer_phone}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <Hash size={16} />
                                        <span><strong>{t('modal.vat')}:</strong> {selectedQuotation.vat_number || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className={styles.detailSection}>
                                    <h3>{t('modal.summary')}</h3>
                                    <div className={styles.detailItem}>
                                        <Calendar size={16} />
                                        <span><strong>{t('modal.dateGenerated')}:</strong> {new Date(selectedQuotation.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className={styles.summaryBox}>
                                        <div className={styles.summaryLine}>
                                            <span>{t('modal.subtotal')}</span>
                                            <span>AED {Number(selectedQuotation.subtotal).toFixed(2)}</span>
                                        </div>
                                        <div className={styles.summaryLine}>
                                            <span>{t('modal.tax')}</span>
                                            <span>AED {Number(selectedQuotation.tax_amount).toFixed(2)}</span>
                                        </div>
                                        <div className={`${styles.summaryLine} ${styles.totalLine}`}>
                                            <span>{t('modal.total')}</span>
                                            <span>AED {Number(selectedQuotation.total_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.itemsSection}>
                                <h3>{t('modal.quotedItems')}</h3>
                                <div className={styles.itemList}>
                                    {JSON.parse(selectedQuotation.items).map((item: any, idx: number) => (
                                        <div key={idx} className={styles.itemCard}>
                                            <img
                                                src={resolveUrl(item.image_url) || '/assets/placeholder-image.webp'}
                                                alt={item.name}
                                                className={styles.itemImage}
                                                onError={(e) => { e.currentTarget.src = '/assets/placeholder-image.webp'; }}
                                            />
                                            <div className={styles.itemDetails}>
                                                <span className={styles.itemName}>{item.name}</span>
                                                <span className={styles.itemMeta}>Qty: {item.quantity} x AED {item.price}</span>
                                            </div>
                                            <span className={styles.itemTotal}>AED {(item.quantity * item.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.printBtn}
                                onClick={() => handlePrint(selectedQuotation)}
                                disabled={isPrinting}
                            >
                                {isPrinting ? <Loader2 size={18} className={styles.spin} /> : <Printer size={18} />}
                                <span>{isPrinting ? t('modal.generating') : t('modal.print')}</span>
                            </button>
                            <button className={styles.closeActionBtn} onClick={closeModal}>{t('modal.close')}</button>
                        </div>
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

export default AdminQuotations;
