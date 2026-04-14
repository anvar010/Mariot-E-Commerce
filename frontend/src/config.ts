export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export const BASE_URL = API_BASE_URL.replace(/\/api\/v1(\/)?$/, '').replace(/\/$/, '');
