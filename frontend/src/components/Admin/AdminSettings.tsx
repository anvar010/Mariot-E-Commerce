'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminSettings.module.css';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import { 
    Settings, 
    Save, 
    RefreshCw, 
    Coins, 
    TrendingUp, 
    Info
} from 'lucide-react';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        points_per_aed: '1',
        aed_per_point: '0.01'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings`, { credentials: 'include', headers: getAuthHeaders() });
                const data = await res.json();
                if (data.success) {
                    setSettings({
                        points_per_aed: data.data.points_per_aed || '1',
                        aed_per_point: data.data.aed_per_point || '0.01'
                    });
                }
            } catch (error) {
                console.error('Failed to fetch settings', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            }
        } catch (error) {
            console.error('Failed to update settings', error);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className={styles.adminSettings}>
                <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={40} className={styles.spin} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>Loading Global Settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminSettings}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Global Settings</h1>
                    <p>Manage store-wide configurations and business logic.</p>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.sectionTitle}>
                    <Coins size={20} color="#3b82f6" />
                    <h3>Loyalty & Rewards Program</h3>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                        <label>Points Earned per AED</label>
                        <div className={styles.inputWrapper}>
                            <input 
                                type="number" 
                                name="points_per_aed" 
                                value={settings.points_per_aed} 
                                onChange={handleChange}
                                step="any"
                            />
                        </div>
                        <p>How many reward points does a customer get for every 1 AED spent?</p>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>AED Value per Point</label>
                        <div className={styles.inputWrapper}>
                            <input 
                                type="number" 
                                name="aed_per_point" 
                                value={settings.aed_per_point} 
                                onChange={handleChange}
                                step="any"
                            />
                        </div>
                        <p>What is the AED value of a single reward point during checkout? (e.g., 0.01 for 100 points = 1 AED)</p>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Info size={18} color="#64748b" style={{ marginTop: '2px' }} />
                        <div>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>How it works</h4>
                            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                                If <strong>Earn Rate</strong> is 1 and <strong>Point Value</strong> is 0.01:<br />
                                • Spend 1000 AED → Earn 1000 Points.<br />
                                • Use 1000 Points → Get 10 AED off your next order.
                            </p>
                        </div>
                    </div>
                </div>

                <button 
                    className={styles.saveBtn} 
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <RefreshCw size={18} className={styles.spin} />
                    ) : (
                        <Save size={18} />
                    )}
                    <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
            </div>

            {showToast && (
                <div className={styles.toast}>
                    Settings updated successfully!
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
