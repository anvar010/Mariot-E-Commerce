import { BASE_URL } from '@/config';

/**
 * Resolves a URL to be absolute and points to the correct backend/assets location.
 * Handles:
 * - External absolute URLs (http://, https://, data:)
 * - Static frontend assets (/assets/, /images/)
 * - Backend uploads (/uploads/...)
 * - Localhost cleanup
 */
export const resolveUrl = (url?: string): string => {
    if (!url) return '';

    // 1. Return already absolute or data URLs as-is
    if (url.startsWith('http') || url.startsWith('data:')) {
        // Optional: Replace localhost with standard BASE_URL if needed
        if (url.includes('localhost:5000')) {
            return url.replace('http://localhost:5000', BASE_URL);
        }
        return url;
    }

    // 2. Static frontend assets served by Next.js from public/
    if (url.startsWith('/assets/') || url.startsWith('/images/')) {
        return url;
    }

    // 3. Backend uploads or relative paths
    // Prepend BASE_URL and ensure proper slashes
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${BASE_URL}${cleanPath}`;
};
