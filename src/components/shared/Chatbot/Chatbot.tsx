'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import styles from './Chatbot.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatbotProps {
    externalOpen?: boolean;
    setExternalOpen?: (open: boolean) => void;
}

const Chatbot = ({ externalOpen, setExternalOpen }: ChatbotProps) => {
    const locale = useLocale();
    const pathname = usePathname();
    const t = useTranslations('chatbot');
    const isArabic = locale === 'ar';

    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to the latest message
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Add welcome message when chat first opens
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMsg: Message = {
                id: 'welcome',
                role: 'assistant',
                content: t('welcomeMessage'),
            };
            setMessages([welcomeMsg]);
        }
    }, [isOpen, messages.length, t]);

    const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        setHasInteracted(true);
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: content.trim(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Build the API payload (exclude the welcome message from context)
            const apiMessages = updatedMessages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }));

            // Add page context so AI knows which page the user is on
            const pageContext = pathname ? `[User is currently viewing: ${pathname}]` : '';
            if (pageContext && apiMessages.length > 0) {
                apiMessages[apiMessages.length - 1].content = `${pageContext}\n\n${apiMessages[apiMessages.length - 1].content}`;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages, locale }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();

            const assistantMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: data.message || t('errorMessage'),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: t('errorMessage'),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleQuickAction = (question: string) => {
        sendMessage(question);
    };

    const quickActions = [
        { label: t('quickShipping'), question: t('quickShippingQ') },
        { label: t('quickProducts'), question: t('quickProductsQ') },
        { label: t('quickQuote'), question: t('quickQuoteQ') },
    ];

    // Format message text (basic markdown-like formatting)
    const formatMessage = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- /gm, '• ');
    };

    return (
        <>
            {/* Floating Action Button */}
            <AnimatePresence>
                {!isOpen && externalOpen === undefined && (
                    <motion.button
                        className={styles.chatFab}
                        onClick={() => {
                            setIsOpen(true);
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1.5 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Open chat"
                        id="chatbot-fab"
                    >
                        <Bot size={28} strokeWidth={2.2} />
                        {!hasInteracted && <span className={styles.fabDot} />}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.chatWindow}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        id="chatbot-window"
                    >
                        {/* Header */}
                        <div className={styles.chatHeader}>
                            <div className={styles.headerAvatar}>
                                <Bot size={22} />
                            </div>
                            <div className={styles.headerInfo}>
                                <h3 className={styles.headerTitle}>{t('title')}</h3>
                                <p className={styles.headerSubtitle}>
                                    <span className={styles.onlineDot} />
                                    {t('subtitle')}
                                </p>
                            </div>
                            <button
                                className={styles.chatCloseBtn}
                                onClick={() => setIsOpen(false)}
                                aria-label="Close chat"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className={styles.messagesArea}>
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className={styles.botAvatar}>
                                            <Bot />
                                        </div>
                                    )}
                                    <div
                                        className={`${styles.messageBubble} ${msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant}`}
                                        dangerouslySetInnerHTML={
                                            msg.role === 'assistant'
                                                ? { __html: formatMessage(msg.content) }
                                                : undefined
                                        }
                                    >
                                        {msg.role === 'user' ? msg.content : undefined}
                                    </div>
                                </div>
                            ))}

                            {/* Quick Actions (shown only before first user message) */}
                            {!hasInteracted && messages.length <= 1 && (
                                <div className={styles.quickActions}>
                                    {quickActions.map((action, i) => (
                                        <button
                                            key={i}
                                            className={styles.quickBtn}
                                            onClick={() => handleQuickAction(action.question)}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Typing Indicator */}
                            {isLoading && (
                                <div className={styles.typingIndicator}>
                                    <div className={styles.botAvatar}>
                                        <Bot />
                                    </div>
                                    <div className={styles.typingDots}>
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form className={styles.inputArea} onSubmit={handleSubmit}>
                            <input
                                ref={inputRef}
                                type="text"
                                className={styles.chatInput}
                                placeholder={t('placeholder')}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                                dir={isArabic ? 'rtl' : 'ltr'}
                            />
                            <button
                                type="submit"
                                className={styles.sendBtn}
                                disabled={!input.trim() || isLoading}
                                aria-label="Send message"
                            >
                                <Send size={18} style={isArabic ? { transform: 'scaleX(-1)' } : undefined} />
                            </button>
                        </form>

                        {/* WhatsApp CTA */}
                        <div className={styles.whatsappCta}>
                            <a
                                href="https://wa.me/97142882777"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.whatsappBtn}
                            >
                                <Phone size={15} />
                                {t('whatsappCta')}
                            </a>
                        </div>

                        {/* Powered By */}
                        <div className={styles.poweredBy}>
                            {t('poweredBy')}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
