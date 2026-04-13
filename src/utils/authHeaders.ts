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
    // This function is kept for backward compatibility with existing code
    // that spreads ...getAuthHeaders() into their fetch headers.
    return {};
};
