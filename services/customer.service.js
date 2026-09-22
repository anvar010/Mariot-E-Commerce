const db = require('../config/db');

/**
 * Customer identity for staff quotations.
 *
 * Staff quote registered users and walk-ins alike, so a customer is its own record rather
 * than a site login. `customers.user_id` links to a storefront account when the person
 * happens to have one, which keeps one customer's quotations together whether they were
 * raised at a counter or against their online account.
 *
 * Matching rule: only phone, email and id are strong enough to identify someone. Names
 * are deliberately NOT used to merge -- "Mohammed Ali" is not evidence that two records
 * are one person, and silently merging two real customers is far worse than holding two
 * records that an admin can reconcile.
 */

/** Digits only, so +971 50 123 4567 and 0501234567 compare as the same line. */
const normalisePhone = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return null;
    // UAE numbers arrive as 0501234567, 971501234567 or +971501234567. Compare on the
    // last 9 digits, which is the subscriber number in every one of those forms.
    return digits.length > 9 ? digits.slice(-9) : digits;
};

const normaliseEmail = (raw) => {
    const e = String(raw || '').trim().toLowerCase();
    return e.length ? e : null;
};

/**
 * Find an existing customer by a strong identifier.
 *
 * Checked in order of confidence: explicit id, then email, then phone. Returns null when
 * nothing matches confidently, which the caller reads as "this is a new customer".
 */
const findExisting = async ({ customer_id, email, phone }) => {
    if (customer_id) {
        const [rows] = await db.execute('SELECT * FROM customers WHERE id = ?', [customer_id]);
        if (rows.length) return rows[0];
    }

    const cleanEmail = normaliseEmail(email);
    if (cleanEmail) {
        const [rows] = await db.execute('SELECT * FROM customers WHERE LOWER(email) = ?', [cleanEmail]);
        if (rows.length) return rows[0];
    }

    const cleanPhone = normalisePhone(phone);
    if (cleanPhone) {
        // Compare on the normalised tail so a record saved as +971501234567 still matches
        // an enquiry giving 0501234567.
        //
        // The stripping is done with nested REPLACE rather than REGEXP_REPLACE because the
        // latter is MySQL 8.0+ only and this has to run on 5.7 too. Separators seen in
        // practice are spaces, dashes, brackets, dots and a leading plus.
        const stripped = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),'.',''),'+','')";
        const [rows] = await db.execute(
            `SELECT * FROM customers
              WHERE phone IS NOT NULL
                AND RIGHT(${stripped}, 9) = ?
              LIMIT 1`,
            [cleanPhone]
        );
        if (rows.length) return rows[0];
    }

    return null;
};

/**
 * Return the customer for a quotation, creating one only when no strong identifier
 * matches. Also fills in details that were previously blank -- a walk-in who gave only a
 * phone last time and an email this time ends up with one complete record, not two.
 */
const findOrCreate = async (details, createdBy) => {
    const existing = await findExisting(details);

    if (existing) {
        // Only ever fill gaps. Overwriting a stored value with whatever was typed on the
        // latest quotation would let a mistyped form quietly corrupt a good record.
        const fill = [];
        const values = [];
        for (const [col, val] of [
            ['company_name', details.company_name], ['email', details.email],
            ['phone', details.phone], ['vat_number', details.vat_number],
            ['address', details.address],
        ]) {
            if (!existing[col] && val && String(val).trim()) {
                fill.push(`${col} = ?`);
                values.push(String(val).trim());
            }
        }
        if (fill.length) {
            values.push(existing.id);
            await db.execute(`UPDATE customers SET ${fill.join(', ')} WHERE id = ?`, values);
        }
        return { customer: { ...existing }, created: false };
    }

    const [result] = await db.execute(
        `INSERT INTO customers (user_id, name, company_name, email, phone, vat_number, address, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [details.user_id || null, String(details.name || '').trim(),
            details.company_name || null, normaliseEmail(details.email),
            details.phone ? String(details.phone).trim() : null,
            details.vat_number || null, details.address || null, createdBy || null]
    );
    const [rows] = await db.execute('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    return { customer: rows[0], created: true };
};

/**
 * Everything the quotation screen shows about a customer before staff raise a new quote:
 * their details, a status breakdown, which branches have quoted them, and the full
 * history across ALL branches -- the point being that a Sharjah clerk can see this
 * customer already holds three Dubai quotations.
 */
const getProfile = async (customerId) => {
    const [custRows] = await db.execute('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (custRows.length === 0) return null;

    const [quotations] = await db.query(
        `SELECT sq.id, sq.quotation_ref, sq.status, sq.total_amount, sq.created_at,
                sq.branch_id, sq.branch_code, sq.email_sent,
                b.name AS branch_name,
                COALESCE(u.name, sq.created_by_name) AS created_by_name
           FROM staff_quotations sq
           LEFT JOIN branches b ON b.id = sq.branch_id
           LEFT JOIN users u ON u.id = sq.created_by
          WHERE sq.customer_id = ?
          ORDER BY sq.id DESC`,
        [customerId]
    );

    // Counted in SQL rather than in JS so the summary stays correct as history grows
    // past whatever page size the UI eventually applies to the list above.
    const [[totals]] = await db.query(
        `SELECT COUNT(*) AS total_count, COALESCE(SUM(total_amount), 0) AS total_value
           FROM staff_quotations WHERE customer_id = ?`, [customerId]
    );
    const [statusRows] = await db.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS value
           FROM staff_quotations WHERE customer_id = ? GROUP BY status`, [customerId]
    );
    const [branchRows] = await db.query(
        `SELECT COALESCE(b.name, 'Unassigned') AS branch_name, sq.branch_code,
                COUNT(*) AS count, COALESCE(SUM(sq.total_amount), 0) AS value
           FROM staff_quotations sq
           LEFT JOIN branches b ON b.id = sq.branch_id
          WHERE sq.customer_id = ?
          GROUP BY b.name, sq.branch_code
          ORDER BY count DESC`,
        [customerId]
    );

    return {
        customer: custRows[0],
        summary: {
            total_count: Number(totals.total_count) || 0,
            total_value: Number(totals.total_value) || 0,
            by_status: statusRows.reduce((acc, r) => {
                acc[r.status] = { count: Number(r.count), value: Number(r.value) };
                return acc;
            }, {}),
        },
        branch_history: branchRows.map(r => ({
            branch_name: r.branch_name,
            branch_code: r.branch_code,
            count: Number(r.count),
            value: Number(r.value),
        })),
        quotations,
    };
};

module.exports = { findExisting, findOrCreate, getProfile, normalisePhone, normaliseEmail };
