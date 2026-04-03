'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronUp, Bot } from 'lucide-react';
import styles from './FloatingActions.module.css';
import { useCart } from '@/context/CartContext';
import Chatbot from '../Chatbot/Chatbot';

const FloatingActions = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [message, setMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [hasInteractedWithChat, setHasInteractedWithChat] = useState(false);
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
                <button
                    className={`${styles.actionBtn} ${styles.chatbotTrigger}`}
                    onClick={() => {
                        setIsChatOpen(true);
                        setHasInteractedWithChat(true);
                    }}
                    title="Open Chat"
                >
                    <Bot size={28} strokeWidth={2.2} />
                    {!hasInteractedWithChat && <span className={styles.fabDot} />}
                </button>

                {/* 3. WhatsApp (Bottom of stack) */}
                <button
                    className={`${styles.actionBtn} ${styles.whatsapp} ${showWhatsAppModal ? styles.active : ''}`}
                    onClick={openWhatsAppModal}
                    title="WhatsApp Us"
                >
                    {showWhatsAppModal ? (
                        <X size={28} />
                    ) : (
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
                            <path d="M12.03 2c-5.52 0-10 4.48-10 10a9.96 9.96 0 0 0 1.53 5.39L2.03 22l4.75-1.25c1.54.85 3.32 1.33 5.25 1.33 5.52 0 10-4.48 10-10S17.55 2 12.03 2zm6.3 14.54c-.27.76-1.55 1.48-2.14 1.57-.59.09-1.34.22-3.83-.82-2.92-1.21-4.74-4.22-4.88-4.42-.15-.2-1.18-1.56-1.18-2.98 0-1.42.74-2.12 1.01-2.4.27-.28.59-.35.79-.35.19 0 .38.01.54.02.17.01.4-.04.62.5.24.59.81 1.99.88 2.14.07.15.11.32.01.52-.09.20-.14.33-.28.5-.14.17-.3.38-.43.51-.15.15-.3.32-.13.62.17.3.74 1.23 1.59 1.99.85.76 1.56 1 1.86 1.15.3.15.47.13.65-.08.18-.21.76-.89.96-1.2.2-.31.4-.26.68-.15.28.11 1.77.84 2.08.99.31.15.51.22.59.35.08.13.08.73-.19 1.48z" />
                        </svg>
                    )}
                </button>
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
                                    <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                                        <path d="M12.03 2c-5.52 0-10 4.48-10 10a9.96 9.96 0 0 0 1.53 5.39L2.03 22l4.75-1.25c1.54.85 3.32 1.33 5.25 1.33 5.52 0 10-4.48 10-10S17.55 2 12.03 2zm6.3 14.54c-.27.76-1.55 1.48-2.14 1.57-.59.09-1.34.22-3.83-.82-2.92-1.21-4.74-4.22-4.88-4.42-.15-.2-1.18-1.56-1.18-2.98 0-1.42.74-2.12 1.01-2.4.27-.28.59-.35.79-.35.19 0 .38.01.54.02.17.01.4-.04.62.5.24.59.81 1.99.88 2.14.07.15.11.32.01.52-.09.20-.14.33-.28.5-.14.17-.3.38-.43.51-.15.15-.3.32-.13.62.17.3.74 1.23 1.59 1.99.85.76 1.56 1 1.86 1.15.3.15.47.13.65-.08.18-.21.76-.89.96-1.2.2-.31.4-.26.68-.15.28.11 1.77.84 2.08.99.31.15.51.22.59.35.08.13.08.73-.19 1.48z" />
                                    </svg>
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
