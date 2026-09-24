'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, ChevronUp, Bot } from 'lucide-react';
import WhatsappIcon from '@/components/shared/icons/WhatsappIcon';
import styles from './FloatingActions.module.css';
import { useCart } from '@/context/CartContext';
import dynamic from 'next/dynamic';
const Chatbot = dynamic(() => import('../Chatbot/Chatbot'), { ssr: false });

const FloatingActions = () => {
    const pathname = usePathname();
    if (pathname && /^\/[^/]+\/admin(\/|$)/.test(pathname)) return null;

    const [isVisible, setIsVisible] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [message, setMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const { isDrawerOpen } = useCart();

    useEffect(() => {
        let ticking = false;

        const toggleVisibility = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (window.scrollY > 300) {
                        setIsVisible(true);
                    } else {
                        setIsVisible(false);
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const openWhatsAppModal = () => {
        setShowWhatsAppModal(true);
    };

    const closeWhatsAppModal = () => {
        setShowWhatsAppModal(false);
        setMessage('');
    };

    const sendWhatsAppMessage = () => {
        const phoneNumber = '97142882777'; // Updated business number
        const encodedMessage = encodeURIComponent(message || 'Hello, I would like to inquire about your products.');
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
        closeWhatsAppModal();
    };

    return (
        <>
            <div className={`${styles.floatingContainer} ${(isDrawerOpen || isChatOpen) ? styles.hidden : ''}`}>
                {/* 1. Back to Top (Top of stack) */}
                <button
                    className={`${styles.actionBtn} ${styles.backToTop} ${isVisible ? styles.visible : ''}`}
                    onClick={scrollToTop}
                    title="Back to Top"
                >
                    <ChevronUp size={24} strokeWidth={2.5} />
                </button>

                {/* 2. Chatbot Trigger (Middle) */}
                <div className={styles.botWrapper}>
                    <button
                        className={`${styles.actionBtn} ${styles.chatbotTrigger}`}
                        onClick={() => {
                            setIsChatOpen(true);
                        }}
                        title="Open Chat"
                    >
                        <Bot size={28} strokeWidth={2.2} />
                    </button>
                    {!hasInteracted && <span className={styles.fabDot} />}
                </div>

                {/* 3. WhatsApp (Bottom of stack) — hidden for now; re-enable when needed */}
                {false && (
                    <button
                        className={`${styles.actionBtn} ${styles.whatsapp} ${showWhatsAppModal ? styles.active : ''}`}
                        onClick={openWhatsAppModal}
                        title="WhatsApp Us"
                    >
                        {showWhatsAppModal ? (
                            <X size={28} />
                        ) : (
                            <WhatsappIcon size={30} />
                        )}
                    </button>
                )}
            </div>

            {/* Chatbot window handles its own open state via props */}
            <Chatbot externalOpen={isChatOpen} setExternalOpen={setIsChatOpen} />

            {/* WhatsApp Modal */}
            {showWhatsAppModal && (
                <div className={styles.modalOverlay} onClick={closeWhatsAppModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        {/* Gradient Header */}
                        <div className={styles.modalHeader}>
                            <div className={styles.gradientBg}></div>
                            <div className={styles.headerContent}>
                                <div className={styles.whatsappIconLarge}>
                                    {/* White came from the svg itself; it now inherits, so the
                                        container sets the colour. */}
                                    <WhatsappIcon size={28} />
                                </div>
                                <div className={styles.headerText}>
                                    <h3 className={styles.modalTitle}>Chat on WhatsApp</h3>
                                    <p className={styles.modalSubtitle}>Send us a message</p>
                                </div>
                                <button className={styles.closeBtn} onClick={closeWhatsAppModal}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Message Input */}
                        <div className={styles.modalBody}>
                            <div className={styles.replyInfo}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                                <span>We typically reply in 5 minutes</span>
                            </div>
                            <textarea
                                className={styles.textarea}
                                placeholder="Type your message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Footer with Action Buttons */}
                        <div className={styles.modalFooter}>
                            <div className={styles.buttonGroup}>
                                <button className={styles.cancelBtn} onClick={closeWhatsAppModal}>
                                    Cancel
                                </button>
                                <button className={styles.sendBtn} onClick={sendWhatsAppMessage}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingActions;
