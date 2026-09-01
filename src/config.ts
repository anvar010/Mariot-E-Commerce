export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export const BASE_URL = API_BASE_URL.replace(/\/api\/v1(\/)?$/, '').replace(/\/$/, '');

// Use BASE_URL for images as a default so local development works out-of-the-box
// But allow hardcoding for specific CDNs if needed
export const MEDIA_BASE_URL = BASE_URL || 'https://mariot-backend.onrender.com';

/**
 * Tabby is hidden until its keys are live again. Flip this to true to bring back the
 * payment option, the instalment promos on the product page and checkout, and the entry
 * on the payment-information page -- everything is gated on this one flag rather than
 * commented out, so restoring it can't half-happen.
 */
export const TABBY_ENABLED = false;
