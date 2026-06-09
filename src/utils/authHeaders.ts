/**
 * Auth Headers Utility
 * 
 * Authentication is now handled via HTTP-Only cookies (sent automatically
 * with `credentials: "include"` on fetch calls). This utility returns
 * standard headers without a Bearer token.
 * 
 * The cookie is set by the backend on login/register and is automatically
 * included in all cross-origin requests via `credentials: "include"`.
 */
export const getAuthHeaders = (): HeadersInit => {
    // No Bearer token needed — auth is handled by HTTP-Only cookies.
    // We do attach the UI language so the backend can localize emails
    // (the NEXT_LOCALE cookie lives on the frontend domain and isn't sent
    // cross-origin to the API, so pass it explicitly as a header).
    return { 'x-locale': getCurrentLocale() };
};

// Read the active locale from the NEXT_LOCALE cookie (set by the language
// switcher / next-intl). Falls back to 'en'.
export const getCurrentLocale = (): string => {
    if (typeof document === 'undefined') return 'en';
    const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(en|ar)/);
    return m ? m[1] : 'en';
};
