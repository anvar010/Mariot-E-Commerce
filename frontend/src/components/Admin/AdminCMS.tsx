'use client';

import React, { useState, useEffect } from 'react';
import styles from './AdminAnalytics.module.css'; // Reusing styles for consistency, or I'll create new ones
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/context/AuthContext';
import { Save, RefreshCw, Layout, Megaphone, Plus, Trash2, ChevronLeft, ChevronRight, ShoppingBag, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '@/context/NotificationContext';

const AdminCMS = () => {
    const { token } = useAuth();
    const [cmsData, setCmsData] = useState<any>({
        hero: [],
        posters: [],
        announcement: { text: '', text_ar: '', is_active: false }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const { showNotification } = useNotification();
    const [activeSlide, setActiveSlide] = useState(0);
    const [activePoster, setActivePoster] = useState(0);

    const defaultSlide = {
        tagline: "NEW ARRIVAL",
        title: "Professional Kitchen Solutions",
        description: "Experience excellence in every meal with Mariot.",
        image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1470&auto=format&fit=crop",
        accent: "#ff3b30",
        btnText: "Shop Now",
        link: "/shopnow"
    };

    const defaultPoster = {
        title: "New on MARIOT",
        badge: "!!! NEW ARRIVALS !!!",
        description: "Now Available on Mariot - Premium Equipment & Parts...",
        image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1470&auto=format&fit=crop",
        link: "/shopnow",
        button_text: "EXPLORE NOW",
        order_index: 0,
        is_active: true
    };

    const fetchCMSData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setError(null);
        try {
            console.log("Fetching CMS data...");
            // 1. Fetch data with separate try-catch for each part or check ok status
            const responses = await Promise.allSettled([
                fetch(`${API_BASE_URL}/admin/cms/hero-slides`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    credentials: "include"
                }),
                fetch(`${API_BASE_URL}/admin/cms/hero-posters`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    credentials: "include"
                }),
                fetch(`${API_BASE_URL}/cms/homepage`)
            ]);

            let slidesData: any = { success: false, data: [] };
            let postersData: any = { success: false, data: [] };
            let cmsDataFull: any = { success: false, data: {} };

            // Process slides - Use index based access safely
            if (responses[0].status === 'fulfilled' && (responses[0].value as Response).ok) {
                try { slidesData = await (responses[0].value as Response).json(); } catch (e) { console.error("Error parsing slides JSON", e); }
            }

            // Process posters
            if (responses[1].status === 'fulfilled' && (responses[1].value as Response).ok) {
                try { postersData = await (responses[1].value as Response).json(); } catch (e) { console.error("Error parsing posters JSON", e); }
            }

            // Process CMS full
            if (responses[2].status === 'fulfilled' && (responses[2].value as Response).ok) {
                try { cmsDataFull = await (responses[2].value as Response).json(); } catch (e) { console.error("Error parsing CMS JSON", e); }
            }

            const heroData = (slidesData && slidesData.success && Array.isArray(slidesData.data) && slidesData.data.length > 0)
                ? slidesData.data.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                : [defaultSlide];

            const posterData = (postersData && postersData.success && Array.isArray(postersData.data) && postersData.data.length > 0)
                ? postersData.data.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                : [defaultPoster];

            // Merge everything together
            const mergedData = {
                ...(cmsDataFull.data || {}),
                hero: heroData,
                posters: posterData
            };

            console.log("CMS Data merged successfully", mergedData);
            setCmsData(mergedData);

        } catch (error: any) {
            console.error('CRITICAL: Failed to fetch CMS data', error);
            setError(error.message || 'An unexpected error occurred while loading content.');
            // Fallback so it doesn't stay stuck
            setCmsData({
                hero: [defaultSlide],
                posters: [defaultPoster],
                announcement: { text: '', text_ar: '', is_active: false }
            });
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCMSData();
    }, []);

    const handleSaveSlide = async (index: number) => {
        setSaving(true);
        try {
            const slide = cmsData.hero[index];
            const isNew = !slide.id;
            const url = isNew
                ? `${API_BASE_URL}/admin/cms/hero-slides`
                : `${API_BASE_URL}/admin/cms/hero-slides/${slide.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(slide),
                credentials: "include"
            });

            const result = await res.json();
            if (result.success) {
                showNotification(`Slide ${index + 1} saved successfully!`, 'success');
                fetchCMSData(true); // Refresh to get IDs for new slides
            } else {
                showNotification('Error: ' + result.message, 'error');
            }
        } catch (error: any) {
            showNotification('Error: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAnnouncement = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/cms/homepage`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ section: 'announcement', data: cmsData.announcement }),
                credentials: "include"
            });
            const result = await res.json();
            if (result.success) {
                showNotification(`Announcement updated successfully!`, 'success');
            } else {
                showNotification('Error: ' + result.message, 'error');
            }
        } catch (error: any) {
            showNotification('Error: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteSlideFromDB = async (index: number) => {
        const slide = cmsData.hero[index];
        if (!slide.id) {
            const newHero = cmsData.hero.filter((_: any, i: number) => i !== index);
            setCmsData({ ...cmsData, hero: newHero });
            setActiveSlide(Math.max(0, index - 1));
            return;
        }

        if (!window.confirm("Delete this slide permanently?")) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/cms/hero-slides/${slide.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: "include"
            });
            const result = await res.json();
            if (result.success) {
                showNotification('Slide deleted!', 'success');
                fetchCMSData(true);
                setActiveSlide(Math.max(0, index - 1));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleSlideImageUpload = async (index: number, file: File) => {
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`${API_BASE_URL}/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success && result.data) {
                updateSlideField(index, 'image', result.data);
                showNotification('Slide image uploaded! Click Save to apply.', 'success');
            } else {
                showNotification('Error uploading image: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (err: any) {
            showNotification('Error uploading image: ' + err.message, 'error');
        }
    };

    const handlePosterImageUpload = async (index: number, file: File) => {
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`${API_BASE_URL}/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success && result.data) {
                updatePosterField(index, 'image', result.data);
                showNotification('Image uploaded! Click Save to apply.', 'success');
            } else {
                showNotification('Error uploading image: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (err: any) {
            showNotification('Error uploading image: ' + err.message, 'error');
        }
    };

    const handleSavePoster = async (index: number) => {
        setSaving(true);
        try {
            const poster = cmsData.posters[index];

            // Validate required fields
            if (!poster.title || !poster.title.trim()) {
                showNotification('Title is required.', 'error');
                setSaving(false);
                return;
            }
            if (!poster.image || !poster.image.trim()) {
                showNotification('Image URL is required.', 'error');
                setSaving(false);
                return;
            }

            const isNew = !poster.id;
            const url = isNew
                ? `${API_BASE_URL}/admin/cms/hero-posters`
                : `${API_BASE_URL}/admin/cms/hero-posters/${poster.id}`;
            const method = isNew ? 'POST' : 'PUT';

            // Send only the fields the backend expects — strip DB-generated fields
            const payload = {
                title: poster.title,
                title_ar: poster.title_ar || '',
                description: poster.description || '',
                description_ar: poster.description_ar || '',
                badge: poster.badge || '',
                badge_ar: poster.badge_ar || '',
                image: poster.image,
                link: poster.link || '/shopnow',
                button_text: poster.button_text || 'SHOP NOW',
                button_text_ar: poster.button_text_ar || '',
                order_index: poster.order_index || 0,
                is_active: poster.is_active ? 1 : 0
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            const result = await res.json();
            if (result.success) {
                showNotification(`Poster ${index + 1} saved successfully!`, 'success');
                fetchCMSData(true);
            } else {
                showNotification('Error: ' + (result.message || 'Save failed'), 'error');
            }
        } catch (error: any) {
            showNotification('Error: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const deletePosterFromDB = async (index: number) => {
        const poster = cmsData.posters[index];
        if (!poster.id) {
            const newPosters = cmsData.posters.filter((_: any, i: number) => i !== index);
            setCmsData({ ...cmsData, posters: newPosters });
            setActivePoster(Math.max(0, index - 1));
            return;
        }

        if (!window.confirm("Delete this poster permanently?")) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/cms/hero-posters/${poster.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: "include"
            });
            const result = await res.json();
            if (result.success) {
                showNotification('Poster deleted!', 'success');
                fetchCMSData(true);
                setActivePoster(Math.max(0, index - 1));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const addSlide = () => {
        const nextOrder = cmsData?.hero?.length || 0;
        const newHero = [...(cmsData?.hero || []), {
            ...defaultSlide,
            order_index: nextOrder,
            is_active: true
        }];
        setCmsData({ ...cmsData, hero: newHero });
        setActiveSlide(newHero.length - 1);
    };

    const removeSlide = (index: number) => {
        if (cmsData.hero.length <= 1) {
            showNotification("You must have at least one slide.", "error");
            return;
        }
        deleteSlideFromDB(index);
    };

    const updateSlideField = (index: number, field: string, value: any) => {
        const newHero = [...cmsData.hero];
        newHero[index][field] = value;
        setCmsData({ ...cmsData, hero: newHero });
    };

    const updatePosterField = (index: number, field: string, value: any) => {
        const newPosters = [...cmsData.posters];
        newPosters[index][field] = value;
        setCmsData({ ...cmsData, posters: newPosters });
    };

    const addPoster = () => {
        const nextOrder = cmsData?.posters?.length || 0;
        const newPosters = [...(cmsData?.posters || []), {
            ...defaultPoster,
            order_index: nextOrder,
            is_active: true
        }];
        setCmsData({ ...cmsData, posters: newPosters });
        setActivePoster(newPosters.length - 1);
    };

    if (error) return (
        <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ color: '#ff3b30', marginBottom: '15px' }}>
                    <Layout size={40} />
                </div>
                <h3 style={{ marginBottom: '10px' }}>Connection Error</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
                <button
                    onClick={() => fetchCMSData()}
                    style={{ background: '#4c6ef5', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                    Retry Loading
                </button>
            </div>
        </div>
    );

    if (loading || !cmsData) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
            <RefreshCw size={40} className="animate-spin" style={{ color: '#4c6ef5', marginBottom: '15px' }} />
            <p style={{ color: '#666', fontWeight: '500' }}>Loading CMS Configuration...</p>
        </div>
    </div>;

    const currentSlide = cmsData?.hero[activeSlide] || defaultSlide;

    return (
        <div className={styles.container} style={{ padding: '30px', width: '100%', maxWidth: 'none', margin: '0', background: '#f5f7fa', minHeight: '100vh' }}>

            {/* Header Card */}
            <div style={{
                padding: '24px 35px',
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                border: '1px solid #edf2f7',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1a202c' }}>Homepage CMS Manager</h1>
                    <p style={{ color: '#718096', margin: '4px 0 0 0', fontSize: '15px', fontWeight: '500' }}>Customize your website banners and announcements</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                        onClick={() => window.open('/', '_blank')}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '10px',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            color: '#4a5568',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '14px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                    >
                        Visit Site
                    </button>
                </div>
            </div>

            {/* Sticky Quick Jump Navigation */}
            <div style={{
                position: 'sticky',
                top: '20px',
                zIndex: 50,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '12px 20px',
                borderRadius: '14px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                gap: '15px',
                marginBottom: '30px',
                alignItems: 'center',
                overflowX: 'auto',
                scrollbarWidth: 'none'
            }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Jump:</span>

                <a href="#hero-slider-section" className={styles.jumpLink} style={{
                    textDecoration: 'none',
                    padding: '8px 18px',
                    background: '#f0f4ff',
                    color: '#4c6ef5',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 5px rgba(76, 110, 245, 0.1)',
                    border: '1px solid #e0e7ff'
                }}>
                    <Layout size={14} /> Hero Slider Configuration
                </a>

                <a href="#hero-posters-section" className={styles.jumpLink} style={{
                    textDecoration: 'none',
                    padding: '8px 18px',
                    background: '#fff5f5',
                    color: '#ff3b30',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 5px rgba(255, 59, 48, 0.08)',
                    border: '1px solid #fee2e2'
                }}>
                    <Megaphone size={14} /> Hero Posters Configuration
                </a>

                <a href="#announcement-bar-section" className={styles.jumpLink} style={{
                    textDecoration: 'none',
                    padding: '8px 18px',
                    background: '#fff9f4',
                    color: '#ff922b',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 5px rgba(255, 146, 43, 0.08)',
                    border: '1px solid #ffedd5'
                }}>
                    <Megaphone size={14} /> Global Announcement Bar
                </a>
            </div>

            <style jsx>{`
                .jumpLink:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(0,0,0,0.1) !important;
                    filter: brightness(0.98);
                }
                .jumpLink:active {
                    transform: translateY(0px);
                }
            `}</style>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', alignItems: 'start' }}>

                {/* Left side: Editors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Hero Slider Editor */}
                    <div id="hero-slider-section" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #eee', scrollMarginTop: '100px' }}>
                        <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Layout size={20} color="#4c6ef5" />
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Hero Slider Configuration</h2>
                            </div>
                            <button onClick={addSlide} style={{ background: '#4c6ef5', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                                <Plus size={16} /> Add New Slide
                            </button>
                        </div>

                        {/* Slide Navigation Tabs */}
                        <div style={{ display: 'flex', gap: '12px', padding: '15px 20px', background: '#fff', borderBottom: '1px solid #eee', overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
                            {cmsData?.hero?.map((slide: any, i: number) => {
                                const isActive = slide.is_active !== 0 && slide.is_active !== false;
                                return (
                                    <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <button
                                            onClick={() => setActiveSlide(i)}
                                            style={{
                                                padding: '12px 20px',
                                                borderRadius: '10px',
                                                border: '2px solid',
                                                borderColor: activeSlide === i ? '#4c6ef5' : '#eee',
                                                background: activeSlide === i ? '#f0f4ff' : '#fff',
                                                color: activeSlide === i ? '#4c6ef5' : '#333',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                gap: '4px',
                                                minWidth: '130px',
                                                boxShadow: activeSlide === i ? '0 4px 12px rgba(76, 110, 245, 0.15)' : 'none',
                                                opacity: isActive ? 1 : 0.7
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: isActive ? '#34c759' : '#ff4d4f',
                                                    boxShadow: isActive ? '0 0 6px #34c759' : 'none'
                                                }}></div>
                                                <span style={{ fontSize: '14px' }}>Slide {i + 1}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                <span style={{ fontSize: '10px', color: '#888', fontWeight: '500' }}>Order: {slide.order_index}</span>
                                                <span style={{
                                                    fontSize: '9px',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    background: isActive ? '#f6ffed' : '#fff1f0',
                                                    color: isActive ? '#34c759' : '#ff4d4f',
                                                    border: `1px solid ${isActive ? '#b7eb8f' : '#ffa39e'}`
                                                }}>
                                                    {isActive ? 'LIVE' : 'OFF'}
                                                </span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeSlide(i); }}
                                            title="Delete Slide"
                                            style={{
                                                position: 'absolute',
                                                right: '-8px',
                                                top: '-8px',
                                                background: '#ff4d4f',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '22px',
                                                height: '22px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                                zIndex: 5
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                onClick={addSlide}
                                style={{
                                    minWidth: '120px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '2px dashed #ddd',
                                    background: 'transparent',
                                    color: '#888',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'center',
                                    marginInlineStart: '10px'
                                }}
                            >
                                <Plus size={16} /> Add
                            </button>
                        </div>

                        <div style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>TAGLINE (SMALL TEXT)</span>
                                    <input
                                        type="text"
                                        placeholder="e.g., SPECIAL OFFER"
                                        value={currentSlide.tagline}
                                        onChange={(e) => updateSlideField(activeSlide, 'tagline', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>TAGLINE (ARABIC)</span>
                                    <input
                                        type="text"
                                        placeholder="مثال: عرض خاص"
                                        value={currentSlide.tagline_ar || ''}
                                        onChange={(e) => updateSlideField(activeSlide, 'tagline_ar', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', textAlign: 'right', direction: 'rtl' }}
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>MAIN TITLE</span>
                                    <input
                                        type="text"
                                        placeholder="e.g., Premium Cookware"
                                        value={currentSlide.title}
                                        onChange={(e) => updateSlideField(activeSlide, 'title', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', fontWeight: '500' }}
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>MAIN TITLE (ARABIC)</span>
                                    <input
                                        type="text"
                                        placeholder="مثال: أدوات طهي متميزة"
                                        value={currentSlide.title_ar || ''}
                                        onChange={(e) => updateSlideField(activeSlide, 'title_ar', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', fontWeight: '500', textAlign: 'right', direction: 'rtl' }}
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>DESCRIPTION</span>
                                    <textarea
                                        placeholder="Enter banner description here..."
                                        value={currentSlide.description}
                                        onChange={(e) => updateSlideField(activeSlide, 'description', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', minHeight: '100px', resize: 'vertical' }}
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>DESCRIPTION (ARABIC)</span>
                                    <textarea
                                        placeholder="أدخل وصف الشعار هنا..."
                                        value={currentSlide.description_ar || ''}
                                        onChange={(e) => updateSlideField(activeSlide, 'description_ar', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', minHeight: '100px', resize: 'vertical', textAlign: 'right', direction: 'rtl' }}
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>REDIRECT LINK</span>
                                    <input
                                        type="text"
                                        placeholder="/shopnow"
                                        value={currentSlide.link}
                                        onChange={(e) => updateSlideField(activeSlide, 'link', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                </label>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>BACKGROUND IMAGE</span>
                                    {/* Image preview */}
                                    {currentSlide.image && (
                                        <img
                                            src={currentSlide.image}
                                            alt="Slide preview"
                                            style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #eee' }}
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    )}
                                    {/* URL input */}
                                    <input
                                        type="text"
                                        placeholder="https://... or upload below"
                                        value={currentSlide.image}
                                        onChange={(e) => updateSlideField(activeSlide, 'image', e.target.value)}
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                    {/* File upload button */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <label style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '9px 16px', borderRadius: '8px',
                                            background: '#f0f4ff', border: '1px solid #c7d1f7',
                                            color: '#4c6ef5', fontWeight: '700', fontSize: '12px',
                                            cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}>
                                            📁 Upload Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleSlideImageUpload(activeSlide, file);
                                                }}
                                            />
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '11px', color: '#999' }}>or paste URL above</span>
                                            <span style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>Recommended size: 1920×800px</span>
                                        </div>
                                    </div>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>ACCENT COLOR</span>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <input
                                                type="color"
                                                value={currentSlide.accent}
                                                onChange={(e) => updateSlideField(activeSlide, 'accent', e.target.value)}
                                                style={{ width: '45px', height: '45px', padding: '0', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                                            />
                                            <input
                                                type="text"
                                                value={currentSlide.accent}
                                                onChange={(e) => updateSlideField(activeSlide, 'accent', e.target.value)}
                                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}
                                            />
                                        </div>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>BUTTON TEXT</span>
                                        <input
                                            type="text"
                                            value={currentSlide.btnText}
                                            onChange={(e) => updateSlideField(activeSlide, 'btnText', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>BUTTON TEXT (ARABIC)</span>
                                        <input
                                            type="text"
                                            placeholder="تسوق الآن"
                                            value={currentSlide.btnText_ar || ''}
                                            onChange={(e) => updateSlideField(activeSlide, 'btnText_ar', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', textAlign: 'right', direction: 'rtl' }}
                                        />
                                    </label>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>PRIORITY / ORDER</span>
                                        <input
                                            type="number"
                                            value={currentSlide.order_index}
                                            onChange={(e) => updateSlideField(activeSlide, 'order_index', parseInt(e.target.value))}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '25px', cursor: 'pointer', background: '#f8f9fa', padding: '10px', borderRadius: '10px' }}>
                                        <input
                                            type="checkbox"
                                            checked={currentSlide.is_active !== 0 && currentSlide.is_active !== false}
                                            onChange={(e) => updateSlideField(activeSlide, 'is_active', e.target.checked)}
                                            style={{ width: '20px', height: '20px', accentColor: '#34c759' }}
                                        />
                                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>Active on Site</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 25px', background: '#fbfbfb', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                            <button
                                disabled={saving}
                                onClick={() => handleSaveSlide(activeSlide)}
                                style={{ background: '#4c6ef5', color: '#fff', border: 'none', padding: '14px 40px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 15px rgba(76, 110, 245, 0.25)', transition: 'all 0.3s' }}
                            >
                                {saving ? <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={20} />}
                                {currentSlide.id ? 'Save Changes to Slide' : 'Confirm & Add Slide'}
                            </button>
                        </div>
                    </div>

                    {/* Hero Posters Editor */}
                    <div id="hero-posters-section" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #eee', scrollMarginTop: '100px' }}>
                        <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Megaphone size={20} color="#ff3b30" />
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Hero Posters Configuration</h2>
                            </div>
                            <button onClick={addPoster} style={{ background: '#ff3b30', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                                <Plus size={16} /> Add New Poster
                            </button>
                        </div>

                        {/* Poster Navigation Tabs */}
                        <div style={{ display: 'flex', gap: '12px', padding: '15px 20px', background: '#fff', borderBottom: '1px solid #eee', overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
                            {cmsData?.posters?.map((poster: any, i: number) => (
                                <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setActivePoster(i)}
                                        style={{
                                            padding: '12px 20px',
                                            borderRadius: '10px',
                                            border: '2px solid',
                                            borderColor: activePoster === i ? '#ff3b30' : '#eee',
                                            background: activePoster === i ? '#fff5f5' : '#fff',
                                            color: activePoster === i ? '#ff3b30' : '#333',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            minWidth: '130px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: poster.is_active ? '#34c759' : '#ccc' }}></div>
                                            <span>Poster {i + 1}</span>
                                        </div>
                                        <span style={{ fontSize: '10px', color: '#888' }}>Order: {poster.order_index}</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deletePosterFromDB(i); }}
                                        style={{ position: 'absolute', right: -8, top: -8, width: 20, height: 20, borderRadius: '50%', background: '#ff4d4f', color: '#fff', border: 'none', cursor: 'pointer', zIndex: 10 }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        {cmsData?.posters?.[activePoster] && (
                            <div style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>TITLE</span>
                                        <input
                                            type="text"
                                            value={cmsData.posters[activePoster].title}
                                            onChange={(e) => updatePosterField(activePoster, 'title', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>TITLE</span>
                                        <input
                                            type="text"
                                            value={cmsData.posters[activePoster].title}
                                            onChange={(e) => updatePosterField(activePoster, 'title', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>TITLE (ARABIC)</span>
                                        <input
                                            type="text"
                                            placeholder="العنوان بالعربية"
                                            value={cmsData.posters[activePoster].title_ar || ''}
                                            onChange={(e) => updatePosterField(activePoster, 'title_ar', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', textAlign: 'right', direction: 'rtl' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>BADGE TEXT</span>
                                        <input
                                            type="text"
                                            value={cmsData.posters[activePoster].badge}
                                            onChange={(e) => updatePosterField(activePoster, 'badge', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>BADGE TEXT (ARABIC)</span>
                                        <input
                                            type="text"
                                            placeholder="نص الشارة بالعربية"
                                            value={cmsData.posters[activePoster].badge_ar || ''}
                                            onChange={(e) => updatePosterField(activePoster, 'badge_ar', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', textAlign: 'right', direction: 'rtl' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>DESCRIPTION</span>
                                        <textarea
                                            value={cmsData.posters[activePoster].description}
                                            onChange={(e) => updatePosterField(activePoster, 'description', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '80px' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>DESCRIPTION (ARABIC)</span>
                                        <textarea
                                            placeholder="الوصف بالعربية"
                                            value={cmsData.posters[activePoster].description_ar || ''}
                                            onChange={(e) => updatePosterField(activePoster, 'description_ar', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '80px', textAlign: 'right', direction: 'rtl' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>LINK URL</span>
                                        <input
                                            type="text"
                                            value={cmsData.posters[activePoster].link}
                                            onChange={(e) => updatePosterField(activePoster, 'link', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                                        />
                                    </label>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>IMAGE</span>
                                        {/* Image preview */}
                                        {cmsData.posters[activePoster].image && (
                                            <img
                                                src={cmsData.posters[activePoster].image}
                                                alt="Poster preview"
                                                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #eee' }}
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        )}
                                        {/* URL input */}
                                        <input
                                            type="text"
                                            placeholder="https://... or upload below"
                                            value={cmsData.posters[activePoster].image}
                                            onChange={(e) => updatePosterField(activePoster, 'image', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '13px' }}
                                        />
                                        {/* File upload button */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <label style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '9px 16px', borderRadius: '8px',
                                                background: '#f0f4ff', border: '1px solid #c7d1f7',
                                                color: '#4c6ef5', fontWeight: '700', fontSize: '12px',
                                                cursor: 'pointer', whiteSpace: 'nowrap'
                                            }}>
                                                📁 Upload Image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handlePosterImageUpload(activePoster, file);
                                                    }}
                                                />
                                            </label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '11px', color: '#999' }}>or paste URL above</span>
                                                <span style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>Recommended size: 260×320px (or 520×640px)</span>
                                            </div>
                                        </div>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>BUTTON TEXT</span>
                                        <input
                                            type="text"
                                            value={cmsData.posters[activePoster].button_text}
                                            onChange={(e) => updatePosterField(activePoster, 'button_text', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>BUTTON TEXT (ARABIC)</span>
                                        <input
                                            type="text"
                                            placeholder="نص الزر بالعربية"
                                            value={cmsData.posters[activePoster].button_text_ar || ''}
                                            onChange={(e) => updatePosterField(activePoster, 'button_text_ar', e.target.value)}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd', textAlign: 'right', direction: 'rtl' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>ORDER / PRIORITY</span>
                                        <input
                                            type="number"
                                            value={cmsData.posters[activePoster].order_index}
                                            onChange={(e) => updatePosterField(activePoster, 'order_index', parseInt(e.target.value))}
                                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', background: '#f8f9fa', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!cmsData.posters[activePoster].is_active}
                                            onChange={(e) => updatePosterField(activePoster, 'is_active', e.target.checked)}
                                            style={{ width: '20px', height: '20px', accentColor: '#34c759' }}
                                        />
                                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>Active on site</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div style={{ padding: '20px 25px', background: '#fbfbfb', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => handleSavePoster(activePoster)}
                                disabled={saving}
                                style={{ background: '#ff3b30', color: '#fff', border: 'none', padding: '14px 40px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                {saving ? 'Saving...' : 'Save Poster Configuration'}
                            </button>
                        </div>
                    </div>

                    {/* Announcement Bar Editor */}
                    <div id="announcement-bar-section" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '25px', border: '1px solid #eee', scrollMarginTop: '100px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Megaphone size={20} color="#ff922b" />
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Global Announcement Header</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>PROMOTIONAL TEXT</span>
                                <textarea
                                    placeholder="Enter your top-bar announcement here..."
                                    value={cmsData?.announcement?.text}
                                    onChange={(e) => setCmsData({ ...cmsData, announcement: { ...cmsData.announcement, text: e.target.value } })}
                                    style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '15px', minHeight: '80px', lineHeight: '1.5' }}
                                />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#666', fontWeight: '700', letterSpacing: '0.5px' }}>PROMOTIONAL TEXT (ARABIC)</span>
                                <textarea
                                    placeholder="أدخل إعلان الشريط العلوي هنا..."
                                    value={cmsData?.announcement?.text_ar || ''}
                                    onChange={(e) => setCmsData({ ...cmsData, announcement: { ...cmsData.announcement, text_ar: e.target.value } })}
                                    style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '15px', minHeight: '80px', lineHeight: '1.5', textAlign: 'right', direction: 'rtl' }}
                                />
                            </label>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff9f4', padding: '15px', borderRadius: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={cmsData?.announcement?.is_active}
                                        onChange={(e) => setCmsData({ ...cmsData, announcement: { ...cmsData.announcement, is_active: e.target.checked } })}
                                        style={{ width: '22px', height: '22px', accentColor: '#ff922b' }}
                                    />
                                    <span style={{ fontWeight: '600', fontSize: '15px', color: '#854d0e' }}>Enable Announcement Bar</span>
                                </label>
                                <button
                                    disabled={saving}
                                    onClick={handleUpdateAnnouncement}
                                    style={{ background: '#ff922b', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 5px 15px rgba(255, 146, 43, 0.25)' }}
                                >
                                    {saving ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                                    Save Announcement
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Sticky System View Preview */}
                {false && (
                    <div style={{ position: 'sticky', top: '20px', zIndex: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    background: '#34c759',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    boxShadow: '0 4px 10px rgba(52, 199, 89, 0.3)'
                                }}>
                                    <Layout size={18} />
                                </div>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1a202c', margin: 0 }}>Visual Simulator</h2>
                            </div>
                            <div style={{
                                display: 'flex',
                                padding: '4px',
                                background: '#edf2f7',
                                borderRadius: '10px',
                                gap: '4px'
                            }}>
                                <div style={{ padding: '6px 12px', background: '#fff', borderRadius: '8px', fontSize: '11px', fontWeight: '800', color: '#4c6ef5', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Desktop</div>
                            </div>
                        </div>

                        <div style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                            border: '1px solid #edf2f7',
                            position: 'relative'
                        }}>
                            {/* Clean Preview Header */}
                            <div style={{ padding: '15px 25px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#1a202c', letterSpacing: '0.5px' }}>SITE PREVIEW</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34c759' }}></div>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#718096' }}>Live Update</span>
                                </div>
                            </div>

                            {/* Preview Screen Content */}
                            <div style={{
                                background: '#0a1628',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Header Mini Preview */}
                                {cmsData?.announcement?.is_active && (
                                    <div style={{
                                        background: '#0a1d37',
                                        color: '#fff',
                                        padding: '12px',
                                        fontSize: '14px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        letterSpacing: '0.8px',
                                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {cmsData?.announcement?.text}
                                    </div>
                                )}

                                {/* Hero Section Preview Area - Clean Panoramic Fit */}
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '1200 / 600',
                                    position: 'relative',
                                    background: '#0a1628',
                                    overflow: 'hidden',
                                    borderRadius: '4px',
                                    fontFamily: "'Inter', sans-serif"
                                }}>
                                    {/* Dynamic Background Image */}
                                    <motion.img
                                        key={activeSlide}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.6 }}
                                        transition={{ duration: 0.6 }}
                                        src={currentSlide.image}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', position: 'absolute', inset: 0 }}
                                    />

                                    {/* Subtle Dark "MEGA SALE" Watermark */}
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }}>
                                        <h1 style={{
                                            fontSize: '11vw',
                                            fontWeight: '950',
                                            color: 'rgba(255,255,255,0.03)',
                                            margin: 0,
                                            lineHeight: 0.8,
                                            letterSpacing: '-2px',
                                            textAlign: 'center',
                                            userSelect: 'none'
                                        }}>
                                            MEGA SALE
                                        </h1>
                                    </div>

                                    {/* Cinematic Gradient Overlay */}
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(90deg, rgba(10, 22, 40, 0.95) 0%, rgba(10, 22, 40, 0.4) 50%, transparent 100%)',
                                        zIndex: 2
                                    }}></div>

                                    {/* Main Content Layout Grid */}
                                    <div style={{
                                        position: 'relative',
                                        height: '100%',
                                        padding: '0 40px',
                                        display: 'grid',
                                        gridTemplateColumns: '1.4fr 1fr',
                                        alignItems: 'center',
                                        zIndex: 10
                                    }}>
                                        {/* Column 1: Text & Buttons */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{
                                                padding: '4px 10px',
                                                background: 'rgba(91, 179, 119, 0.1)',
                                                borderInlineStart: '3px solid #5bb377',
                                                width: 'fit-content'
                                            }}>
                                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#5bb377', letterSpacing: '2px', textTransform: 'uppercase' }}>
                                                    {currentSlide.tagline}
                                                </span>
                                            </div>

                                            <h1 style={{
                                                margin: 0,
                                                fontSize: '32px',
                                                fontWeight: '950',
                                                color: '#fff',
                                                lineHeight: 1,
                                                letterSpacing: '-0.5px'
                                            }}>
                                                {currentSlide.title}
                                            </h1>

                                            <p style={{
                                                margin: 0,
                                                fontSize: '11.5px',
                                                color: 'rgba(255,255,255,0.65)',
                                                lineHeight: 1.5,
                                                fontWeight: '400',
                                                maxWidth: '90%'
                                            }}>
                                                {currentSlide.description}
                                            </p>

                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <button style={{
                                                    background: '#ff3b30',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '10px 22px',
                                                    borderRadius: '50px',
                                                    fontWeight: '800',
                                                    fontSize: '11px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    <ShoppingBag size={16} /> {currentSlide.btnText}
                                                </button>
                                                <button style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: '#25D366',
                                                    border: '1px solid rgba(37, 211, 102, 0.3)',
                                                    padding: '10px 20px',
                                                    borderRadius: '50px',
                                                    fontWeight: '700',
                                                    fontSize: '11px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <MessageSquare size={18} /> WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Slides UI Elements */}
                                    <div style={{ position: 'absolute', bottom: '20px', insetInlineStart: '40px', display: 'flex', gap: '8px', zIndex: 20 }}>
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} style={{
                                                width: i === 0 ? '30px' : '10px',
                                                height: '4px',
                                                borderRadius: '2px',
                                                background: i === 0 ? '#5bb377' : 'rgba(255,255,255,0.2)',
                                                transition: 'all 0.4s'
                                            }}></div>
                                        ))}
                                    </div>

                                    <div style={{
                                        position: 'absolute',
                                        bottom: '20px',
                                        insetInlineEnd: '40px',
                                        background: 'rgba(255,255,255,0.06)',
                                        padding: '6px 16px',
                                        borderRadius: '6px',
                                        color: 'rgba(255,255,255,0.4)',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        zIndex: 20
                                    }}>
                                        Brand Partner
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AdminCMS;
