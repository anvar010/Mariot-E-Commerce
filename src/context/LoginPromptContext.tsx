'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import dynamic from 'next/dynamic';

/**
 * Loaded on demand, and this matters more than it looks.
 *
 * This provider wraps the whole app, so a static import here put the modal -- and
 * framer-motion, its largest dependency -- into the bundle of every single page,
 * including product pages, where it is the heaviest thing present and is almost never
 * shown. Deferring it takes that weight off the initial load of every route.
 *
 * ssr: false because the modal is never part of the first paint: it appears in response
 * to something the visitor does.
 */
const LoginPromptModal = dynamic(
    () => import('@/components/shared/LoginPromptModal/LoginPromptModal'),
    { ssr: false },
);

interface PromptOptions {
    title?: string;
    subtitle?: string;
}

interface LoginPromptContextType {
    showLoginPrompt: (options?: PromptOptions) => void;
    hideLoginPrompt: () => void;
}

const LoginPromptContext = createContext<LoginPromptContextType | undefined>(undefined);

export const LoginPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<PromptOptions>({});

    const showLoginPrompt = useCallback((opts?: PromptOptions) => {
        setOptions(opts || {});
        setOpen(true);
    }, []);

    const hideLoginPrompt = useCallback(() => setOpen(false), []);

    return (
        <LoginPromptContext.Provider value={{ showLoginPrompt, hideLoginPrompt }}>
            {children}
            {/* Mounted only once actually asked for. Rendering it unconditionally with
                open={false} would fetch its chunk on every page load, which is exactly
                the cost the dynamic import above is avoiding. The modal resets its own
                fields when closed, and unmounting does the same thing. */}
            {open && (
                <LoginPromptModal
                    open={open}
                    onClose={hideLoginPrompt}
                    title={options.title}
                    subtitle={options.subtitle}
                />
            )}
        </LoginPromptContext.Provider>
    );
};

export const useLoginPrompt = () => {
    const ctx = useContext(LoginPromptContext);
    if (!ctx) throw new Error('useLoginPrompt must be used within a LoginPromptProvider');
    return ctx;
};
