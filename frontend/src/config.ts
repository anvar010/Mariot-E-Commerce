export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export const BASE_URL = API_BASE_URL.replace(/\/api\/v1(\/)?$/, '').replace(/\/$/, '');

// For images, we must use the absolute backend URL so next/image can optimize them via remotePatterns
export const MEDIA_BASE_URL = 'https://mariot-backend.onrender.com';
