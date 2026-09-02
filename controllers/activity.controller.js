const db = require('../config/db');

/**
 * Unread counts for the admin sidebar.
 *
 * Only sections that receive things on their own are counted. Products, categories, brands,
 * coupons, CMS and settings are changed by the staff themselves, so a badge there would be
 * telling someone about their own edit -- noise that trains people to ignore the badges that
 * do matter.
 *
 * "New" is per section and per person: the client sends when it last opened each one and gets
 * back what has arrived since. Keeping the marker on the client means one admin reading their
 * orders does not clear the badge for everyone else.
 */
const SECTIONS = {
    orders: 'orders',
    users: 'users',
    quotations: 'quotations',
    staff_quotations: 'staff_quotations',
    reviews: 'reviews',
    invoices: 'invoices',
};

// A malformed or missing timestamp must not be read as "the beginning of time", which would
// badge the entire history the first time anyone loads the page.
const parseSince = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

exports.getActivityCounts = async (req, res, next) => {
    try {
        const counts = {};
        const latest = {};

        await Promise.all(Object.entries(SECTIONS).map(async ([section, table]) => {
            const since = parseSince(req.query[section]);
            try {
                if (since) {
                    const [[row]] = await db.execute(
                        `SELECT COUNT(*) AS n FROM \`${table}\` WHERE created_at > ?`,
                        [since]
                    );
                    counts[section] = Number(row.n) || 0;
                } else {
                    counts[section] = 0;
                }
                const [[last]] = await db.execute(`SELECT MAX(created_at) AS latest FROM \`${table}\``);
                latest[section] = last.latest || null;
            } catch (err) {
                // A missing table must not take the whole sidebar down with it.
                console.warn(`[activity] ${section} unavailable:`, err.message);
                counts[section] = 0;
                latest[section] = null;
            }
        }));

        res.json({ success: true, data: { counts, latest } });
    } catch (error) {
        next(error);
    }
};
