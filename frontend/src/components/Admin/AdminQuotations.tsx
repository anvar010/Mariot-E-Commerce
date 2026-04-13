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

const AdminQuotations = () => {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const { showNotification } = useNotification();

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
            title: 'Delete Quotation',
            message: 'Are you sure you want to delete this quotation?',
            type: 'danger',
            confirmLabel: 'Delete',
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
                        showNotification('Quotation deleted successfully');
                        setQuotations(prev => prev.filter(q => q.id !== id));
                    } else {
                        showNotification(data.message || 'Failed to delete quotation', 'error');
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
            showNotification('PDF generated successfully');
        } catch (error) {
            console.error('PDF Generation failed', error);
            showNotification('Failed to generate PDF', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className={styles.adminQuotations}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Quotations</h1>
                        <span className={styles.totalBadge}>
                            {filteredQuotations.length} Active
                        </span>
                    </div>
                    <p>Track wholesale inquiries and generated discount quotations.</p>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search for reference, customer name, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Quotation Ref</th>
                            <th>Customer Identity</th>
                            <th>Date Created</th>
                            <th>Value (AED)</th>
                            <th>VAT Number</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <AdminLoader message="Scanning Quotation Archives..." />
                                </td>
                            </tr>
                        ) : filteredQuotations.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <p style={{ color: '#64748b', fontSize: '14px' }}>No quotation records matching your search.</p>
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
                                        <button className={styles.viewBtn} onClick={() => handleViewDetails(q)} title="View Detail">
                                            <Eye size={18} />
                                        </button>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(q.id)} title="Delete Quotation">
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
                            <h2>Quotation Details - {selectedQuotation.quotation_ref}</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={24} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailSection}>
                                    <h3>Customer Information</h3>
                                    <div className={styles.detailItem}>
                                        <User size={16} />
                                        <span><strong>Name:</strong> {selectedQuotation.customer_name}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <Mail size={16} />
                                        <span><strong>Email:</strong> {selectedQuotation.customer_email}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <Phone size={16} />
                                        <span><strong>Phone:</strong> {selectedQuotation.customer_phone}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <Hash size={16} />
                                        <span><strong>VAT #:</strong> {selectedQuotation.vat_number || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className={styles.detailSection}>
                                    <h3>Summary</h3>
                                    <div className={styles.detailItem}>
                                        <Calendar size={16} />
                                        <span><strong>Date Generated:</strong> {new Date(selectedQuotation.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className={styles.summaryBox}>
                                        <div className={styles.summaryLine}>
                                            <span>Subtotal</span>
                                            <span>AED {Number(selectedQuotation.subtotal).toFixed(2)}</span>
                                        </div>
                                        <div className={styles.summaryLine}>
                                            <span>Tax (5%)</span>
                                            <span>AED {Number(selectedQuotation.tax_amount).toFixed(2)}</span>
                                        </div>
                                        <div className={`${styles.summaryLine} ${styles.totalLine}`}>
                                            <span>Total Amount</span>
                                            <span>AED {Number(selectedQuotation.total_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.itemsSection}>
                                <h3>Quoted Items</h3>
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
                                <span>{isPrinting ? 'Generating...' : 'Print Quotation'}</span>
                            </button>
                            <button className={styles.closeActionBtn} onClick={closeModal}>Close</button>
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
