'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/api/auth';
import { API_BASE_URL } from '@/config';
import { useRouter } from '@/i18n/navigation';

interface AuthContextType {
    user: any;
    token: string | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    googleLogin: (token: string) => Promise<void>;
    register: (userData: any) => Promise<void>;
    logout: () => void;
    updateUser: (userData: any) => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
        }
        loadUser();
    }, []);

    const loadUser = async () => {
        const savedToken = localStorage.getItem('token');
        if (!savedToken) {
            setLoading(false);
            return;
        }

        try {
            const data = await authApi.getMe();
            setUser(data.data);
            setToken(savedToken);
        } catch (err: any) {
            console.error('Failed to load user', err);
            setError(err.message || 'Failed to load user');
            setToken(null);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: any) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.login(credentials);
            setToken(data.token);
            localStorage.setItem('token', data.token);
            setUser(data.user);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = async (token: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.googleLogin(token);
            setToken(data.token);
            localStorage.setItem('token', data.token);
            setUser(data.user);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData: any) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authApi.register(userData);
            setToken(data.token);
            localStorage.setItem('token', data.token);
            setUser(data.user);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (userData: any) => {
        try {
            const currentToken = localStorage.getItem('token') || '';
            const data = await authApi.updateMe(currentToken, userData);
            setUser(data.data);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, { credentials: "include" });
        } catch (e) { }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        router.push('/signin');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, googleLogin, register, logout, updateUser, error }}>
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
