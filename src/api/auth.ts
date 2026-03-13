import { API_BASE_URL } from '../config';

export const authApi = {
    async login(credentials: any) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            credentials: "include",
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.errors ? data.errors.map((e: any) => e.message).join(', ') : data.message;
            throw new Error(errorMsg || 'Login failed');
        }
        return data;
    },

    async googleLogin(token: string) {
        const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
            credentials: "include",
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Google login failed');
        }
        return data;
    },

    async register(userData: any) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            credentials: "include",
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.errors ? data.errors.map((e: any) => e.message).join(', ') : data.message;
            throw new Error(errorMsg || 'Registration failed');
        }
        return data;
    },

    async getMe() {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: "include"
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch user');
        return data;
    },

    async updateMe(token: string, userData: any) {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: "include",
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update profile');
        return data;
    }
};
