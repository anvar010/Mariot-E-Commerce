const db = require('../config/db');

/**
 * Branch-scoped quotation numbering.
 *
 * Each branch has its own sequence, restarting every January -- DXB-2026-1, SHJ1-2026-1,
 * AD1-2026-1 -- and the numbers must never collide or repeat. They are therefore issued
 * by the database, not by the application: the reservation bumps the counter row for that
 * branch and year and reads it back while holding the row's lock, so two staff submitting
 * at the same instant queue up and take consecutive numbers.
 *
 * The obvious alternative, SELECT MAX(branch_seq) + 1, is what this exists to avoid: two
 * concurrent readers both see the same maximum and both write the same ref.
 */

/**
 * The agreed reference format: DXB-2026-1.
 *
 * Deliberately not zero-padded. The sequence counts plainly -- 1, 2, 10, 100 -- which is
 * what was asked for, and the year keeps references distinguishable without it.
 */
const formatRef = (code, seq, year) => `${code}-${year}-${seq}`;

/** The year a reference is stamped with, and the year its counter belongs to. */
const currentYear = () => new Date().getFullYear();

/**
 * Reserve the next number for a branch and return { ref, seq, code }.
 *
 * Runs on a caller-supplied connection so the reservation commits or rolls back with the
 * quotation insert itself. If the insert fails, the number is released rather than
 * leaving a gap in the branch's sequence.
 */
const reserveOnConnection = async (conn, branchId) => {
    const [branchRows] = await conn.execute(
        'SELECT id, code FROM branches WHERE id = ? AND is_active = 1', [branchId]
    );
    if (branchRows.length === 0) {
        const err = new Error('Unknown or inactive branch');
        err.statusCode = 400;
        throw err;
    }
    const code = branchRows[0].code;
    const year = currentYear();

    // The UPDATE takes an exclusive lock on this branch-and-year row and holds it until
    // the caller's transaction ends. Concurrent creators for the SAME branch in the SAME
    // year serialise here; every other combination touches a different row and is
    // unaffected.
    //
    // This is deliberately the FIRST write in the transaction. An earlier
    // `INSERT IGNORE ... VALUES (branch_id, 0)` to guarantee the row existed took a
    // gap/insert-intention lock that deadlocked concurrent transactions against each
    // other -- reliably, at 20 parallel reservations. The row is seeded for the current
    // year by the migration, so the common path needs no insert at all; the rare missing
    // row is handled below, outside the contended path.
    const [upd] = await conn.execute(
        'UPDATE branch_quote_seq SET last_number = last_number + 1 WHERE branch_id = ? AND seq_year = ?',
        [branchId, year]
    );

    if (upd.affectedRows === 0) {
        // No counter row for this branch and year: either a branch added after the
        // migration ran, or -- the common case -- the first quotation of a new year.
        // Created already claiming number 1, so this caller takes it and never collides
        // with a concurrent creator, which would fail the primary key rather than
        // duplicate.
        await conn.execute(
            'INSERT INTO branch_quote_seq (branch_id, seq_year, last_number) VALUES (?, ?, 1)',
            [branchId, year]
        );
        return { ref: formatRef(code, 1, year), seq: 1, code, year };
    }

    const [seqRows] = await conn.execute(
        'SELECT last_number FROM branch_quote_seq WHERE branch_id = ? AND seq_year = ?',
        [branchId, year]
    );
    const seq = Number(seqRows[0].last_number);

    return { ref: formatRef(code, seq, year), seq, code, year };
};

/**
 * Resolve the branch a quotation should be stamped with.
 *
 * Staff quote under their own branch and cannot choose another -- the branch comes from
 * their account, never from the request body, so a crafted payload cannot issue a
 * Dubai number from Sharjah. An admin has no branch of their own and must say which
 * office the quotation belongs to.
 */
const resolveBranchForUser = async (user, requestedBranchId) => {
    if (!user) {
        const err = new Error('Not authenticated');
        err.statusCode = 401;
        throw err;
    }

    if (user.role === 'staff') {
        const [rows] = await db.execute('SELECT branch_id FROM users WHERE id = ?', [user.id]);
        const branchId = rows.length ? rows[0].branch_id : null;
        if (!branchId) {
            // Better to stop than to guess: a quotation numbered under the wrong office
            // is worse than one that was never created.
            const err = new Error('Your account is not assigned to a branch. Ask an administrator to set one.');
            err.statusCode = 400;
            throw err;
        }
        return Number(branchId);
    }

    // Admin (or any non-staff role with access): the branch must be stated explicitly.
    const branchId = Number(requestedBranchId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
        const err = new Error('Select the branch this quotation is issued from');
        err.statusCode = 400;
        throw err;
    }
    return branchId;
};

module.exports = { reserveOnConnection, resolveBranchForUser, formatRef };
