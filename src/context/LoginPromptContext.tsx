'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import LoginPromptModal from '@/components/shared/LoginPromptModal/LoginPromptModal';

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
            <LoginPromptModal
                open={open}
                onClose={hideLoginPrompt}
                title={options.title}
                subtitle={options.subtitle}
            />
        </LoginPromptContext.Provider>
    );
};

export const useLoginPrompt = () => {
    const ctx = useContext(LoginPromptContext);
    if (!ctx) throw new Error('useLoginPrompt must be used within a LoginPromptProvider');
    return ctx;
};
