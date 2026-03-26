/** Triggering fresh production build with synced database data (Aiven) */
const getBaseUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    // Clean up: remove /api/v1 suffix and trailing slash
    return apiUrl.replace(/\/api\/v1(\/)?$/, '').replace(/\/$/, '');
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || `${BASE_URL}/api/v1`;
