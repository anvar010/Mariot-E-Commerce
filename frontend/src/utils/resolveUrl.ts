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

    // Normalize Windows-style backslashes to forward slashes
    let normalizedUrl = url.replace(/\\/g, '/');

    // Remove leading /public/ or public/ if it exists (some backend versions prepend it)
    normalizedUrl = normalizedUrl.replace(/^(\/)?public\//, '');

    // If it's already an absolute URL (http, https, data, or blob)
    if (
        normalizedUrl.startsWith('http') ||
        normalizedUrl.startsWith('data:') ||
        normalizedUrl.startsWith('blob:')
    ) {
        // Fix for old/local domains still in DB
        if (normalizedUrl.includes('localhost:5000')) {
            return normalizedUrl.replace(/http:\/\/localhost:5000/g, BASE_URL);
        }
        if (normalizedUrl.includes('mariot-backend.onrender.com')) {
            return normalizedUrl.replace(/https:\/\/mariot-backend.onrender.com/g, BASE_URL);
        }
        if (normalizedUrl.includes('mariot-api.onrender.com')) {
            return normalizedUrl.replace(/https:\/\/mariot-api.onrender.com/g, BASE_URL);
        }
        return normalizedUrl;
    }

    // Handle internal project assets
    if (normalizedUrl.startsWith('/assets/') || normalizedUrl.startsWith('/images/')) {
        return normalizedUrl;
    }

    // Default: Prepend BASE_URL
    const separator = normalizedUrl.startsWith('/') ? '' : '/';
    return `${BASE_URL}${separator}${normalizedUrl}`;
};
