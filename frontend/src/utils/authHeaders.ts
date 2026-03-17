export const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};

    // Only access localStorage if we are in the browser
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};
