import { BASE_URL } from '../config';

/**
 * Resolves a URL by replacing localhost:5000 with the production BASE_URL.
 * This is necessary because some backend responses might still contain 
 * absolute localhost links.
 */
export const resolveUrl = (url?: string) => {
    if (!url) return '';
    
    // If the URL contains localhost:5000, replace it with the environment's BASE_URL
    if (url.includes('localhost:5000')) {
        return url.replace('http://localhost:5000', BASE_URL);
    }
    
    // Handle relative paths by prepending BASE_URL if they don't start with http or data:
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) {
        return url;
    }
    
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};
