/** Triggering fresh production build with synced database data (Aiven) */
const getBaseUrl = () => {
    // Use environment variable if set (for production/Vercel)
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '');
    }
    // Fallback: local development
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || `${BASE_URL}/api/v1`;
