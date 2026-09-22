'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Open/closed state for the admin sidebar on small screens.
 *
 * The header owns the hamburger and the sidebar owns the drawer, and neither is the other's
 * parent -- both are siblings under AdminLayout. A context keeps the state in the one place
 * that contains them both, rather than threading props through the layout.
 *
 * On desktop the sidebar is permanently visible and none of this applies: the drawer styles
 * live behind a max-width media query, so `isOpen` simply has no effect there.
 */
interface AdminNavValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const AdminNavContext = createContext<AdminNavValue>({
    isOpen: false,
    open: () => { },
    close: () => { },
    toggle: () => { },
});

export const useAdminNav = () => useContext(AdminNavContext);

export const AdminNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(v => !v), []);

    // Navigating is the whole point of opening the drawer, so it closes itself once a
    // destination is chosen -- otherwise it stays over the page the admin just asked for.
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Escape closes it, as with any other overlay.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen]);

    /**
     * Hold the page still while the drawer is over it.
     *
     * Without this the body scrolls under the drawer on iOS, which reads as the drawer
     * itself sliding away. The previous overflow is restored rather than assumed to be
     * empty, so this cannot fight another component that also locks scrolling.
     */
    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [isOpen]);

    return (
        <AdminNavContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
        </AdminNavContext.Provider>
    );
};
