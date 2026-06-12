/**
 * Monthly Reward-Points E-Statement Service
 *
 * On the 1st of each month, emails every user a statement of the PREVIOUS
 * calendar month's points activity (earned / pending / redeemed / expiring)
 * plus their current balance.
 *
 * Data sources (reward_points_history.transaction_type ENUM: earned|redeemed|expired):
 *   - Earned    = SUM(earned)   in the statement month
 *   - Redeemed  = SUM(redeemed) in the statement month
 *   - Pending   = SUM(earned) in the month tied to orders not yet delivered
 *                 (order status pending|processing|shipped) — points awaiting fulfilment
 *   - Expiring  = points whose 12-month lifetime ends next month. Disabled unless
 *                 POINTS_EXPIRY_MONTHS is set (>0); otherwise reported as 0.
 *   - Balance   = users.reward_points (live balance)
 *
 * Sends are de-duplicated via points_statement_log (one row per user per period).
 */

const db = require('../config/db');
const { sendMonthlyStatementEmail } = require('../utils/sendEmail');

// Points expire this many months after being earned. 0/unset = no expiry → the
// "Expiring Next Month" figure is always 0. Set via env to enable the policy.
const POINTS_EXPIRY_MONTHS = Number(process.env.POINTS_EXPIRY_MONTHS) || 0;

const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const ensureTable = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS points_statement_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            period CHAR(7) NOT NULL,           -- 'YYYY-MM' of the statement month
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_period (user_id, period)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
};

// All scheduling and month boundaries are anchored to UAE local time so the
// statement always reflects a clean UAE calendar month and fires at 10:00 Dubai.
// (UAE is a fixed UTC+4 with no DST, so this is unambiguous.)
const UAE_TZ = 'Asia/Dubai';
const pad2 = (n) => String(n).padStart(2, '0');

// Current UAE wall-clock parts: { year, month (1-based), day, hour (0-23) }.
const uaeNow = (ref = new Date()) => {
    const p = new Intl.DateTimeFormat('en-CA', {
        timeZone: UAE_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(ref).reduce((a, x) => (a[x.type] = x.value, a), {});
    return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour };
};

// Returns { startSql, endSql, period, monthIndex, year } for the UAE calendar
// month immediately before `ref`. startSql/endSql are naive 'YYYY-MM-DD HH:MM:SS'
// strings in UAE wall-clock; end is exclusive (= first of the current month).
const previousMonthRange = (ref = new Date()) => {
    const { year, month } = uaeNow(ref);     // current UAE year & 1-based month
    let py = year, pm = month - 1;           // previous month (1-based)
    if (pm === 0) { pm = 12; py = year - 1; }
    const period = `${py}-${pad2(pm)}`;
    const startSql = `${py}-${pad2(pm)}-01 00:00:00`;
    const endSql = `${year}-${pad2(month)}-01 00:00:00`;
    return { startSql, endSql, period, monthIndex: pm - 1, year: py };
};

/**
 * Build the per-user stats for the given statement month.
 * Returns a Map keyed by user_id.
 */
const computeStats = async (range) => {
    const { startSql, endSql } = range;

    // Earned & redeemed in the month, per user.
    const [agg] = await db.query(`
        SELECT user_id,
               COALESCE(SUM(CASE WHEN transaction_type = 'earned'   THEN points ELSE 0 END), 0) AS earned,
               COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN points ELSE 0 END), 0) AS redeemed
        FROM reward_points_history
        WHERE created_at >= ? AND created_at < ?
        GROUP BY user_id
    `, [startSql, endSql]);

    // Pending = earned points in the month whose order is not yet delivered.
    const [pendingRows] = await db.query(`
        SELECT rph.user_id,
               COALESCE(SUM(rph.points), 0) AS pending
        FROM reward_points_history rph
        JOIN orders o ON o.id = rph.order_id
        WHERE rph.transaction_type = 'earned'
          AND rph.created_at >= ? AND rph.created_at < ?
          AND o.status IN ('pending', 'processing', 'shipped')
        GROUP BY rph.user_id
    `, [startSql, endSql]);

    // Expiring next month (only if an expiry policy is configured).
    let expiringRows = [];
    if (POINTS_EXPIRY_MONTHS > 0) {
        // Points earned in the lifetime-window that lands in NEXT month.
        // Window: earned between (now - EXPIRY months) and (now - EXPIRY + 1 month).
        const [rows] = await db.query(`
            SELECT user_id, COALESCE(SUM(points), 0) AS expiring
            FROM reward_points_history
            WHERE transaction_type = 'earned'
              AND created_at >= DATE_SUB(?, INTERVAL ? MONTH)
              AND created_at <  DATE_SUB(?, INTERVAL ? MONTH)
            GROUP BY user_id
        `, [endSql, POINTS_EXPIRY_MONTHS, endSql, POINTS_EXPIRY_MONTHS - 1]);
        expiringRows = rows;
    }

    const stats = new Map();
    const ensure = (id) => {
        if (!stats.has(id)) stats.set(id, { earned: 0, redeemed: 0, pending: 0, expiringNextMonth: 0 });
        return stats.get(id);
    };
    for (const r of agg) { const s = ensure(r.user_id); s.earned = Number(r.earned); s.redeemed = Number(r.redeemed); }
    for (const r of pendingRows) { ensure(r.user_id).pending = Number(r.pending); }
    for (const r of expiringRows) { ensure(r.user_id).expiringNextMonth = Number(r.expiring); }
    return stats;
};

/**
 * Process and send statements for the previous month. Idempotent: users who
 * already received this period's statement are skipped.
 */
const processMonthlyStatements = async (ref = new Date()) => {
    try {
        await ensureTable();
        const range = previousMonthRange(ref);
        const monthLabel = `${EN_MONTHS[range.monthIndex]} ${range.year}`;
        const monthLabelAr = `${AR_MONTHS[range.monthIndex]} ${range.year}`;

        console.log(`[POINTS STATEMENT] 📊 Building statements for ${range.period}...`);

        const statsMap = await computeStats(range);

        // Every user with an email gets a statement (balance is always meaningful,
        // even if the month had no activity — matches the screenshot's 0.00 rows).
        const [users] = await db.query(`
            SELECT u.id, u.name, u.email, u.reward_points, u.preferred_locale
            FROM users u
            WHERE u.email IS NOT NULL AND u.email != ''
              AND u.id NOT IN (SELECT user_id FROM points_statement_log WHERE period = ?)
        `, [range.period]);

        let sent = 0;
        for (const u of users) {
            try {
                const s = statsMap.get(u.id) || { earned: 0, redeemed: 0, pending: 0, expiringNextMonth: 0 };
                await sendMonthlyStatementEmail(
                    u.email,
                    u.name || '',
                    {
                        earned: s.earned,
                        pending: s.pending,
                        redeemed: s.redeemed,
                        expiringNextMonth: s.expiringNextMonth,
                        balance: Number(u.reward_points) || 0,
                        monthLabel,
                        monthLabelAr,
                    },
                    u.preferred_locale || 'en'
                );
                await db.query(
                    `INSERT IGNORE INTO points_statement_log (user_id, period) VALUES (?, ?)`,
                    [u.id, range.period]
                );
                sent++;
            } catch (err) {
                console.error(`[POINTS STATEMENT] ❌ Failed for user ${u.id}:`, err.message);
            }
        }

        console.log(`[POINTS STATEMENT] ✅ ${range.period}: sent ${sent} statement(s).`);
        return sent;
    } catch (error) {
        console.error('[POINTS STATEMENT] ❌ Error:', error.message);
        return 0;
    }
};

/**
 * Start the monthly statement job. Checks hourly and sends the PREVIOUS month's
 * statement within a UAE-time window: from 10:00 on the 1st, then all of the 2nd
 * and 3rd as a grace period. The per-user log makes every run idempotent, so:
 *   - the repeated ticks send each user at most once per period, and
 *   - if the server was down for the whole 1st, the 2nd/3rd ticks still catch up.
 * On the 2nd/3rd `previousMonthRange` still resolves to the same prior month, so
 * the grace window targets the same period — no risk of sending the wrong month.
 */
const startPointsStatementJob = () => {
    console.log('[POINTS STATEMENT] 🚀 Job started (fires monthly: 1st 10:00 Asia/Dubai, with a 2nd–3rd grace window)');

    const tick = () => {
        const { day, hour } = uaeNow();
        // 1st: only from 10:00 onward. 2nd & 3rd: any hour (pure catch-up).
        const inWindow = (day === 1 && hour >= 10) || day === 2 || day === 3;
        if (inWindow) {
            processMonthlyStatements();
        }
    };

    // Initial check shortly after boot (covers a server that starts on the 1st).
    setTimeout(tick, 60 * 1000);
    // Re-check every hour so we land within the 10:00 Dubai window.
    setInterval(tick, 60 * 60 * 1000);
};

module.exports = {
    startPointsStatementJob,
    processMonthlyStatements,
    computeStats,
    previousMonthRange,
};
