'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminReviews.module.css';
import { Trash2, Search, Star, Loader2, MessageSquare } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { stripHtml } from '@/utils/formatters';

const AdminReviews = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/reviews`, {
                credentials: "include"
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`Fetch failed with status ${res.status}: ${errorText}`);
                showNotification(`Failed to fetch reviews: ${res.status}`, 'error');
                setLoading(false);
                return;
            }

            const data = await res.json();
            if (data.success) {
                console.log(`Successfully fetched ${data.data.length} reviews`);
                setReviews(data.data);
            } else {
                console.error('API returned success: false', data.message);
                showNotification(data.message || 'Failed to fetch reviews', 'error');
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch reviews', error);
            showNotification('Network error while fetching reviews', 'error');
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this review?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/reviews/${id}`, {
                method: 'DELETE',
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                showNotification('Review deleted successfully');
                setReviews(prev => prev.filter(r => r.id !== id));
            } else {
                showNotification(data.message || 'Failed to delete review', 'error');
            }
        } catch (error) {
            showNotification('Error deleting review', 'error');
        }
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
                        <h1>Product Reviews</h1>
                        <span className={styles.totalBadge}>
                            {filteredReviews.length} Reviews
                        </span>
                    </div>
                    <p>Manage and moderate customer feedback across all products.</p>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by product, user, or comment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>User</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <Loader2 size={40} className={styles.spin} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                                    <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Scanning feedback archives...</p>
                                </td>
                            </tr>
                        ) : filteredReviews.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <p style={{ color: '#64748b', fontSize: '14px' }}>No reviews found matching your search.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredReviews.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <div className={styles.productInfo}>
                                            <img
                                                src={r.product_image ? `${API_BASE_URL.replace('/api/v1', '')}${r.product_image}` : 'https://via.placeholder.com/40'}
                                                alt={r.product_name}
                                                className={styles.productImage}
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
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(r.id)} title="Delete Review">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminReviews;
