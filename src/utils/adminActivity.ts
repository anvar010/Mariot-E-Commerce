import { API_BASE_URL } from '@/config';
import { getAuthHeaders } from '@/utils/authHeaders';

/**
 * Unread counts for the admin sidebar.
 *
 * Only sections that receive things on their own are tracked. Products, categories, brands and
 * the rest are edited by the staff themselves, so a badge there would be reporting someone's
 * own work back to them.
 *
 * The "last opened" marker lives in this browser rather than the database on purpose: one
 * admin reading the orders should not clear the badge for everyone else.
 */
export const TRACKED_SECTIONS = ['orders', 'users', 'quotations', 'staff_quotations', 'reviews', 'invoices'] as const;
export type TrackedSection = typeof TRACKED_SECTIONS[number];

const KEY = (section: string) => `mariot.admin.seen.${section}`;

export const readSeen = (section: string): string | null => {
    try {
        return localStorage.getItem(KEY(section));
    } catch {
        // Private windows throw on access rather than returning null.
        return null;
    }
};

export const markSeen = (section: string): void => {
    try {
        localStorage.setItem(KEY(section), new Date().toISOString());
    } catch {
        /* the badge simply will not clear; not worth failing over */
    }
};

/**
 * First run has no marker for a section. Treating that as "show me everything since the epoch"
 * would greet a new admin with a badge for all 54 historical orders, so the marker is set to
 * now and the section starts clean.
 */
export const ensureSeenInitialised = (): void => {
    for (const section of TRACKED_SECTIONS) {
        if (!readSeen(section)) markSeen(section);
    }
};

export const fetchActivityCounts = async (): Promise<Record<string, number>> => {
    const params = new URLSearchParams();
    for (const section of TRACKED_SECTIONS) {
        const seen = readSeen(section);
        if (seen) params.set(section, seen);
    }

    try {
        const res = await fetch(`${API_BASE_URL}/admin/activity?${params.toString()}`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        });
        if (!res.ok) return {};
        const data = await res.json();
        return data?.data?.counts || {};
    } catch {
        // A sidebar without badges is fine; a sidebar that errors is not.
        return {};
    }
};
