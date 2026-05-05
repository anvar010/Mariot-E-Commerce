'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/api/auth';
import { API_BASE_URL } from '@/config';
import { useRouter } from '@/i18n/navigation';

interface AuthContextType {
    user: any;
    isAuthenticated: boolean;
    loading: boolean;
    login: (credentials: any, redirectTo?: string) => Promise<void>;
    googleLogin: (token: string, redirectTo?: string) => Promise<void>;
    register: (userData: any, redirectTo?: string) => Promise<void>;
    logout: () => void;
    updateUser: (userData: any) => Promise<void>;
    refreshUser: () => Promise<void>;
    error: string | null;
    // Keep `token` as a derived boolean for backward compatibility
    // Components that check `if (token)` will still work
    token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // On mount: clean up legacy token from LocalStorage (cookie handles auth now),
    // check if we have saved user info for instant UI, then verify with server
    useEffect(() => {
        // One-time cleanup: remove old Bearer token from localStorage
        localStorage.removeItem('token');

        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                setUser(parsed);
                setIsAuthenticated(true);
            } catch {
                localStorage.removeItem('user');
            }
        }
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            // Cookie is sent automatically via credentials: "include" in authApi.getMe()
            const data = await authApi.getMe();
            setUser(data.data);
            setIsAuthenticated(true);
            // Update localStorage with latest user info for UI persistence
            localStorage.setItem('user', JSON.stringify(data.data));
        } catch (err: any) {
            console.error('Failed to load user', err);
            if (err.status === 401) {
                // Cookie is invalid or expired
                setUser(null);
                setIsAuthenticated(false);
                localStorage.removeItem('user');
            }
            // For network/CORS errors, keep whatever we had from localStorage
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: any, redirectTo?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.login(credentials);
            // Backend sets HTTP-Only cookie automatically
            setUser(data.user);
            setIsAuthenticated(true);
            // Store user info in localStorage for UI persistence (NOT the token)
            localStorage.setItem('user', JSON.stringify(data.user));
            router.push(redirectTo || '/');
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = async (googleToken: string, redirectTo?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.googleLogin(googleToken);
            // Backend sets HTTP-Only cookie automatically
            setUser(data.user);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.push(redirectTo || '/');
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData: any, redirectTo?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.register(userData);
            // Backend sets HTTP-Only cookie automatically
            setUser(data.user);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.push(redirectTo || '/');
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (userData: any) => {
        try {
            const data = await authApi.updateMe('', userData);
            setUser(data.data);
            localStorage.setItem('user', JSON.stringify(data.data));
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const refreshUser = async () => {
        try {
            const data = await authApi.getMe();
            setUser(data.data);
            localStorage.setItem('user', JSON.stringify(data.data));
        } catch (err) {
            console.error('Failed to refresh user', err);
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, { credentials: "include" });
        } catch (e) { }
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        router.push('/signin');
    };

    // Backward compatibility: `token` is kept as a derived value
    // so components checking `if (token)` still work correctly.
    const token = isAuthenticated ? 'cookie-auth' : null;

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, googleLogin, register, logout, updateUser, refreshUser, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
