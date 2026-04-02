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
    if (!url || typeof url !== 'string') return '';

    // Normalize Windows-style backslashes to forward slashes
    let normalizedUrl = url.replace(/\\/g, '/');
    
    // Legacy database migration fix: intercept frontend /assets/brands/ and map to backend /uploads/brands/
    if (normalizedUrl.includes('/assets/brands/')) {
        normalizedUrl = normalizedUrl.replace(/\/assets\/brands\//g, '/uploads/brands/');
    }

    // Remove leading /public/ or public/ if it exists (some backend versions prepend it)
    normalizedUrl = normalizedUrl.replace(/^(\/)?public\//, '');

    // If it's already an absolute URL (http, https, data, or blob)
    if (
        normalizedUrl.startsWith('http') ||
        normalizedUrl.startsWith('data:') ||
        normalizedUrl.startsWith('blob:')
    ) {
        // Fix for old/local domains still in DB
        const backendDomains = [
            'localhost:5000',
            'mariot-backend.onrender.com',
            'mariot-api.onrender.com',
            'mariot-ae.onrender.com'
        ];

        for (const domain of backendDomains) {
            if (normalizedUrl.includes(domain)) {
                // Use regex with global flag to replace all occurrences
                const domainRegex = new RegExp(`https?://${domain}`, 'g');
                return normalizedUrl.replace(domainRegex, BASE_URL).replace(/ /g, '%20');
            }
        }
        
        // Final fallback for any onrender.com backend
        if (normalizedUrl.includes('.onrender.com') && !normalizedUrl.includes(BASE_URL.replace(/https?:\/\//, ''))) {
             return normalizedUrl.replace(/https?:\/\/[^/]+/g, BASE_URL).replace(/ /g, '%20');
        }

        return normalizedUrl.replace(/ /g, '%20');
    }

    // Handle internal project assets
    if (normalizedUrl.startsWith('/assets/') || normalizedUrl.startsWith('/images/')) {
        return normalizedUrl.replace(/ /g, '%20');
    }

    // Automatically prepend uploads/ if it's a relative path like brands/... or products/... 
    // that lacks the /uploads prefix
    if (!normalizedUrl.startsWith('/') && 
        (normalizedUrl.startsWith('brands/') || normalizedUrl.startsWith('products/') || normalizedUrl.includes('slides/'))) {
        normalizedUrl = `uploads/${normalizedUrl}`;
    }

    // Ensure leading slash for BASE_URL joining or relative paths
    if (!normalizedUrl.startsWith('/') && !normalizedUrl.startsWith('http')) {
        normalizedUrl = `/${normalizedUrl}`;
    }

    const finalUrl = `${BASE_URL || ''}${normalizedUrl}`;
    
    // Ensure spaces are safely URL encoded so Next.js Image loader doesn't crash in production
    return finalUrl.replace(/ /g, '%20');
};
