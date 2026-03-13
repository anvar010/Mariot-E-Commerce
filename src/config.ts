const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = `${BASE_URL}/api/v1`;
