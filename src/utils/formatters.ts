/**
 * Utility function to strip HTML tags from a string.
 * Useful for product names that might contain formatting tags in the database.
 * 
 * @param html The string potentially containing HTML tags
 * @returns A plain text string with all HTML tags removed
 */
export const stripHtml = (html: string | undefined | null): string => {
    if (!html) return '';

    // Use regex to remove tags
    // 1. Replace <br> and other line-breaking tags with spaces
    let text = html.replace(/<br\s*\/?>/gi, ' ');

    // 2. Wrap block elements with spaces to prevent word sticking
    text = text.replace(/<\/(div|p|h[1-6]|li|section|article)>/gi, ' ');

    // 3. Remove all other tags
    text = text.replace(/<[^>]*>?/gm, '');

    // 4. Decode common HTML entities (if any)
    const entities: { [key: string]: string } = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    };

    text = text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match] || match);

    // 5. Clean up multiple spaces
    return text.replace(/\s+/g, ' ').trim();
};
