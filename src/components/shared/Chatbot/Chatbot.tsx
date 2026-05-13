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

const STORAGE_KEY = 'mariot_chat_history_v1';
const STORAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_MAX_MESSAGES = 40;

function buildPageContext(pathname: string | null, locale: string): string {
    if (!pathname) return '';

    // Strip locale prefix
    const path = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/';

    // Pull richer context if the page published one (ProductDetail sets this)
    const pub = typeof window !== 'undefined' ? (window as any).__mariotChatContext : null;

    if (path.startsWith('/product/')) {
        if (pub?.type === 'product' && pub.name) {
            const cat = pub.category ? `, category: ${pub.category}` : '';
            const brand = pub.brand ? `, brand: ${pub.brand}` : '';
            const price = pub.price ? `, price: AED ${pub.price}` : '';
            return `[User is viewing product page — ${pub.name}${cat}${brand}${price}]`;
        }
        // Fallback: derive readable name from slug
        const slug = path.replace('/product/', '').split('/').pop() || '';
        const readable = decodeURIComponent(slug).replace(/[-_]/g, ' ').trim();
        return readable
            ? `[User is viewing product page: "${readable}"]`
            : `[User is viewing a product page]`;
    }

    if (path.startsWith('/shop')) {
        return `[User is browsing the shop page${path !== '/shop' ? ' (' + path + ')' : ''}]`;
    }
    if (path.startsWith('/category/') || path.startsWith('/categories/')) {
        const slug = path.split('/').pop() || '';
        const readable = decodeURIComponent(slug).replace(/[-_]/g, ' ').trim();
        return readable ? `[User is viewing category: "${readable}"]` : `[User is on a category page]`;
    }
    if (path.startsWith('/today-offers') || path.startsWith('/offers')) {
        return `[User is viewing today's offers]`;
    }
    if (path.startsWith('/cart')) return `[User is viewing their cart]`;
    if (path.startsWith('/checkout')) return `[User is at checkout]`;
    if (path === '/' || path === '') return `[User is on the homepage]`;

    return `[User is currently viewing: ${path}]`;
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
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // --- Conversation persistence: load on mount ---
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.messages) && typeof parsed.savedAt === 'number') {
                    const fresh = Date.now() - parsed.savedAt < STORAGE_MAX_AGE_MS;
                    if (fresh && parsed.messages.length > 0) {
                        setMessages(parsed.messages.filter((m: any) =>
                            m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')
                        ));
                        // Hide quick-action buttons once a real user message exists
                        if (parsed.messages.some((m: any) => m.role === 'user')) {
                            setHasInteracted(true);
                        }
                    } else {
                        localStorage.removeItem(STORAGE_KEY);
                    }
                }
            }
        } catch (err) {
            console.warn('[Chat] Failed to restore history', err);
        } finally {
            setHydrated(true);
        }
    }, []);

    // Welcome message on first open (only if no restored history)
    useEffect(() => {
        if (!hydrated) return;
        if (isOpen && messages.length === 0) {
            setMessages([{ id: 'welcome', role: 'assistant', content: t('welcomeMessage') }]);
        }
    }, [isOpen, messages.length, t, hydrated]);

    // --- Conversation persistence: save on change ---
    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return;
        try {
            // Skip persisting if only the welcome message is present
            const meaningful = messages.filter(m => m.id !== 'welcome');
            if (meaningful.length === 0) {
                localStorage.removeItem(STORAGE_KEY);
                return;
            }
            const trimmed = messages.slice(-STORAGE_MAX_MESSAGES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                savedAt: Date.now(),
                messages: trimmed,
            }));
        } catch (err) {
            // Quota / private mode — fail silently
        }
    }, [messages, hydrated]);

    const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading || isStreaming) return;

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

        const assistantId = generateId();

        try {
            const apiMessages = updatedMessages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }));

            // Richer page context (product name/category, etc.)
            const pageContext = buildPageContext(pathname, locale);
            if (pageContext && apiMessages.length > 0) {
                apiMessages[apiMessages.length - 1].content =
                    `${pageContext}\n\n${apiMessages[apiMessages.length - 1].content}`;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages, locale, stream: true }),
            });

            if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                console.error('[Chat] API error', response.status, errBody);
                throw new Error(`API ${response.status}: ${errBody}`);
            }

            // Streaming path: read body chunks and update the assistant message incrementally
            if (response.body && response.headers.get('content-type')?.includes('text/plain')) {
                setIsLoading(false);
                setIsStreaming(true);
                setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulated = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    accumulated += chunk;
                    setMessages(prev =>
                        prev.map(m => (m.id === assistantId ? { ...m, content: accumulated } : m))
                    );
                }

                if (!accumulated.trim()) {
                    setMessages(prev =>
                        prev.map(m => (m.id === assistantId ? { ...m, content: t('errorMessage') } : m))
                    );
                }
            } else {
                // JSON fallback
                const data = await response.json();
                const text = data.message || t('errorMessage');
                setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: text }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => {
                const hasPlaceholder = prev.some(m => m.id === assistantId);
                if (hasPlaceholder) {
                    return prev.map(m =>
                        m.id === assistantId ? { ...m, content: t('errorMessage') } : m
                    );
                }
                return [...prev, { id: assistantId, role: 'assistant', content: t('errorMessage') }];
            });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
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

    const formatMessage = (text: string) => {
        return text
            .replaceAll(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replaceAll(/\*(.*?)\*/g, '<em>$1</em>')
            .replaceAll(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #25d366; text-decoration: underline; font-weight: 600;">$1</a>')
            .replaceAll(/^- /gm, '• ')
            .replaceAll(/\n/g, '<br>');
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

                            {/* Typing Indicator (only before first stream chunk arrives) */}
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
                                disabled={isLoading || isStreaming}
                                dir={isArabic ? 'rtl' : 'ltr'}
                            />
                            <button
                                type="submit"
                                className={styles.sendBtn}
                                disabled={!input.trim() || isLoading || isStreaming}
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
