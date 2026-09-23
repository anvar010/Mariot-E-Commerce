const db = require('../config/db');
const { matchCountryCode } = require('../utils/dialCodes');

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
/**
 * A phone number reduced to what identifies it, country code included.
 *
 * The country code is part of the identity, not noise: +966 509955446 and
 * +971 509955446 are two different people in two different countries, and an earlier
 * version of this compared only the last 9 digits, so it treated them as the same
 * customer and pulled up a stranger's quotation history.
 *
 * What still has to be tolerated is the same number written differently. A UAE mobile is
 * given as 0501234567 locally and +971501234567 internationally, and those are one
 * person. The national trunk prefix -- the leading 0 that is dropped when a country code
 * is used -- is the only difference, so it is removed when a country code is present.
 *
 * Returns { full, local }: `full` is the number with its country code, `local` is the
 * subscriber part alone. A number typed without any country code can only be compared on
 * `local`, since we do not know which country it belongs to.
 */
const normalisePhone = (raw) => {
    const trimmed = String(raw || '').trim();
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return null;

    // An explicit country code is either written with a + or implied by a length that
    // cannot be a bare subscriber number.
    const hadPlus = trimmed.startsWith('+');
    const cc = matchCountryCode(digits);

    if (hadPlus && cc) {
        // Drop the trunk prefix so +971 0501234567 and +971 501234567 agree.
        const subscriber = digits.slice(cc.length).replace(/^0+/, '');
        return { cc, full: cc + subscriber, local: subscriber };
    }

    // No country code given. Strip a leading trunk 0 and keep the subscriber part; the
    // caller decides what that can safely be matched against.
    const local = digits.replace(/^0+/, '');
    return { cc: null, full: null, local };
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

    // Phone is tried BEFORE email, and when a phone is given its answer is final.
    //
    // The two disagree more often than they agree in this business: a company has one
    // office address that every buyer in it uses, so matching on email alone merged
    // colleagues into one "customer" and showed a Saudi buyer the quotation history of a
    // UAE one. The number is the person; the address is the company.
    const cleanPhone = normalisePhone(phone);
    if (cleanPhone) {
        // Strip separators in SQL so a stored "+971 50 123-4567" compares against bare
        // digits. Nested REPLACE rather than REGEXP_REPLACE because the latter is MySQL
        // 8.0+ only and this has to run on 5.7 too.
        const stripped = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),'.','')";
        // With the leading + removed as well, for comparing against digits-only forms.
        const digitsOnly = `REPLACE(${stripped},'+','')`;

        if (cleanPhone.full) {
            // A country code was given, so it is part of the identity. Matched against
            // stored numbers that carry a country code in any of the forms they are
            // written in -- with a +, without one, or with the trunk 0 still present.
            const [rows] = await db.execute(
                `SELECT * FROM customers
                  WHERE phone IS NOT NULL
                    AND ${digitsOnly} IN (?, ?)
                  LIMIT 1`,
                // Second form covers a record stored with the trunk 0 kept after the
                // country code, e.g. "+9710501234567". Built from the code we matched
                // rather than by regex, so the split is never guessed.
                [cleanPhone.full, `${cleanPhone.cc}0${cleanPhone.local}`]
            );
            if (rows.length) return rows[0];

            // Deliberately no fallback to the subscriber number alone.
            //
            // There used to be one, matching stored numbers short enough to look like they
            // carried no country code. It reintroduced the exact bug this function exists
            // to prevent: 9061242623 saved under +91 is 10 digits, so a +971 lookup for
            // the same digits matched it and called an Indian customer an existing UAE
            // one. Two country codes mean two people, and no length test can tell a bare
            // national number apart from a foreign one.
            //
            // The cost is that a record saved before country codes were captured will not
            // be found by a lookup that supplies one, and is reported as a new customer.
            // Creating a second record an admin can merge is the safe failure; showing one
            // customer another's quotation history is not.
            return null;
        }

        // No country code was typed. There is nothing to compare a country against, so
        // this can only match on the subscriber number, and only where the stored value
        // has no country code either.
        const [rows] = await db.execute(
            `SELECT * FROM customers
              WHERE phone IS NOT NULL
                AND LENGTH(${digitsOnly}) <= 10
                AND TRIM(LEADING '0' FROM ${digitsOnly}) = ?
              LIMIT 1`,
            [cleanPhone.local]
        );
        if (rows.length) return rows[0];

        // A usable phone was given and matched nobody. That is a genuine "new customer"
        // answer, so it is not second-guessed with the email -- doing so is exactly how a
        // different person on the same company address gets mistaken for this one.
        return null;
    }

    // No email fallback, deliberately.
    //
    // The phone number is the identity. An address is not: one company address is shared
    // by every buyer in it, so matching on email pulled up a colleague's history and,
    // with the phone field cleared, announced "existing customer" from the email alone --
    // which is what was reported.
    //
    // So a quotation with no phone number identifies nobody, and the customer is treated
    // as new. An explicit customer_id still works, which is how picking someone from the
    // search list continues to attach to their existing record.
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

    const insertValues = [details.user_id || null, String(details.name || '').trim(),
        details.company_name || null, normaliseEmail(details.email),
        details.phone ? String(details.phone).trim() : null,
        details.vat_number || null, details.address || null, createdBy || null];

    let result;
    try {
        [result] = await db.execute(
            `INSERT INTO customers (user_id, name, company_name, email, phone, vat_number, address, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            insertValues
        );
    } catch (err) {
        // A deployment still carrying the old unique index on email/phone refuses this
        // insert, and the quotation cannot be saved at all -- the staff member sees a
        // duplicate-entry error with nothing they can do about it.
        //
        // The index is dropped at startup (see config/init.js), but a running instance
        // keeps it until then, so the same record is written a second time with the
        // constraint out of the way. Ordinary failures are re-thrown untouched.
        if (err && err.code === 'ER_DUP_ENTRY') {
            console.warn('[customers] unique index still present, dropping and retrying:', err.sqlMessage);
            for (const name of ['uniq_customer_email', 'uniq_customer_phone']) {
                try { await db.query(`ALTER TABLE customers DROP INDEX ${name}`); } catch (e) { /* already gone */ }
            }
            [result] = await db.execute(
                `INSERT INTO customers (user_id, name, company_name, email, phone, vat_number, address, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                insertValues
            );
        } else {
            throw err;
        }
    }

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
                COALESCE(u.name, sq.created_by_name) AS created_by_name,
                -- Whether the author was staff or an admin. The stored column is the
                -- fallback so a quotation keeps the role its author held at the time,
                -- even if that person has since been promoted or removed.
                COALESCE(r.name, sq.created_by_role) AS created_by_role
           FROM staff_quotations sq
           LEFT JOIN branches b ON b.id = sq.branch_id
           LEFT JOIN users u ON u.id = sq.created_by
           LEFT JOIN roles r ON u.role_id = r.id
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
