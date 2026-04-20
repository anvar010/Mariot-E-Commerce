'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminSEO.module.css';
import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';
import {
    Search,
    Globe,
    AlertTriangle,
    CheckCircle2,
    Activity,
    TrendingUp,
    Zap,
    Users,
    RefreshCw,
    ChevronDown
} from 'lucide-react';

const AdminSEO = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadTime, setLoadTime] = useState('1.2s');
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const fetchStats = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        const startTime = performance.now();

        try {
            const res = await fetch(`${API_BASE_URL}/admin/stats`, {
                credentials: "include",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.data);
                const endTime = performance.now();
                const duration = ((endTime - startTime) / 1000).toFixed(2);
                setLoadTime(`${duration}s`);
            }
        } catch (error) {
            console.error('Failed to fetch SEO stats', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className={styles.adminSEO}>
                <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={40} className={styles.spin} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>Scanning Search Engine Metadata...</p>
                </div>
            </div>
        );
    }

    const { seoStats, totalProducts, userGrowth, dbLatencyMs } = stats || { seoStats: { score: 100, issues: {} }, totalProducts: 0, userGrowth: 0, dbLatencyMs: null };
    const seoIssuesData = seoStats?.issues || {};

    return (
        <div className={styles.adminSEO}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>SEO Analytics</h1>
                        <span className={styles.badge}>
                            <Activity size={12} />
                            LIVE AUDIT
                        </span>
                    </div>
                    <p>Optimize your search engine presence and track indexing health.</p>
                </div>
                <button
                    className={styles.refreshBtn}
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                >
                    <RefreshCw size={16} className={refreshing ? styles.spin : ''} />
                    <span>{refreshing ? 'Analyzing...' : 'Refresh Audit'}</span>
                </button>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBox} ${styles.blueIcon}`}>
                        <Globe size={20} />
                    </div>
                    <div>
                        <div className={styles.statValue}>{seoStats?.score ?? 100}/100</div>
                        <div className={styles.statLabel}>Global SEO Score</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBox} ${styles.greenIcon}`}>
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <div className={styles.statValue}>{totalProducts - (seoIssuesData.missingDescription || 0)}</div>
                        <div className={styles.statLabel}>Indexed Pages</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBox} ${styles.yellowIcon}`}>
                        <Zap size={20} />
                    </div>
                    <div>
                        <div className={styles.statValue}>{loadTime}</div>
                        <div className={styles.statLabel}>Avg. Load Time</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBox} ${styles.indigoIcon}`}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className={styles.statValue}>{userGrowth > 0 ? `+${userGrowth}%` : `${userGrowth || 0}%`}</div>
                        <div className={styles.statLabel}>User Growth (30d)</div>
                    </div>
                </div>
            </div>

            <div className={styles.analysisGrid}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <Search size={18} color="#3b82f6" />
                        <h3>Product Content Health</h3>
                    </div>
                    <div className={styles.cardContent}>
                        {[
                            {
                                label: 'Missing Primary Images',
                                count: seoIssuesData.missingImages || 0,
                                color: '#ef4444',
                                badgeClass: styles.countBad
                            },
                            {
                                label: 'Missing Meta Descriptions',
                                count: seoIssuesData.missingDescription || 0,
                                color: '#f59e0b',
                                badgeClass: styles.countWarning
                            },
                            {
                                label: 'Title Tag Issues (Length)',
                                count: (seoIssuesData.shortTitles || 0) + (seoIssuesData.longTitles || 0),
                                color: '#6366f1',
                                badgeClass: styles.countInfo
                            },
                            {
                                label: 'Missing Brand Tags',
                                count: seoIssuesData.missingBrand || 0,
                                color: '#10b981',
                                badgeClass: styles.countGood
                            }
                        ].map((item, idx) => (
                            <div key={idx} className={styles.healthItem}>
                                <div className={styles.healthLabel}>
                                    <span>{item.label}</span>
                                    <span className={`${styles.healthCount} ${item.badgeClass}`}>
                                        {item.count} items
                                    </span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{
                                            width: `${totalProducts ? Math.min(100, (item.count / totalProducts) * 100) : 0}%`,
                                            backgroundColor: item.color
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <Zap size={18} color="#f59e0b" />
                        <h3>Technical Performance</h3>
                    </div>
                    <div className={styles.cardContent}>
                        {[
                            { label: 'API', desc: 'Server Response Time', value: loadTime, status: parseFloat(loadTime) < 0.5 ? 'EXCELLENT' : 'GOOD' },
                            { label: 'DB', desc: 'Database Query Latency', value: dbLatencyMs != null ? `${dbLatencyMs}ms` : '—', status: dbLatencyMs == null ? '—' : dbLatencyMs < 10 ? 'EXCELLENT' : dbLatencyMs < 50 ? 'GOOD' : 'SLOW' }
                        ].map((vite, idx) => (
                            <div key={idx} className={styles.perfItem}>
                                <div className={styles.perfLabel}>
                                    <strong>{vite.label}</strong>
                                    <span>{vite.desc}</span>
                                </div>
                                <div className={styles.perfValueBlock}>
                                    <span className={styles.perfValue}>{vite.value}</span>
                                    <span className={styles.perfBadge}>{vite.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.actionPlan}>
                <h3>SEO Optimization Plan</h3>
                <div className={styles.actionGrid}>
                    {seoIssuesData.missingImages > 0 && (
                        <div
                            className={styles.actionItem}
                            style={{ background: '#fef2f2' }}
                            onClick={() => toggleSection('images')}
                        >
                            <div className={styles.actionMain}>
                                <div className={styles.actionIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>
                                    <AlertTriangle size={18} />
                                </div>
                                <div className={styles.actionText}>
                                    <h4 style={{ color: '#991b1b' }}>Critical: Recover Missing Visuals</h4>
                                    <p style={{ color: '#b91c1c' }}>{seoIssuesData.missingImages} products have no primary images, affecting image search ranking.</p>
                                </div>
                                <ChevronDown size={18} className={`${styles.chevron} ${expandedSection === 'images' ? styles.chevronActive : ''}`} />
                            </div>
                            {expandedSection === 'images' && (
                                <div className={styles.dropdownContent}>
                                    {stats?.seoIssues?.filter((p: any) => Number(p.missing_image) === 1).map((item: any) => (
                                        <div key={item.id} className={styles.issueRow}>
                                            <span>{item.name || `Product #${item.id}`}</span>
                                            <button className={styles.fixBtn} onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `/admin/products?edit=${item.id}`;
                                            }}>Fix Meta</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {seoIssuesData.missingDescription > 0 && (
                        <div
                            className={styles.actionItem}
                            style={{ background: '#fffbeb' }}
                            onClick={() => toggleSection('desc')}
                        >
                            <div className={styles.actionMain}>
                                <div className={styles.actionIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                                    <AlertTriangle size={18} />
                                </div>
                                <div className={styles.actionText}>
                                    <h4 style={{ color: '#92400e' }}>High: Meta Description Audit</h4>
                                    <p style={{ color: '#b45309' }}>Optimize {seoIssuesData.missingDescription} descriptions to improve CTR on Google Search.</p>
                                </div>
                                <ChevronDown size={18} className={`${styles.chevron} ${expandedSection === 'desc' ? styles.chevronActive : ''}`} />
                            </div>
                            {expandedSection === 'desc' && (
                                <div className={styles.dropdownContent}>
                                    {stats?.seoIssues?.filter((p: any) => Number(p.missing_desc) === 1).map((item: any) => (
                                        <div key={item.id} className={styles.issueRow}>
                                            <span>{item.name || `Product #${item.id}`}</span>
                                            <button className={styles.fixBtn} onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `/admin/products?edit=${item.id}`;
                                            }}>Review</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {seoIssuesData.missingBrand > 0 && (
                        <div className={styles.actionItem} style={{ background: '#f0fdf4' }}>
                            <div className={styles.actionMain}>
                                <div className={styles.actionIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
                                    <CheckCircle2 size={18} />
                                </div>
                                <div className={styles.actionText}>
                                    <h4 style={{ color: '#166534' }}>Brand Association Audit</h4>
                                    <p style={{ color: '#15803d' }}>{seoIssuesData.missingBrand} products are missing brand tags. Linking brands improves semantic search.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSEO;
