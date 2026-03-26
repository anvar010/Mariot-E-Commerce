'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminUsers.module.css';
import { Search, Trash2, Shield, User, Users, X, Edit2, Calendar, Ban, CheckCircle } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showNotification } = useNotification();

    // Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role_id: ''
    });

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

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
                method: 'DELETE',
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showNotification('User account removed');
                fetchUsers();
            }
        } catch (error) {
            showNotification('Failed to delete user', 'error');
        }
    };

    const handleToggleStatus = async (id: number, currentStatus: string) => {
        const action = currentStatus === 'active' ? 'suspend' : 'activate';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${id}/status`, {
                method: 'PATCH',
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message);
                fetchUsers();
            } else {
                showNotification(data.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            showNotification('Failed to update user status', 'error');
        }
    };

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role_id: user.role_id ? user.role_id.toString() : '2'
        });
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
                showNotification('User profile updated successfully');
                setIsModalOpen(false);
                setEditingUser(null);
                fetchUsers();
            } else {
                showNotification(data.message || 'Failed to update user', 'error');
            }
        } catch (error) {
            showNotification('An error occurred', 'error');
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
                        <h1>Users Management</h1>
                        <div className={styles.totalBadge}>
                            <Users size={14} />
                            <span><strong>{users.length}</strong> members</span>
                        </div>
                    </div>
                    <p>Manage access levels and account details for your team and customers.</p>
                </div>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>User Details</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px' }}>Loading member directory...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px' }}>No users found Matching your search.</td></tr>
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
                                            {(user.role || 'USER').toUpperCase()}
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
                                            {(user.status || 'active').toUpperCase()}
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
                                                title="Edit Profile"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                style={{
                                                    background: (user.status || 'active') === 'active' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                                                    color: (user.status || 'active') === 'active' ? '#dc2626' : '#16a34a',
                                                    border: `1px solid ${(user.status || 'active') === 'active' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                                                    borderRadius: '8px',
                                                    padding: '6px 8px',
                                                    cursor: (user.role || 'user').toLowerCase() === 'admin' ? 'not-allowed' : 'pointer',
                                                    opacity: (user.role || 'user').toLowerCase() === 'admin' ? 0.4 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                onClick={() => handleToggleStatus(user.id, user.status || 'active')}
                                                disabled={(user.role || 'user').toLowerCase() === 'admin'}
                                                title={(user.role || 'user').toLowerCase() === 'admin' ? "Admin accounts cannot be suspended" : ((user.status || 'active') === 'active' ? 'Suspend User' : 'Activate User')}
                                            >
                                                {(user.status || 'active') === 'active' ? <Ban size={16} /> : <CheckCircle size={16} />}
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={(user.role || 'user').toLowerCase() === 'admin'}
                                                title={(user.role || 'user').toLowerCase() === 'admin' ? "Admin accounts cannot be deleted here" : "Delete Account"}
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
                            <h2>Edit User Account</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleUpdateUser}>
                            <div className={styles.formGroup}>
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter user name"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Account Role</label>
                                <select
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select a role</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
