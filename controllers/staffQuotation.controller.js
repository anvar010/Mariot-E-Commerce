const db = require('../config/db');
const { sendQuotationEmail } = require('../utils/sendEmail');
const { getSettingValue } = require('./settings.controller');
const { reserveOnConnection, resolveBranchForUser } = require('../services/quotationNumber.service');
const customerService = require('../services/customer.service');

// Staff-built quotations live in their own table rather than sharing `quotations`
// with the storefront: those are customer-initiated from the cart and carry no
// per-line discount, while these are priced by a member of staff who can discount
// each line individually. Keeping them apart means neither flow has to grow
// nullable columns it never uses, and the customer-facing list stays clean.
let tableEnsured = false;
const ensureStaffQuotationsTable = async () => {
    if (tableEnsured) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS staff_quotations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            quotation_ref VARCHAR(50) NOT NULL UNIQUE,
            created_by INT NULL,
            created_by_name VARCHAR(255),
            created_by_role VARCHAR(50),
            customer_name VARCHAR(255),
            customer_email VARCHAR(255),
            customer_phone VARCHAR(50),
            vat_number VARCHAR(50),
            items LONGTEXT,
            subtotal DECIMAL(12,2) DEFAULT 0,
            discount_amount DECIMAL(12,2) DEFAULT 0,
            tax_amount DECIMAL(12,2) DEFAULT 0,
            total_amount DECIMAL(12,2) DEFAULT 0,
            notes TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            review_note TEXT,
            reviewed_by INT NULL,
            reviewed_by_name VARCHAR(255),
            reviewed_at DATETIME NULL,
            email_sent TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    // Any column added above after this table first shipped must also be listed
    // here — CREATE TABLE IF NOT EXISTS never alters an existing table. This is the
    // same trap that left hero_slides without image_ar.
    for (const [col, ddl] of [['notes', 'TEXT'], ['email_sent', 'TINYINT(1) DEFAULT 0'],
        ['created_by_name', 'VARCHAR(255)'], ['created_by_role', 'VARCHAR(50)'],
        ['status', "VARCHAR(20) NOT NULL DEFAULT 'pending'"], ['review_note', 'TEXT'],
        ['reviewed_by', 'INT NULL'], ['reviewed_by_name', 'VARCHAR(255)'],
        ['reviewed_at', 'DATETIME NULL'],
        // Branch-scoped numbering and the customer the quote belongs to. branch_code and
        // branch_seq are stored alongside branch_id so the unique index below can police
        // the ref even if a branch is later renamed or its row removed.
        ['branch_id', 'INT NULL'], ['customer_id', 'INT NULL'],
        ['branch_code', 'VARCHAR(10) NULL'], ['branch_seq', 'INT NULL'],
        // The year the sequence belongs to. The count restarts each January, so the
        // number alone no longer identifies a quotation within its branch.
        ['branch_year', 'SMALLINT NULL']]) {
        try { await db.query(`ALTER TABLE staff_quotations ADD COLUMN ${col} ${ddl}`); }
        catch (e) { /* column already exists — ignore */ }
    }
    for (const idx of [
        'ADD KEY idx_sq_branch (branch_id)',
        'ADD KEY idx_sq_customer (customer_id)',
        'ADD KEY idx_sq_created_by (created_by)',
        // Belt and braces alongside branch_quote_seq: even a bug in the number generator
        // cannot land two quotations on the same ref within a branch and year.
        'ADD UNIQUE KEY uniq_sq_branch_year_seq (branch_code, branch_year, branch_seq)',
    ]) {
        try { await db.query(`ALTER TABLE staff_quotations ${idx}`); }
        catch (e) { /* index already present — ignore */ }
    }

    // The old index spanned only code and sequence. With the count restarting each
    // January that is wrong -- DXB-2026-1 and DXB-2027-1 share a sequence and the second
    // would be refused -- so it is dropped once the year-aware one above is in place.
    try { await db.query('ALTER TABLE staff_quotations DROP INDEX uniq_sq_branch_seq'); }
    catch (e) { /* already dropped, or never created */ }
    tableEnsured = true;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Look up the admin-set discount ceiling for the products on a quotation.
// Returns a Map of product_id -> max percent. A product with no cap is absent
// from the map, which callers read as "unrestricted".
const maxDiscountByProduct = async (ids) => {
    const map = new Map();
    const clean = [...new Set(ids.filter(id => Number.isFinite(Number(id))))];
    if (clean.length === 0) return map;
    try {
        const [rows] = await db.query(
            'SELECT id, max_staff_discount_pct FROM products WHERE id IN (?)', [clean]
        );
        rows.forEach(r => {
            if (r.max_staff_discount_pct !== null && r.max_staff_discount_pct !== undefined) {
                map.set(Number(r.id), Number(r.max_staff_discount_pct));
            }
        });
    } catch (e) {
        // Column missing on an un-migrated database: treat every product as uncapped
        // rather than blocking staff from quoting at all.
        console.warn('[StaffQuotation] Could not read discount caps:', e.message);
    }
    return map;
};

// Recompute every line and the totals server-side. The client sends what the staff
// member typed, but prices that reach the database must never be client-trusted —
// a tampered payload could otherwise book an arbitrary total.
//
// `caps` enforces the admin-set per-product discount ceiling. It is applied for staff
// only; admins pass an empty map and are unrestricted. Clamping happens HERE, not in
// the browser, because the UI limit is a convenience that a crafted request bypasses.
const priceItems = (rawItems, caps = new Map()) => {
    const items = (Array.isArray(rawItems) ? rawItems : []).map((it) => {
        const unitPrice = round2(it.unit_price !== undefined ? it.unit_price : it.price);
        const quantity = Math.max(1, parseInt(it.quantity, 10) || 1);
        const gross = round2(unitPrice * quantity);
        // A line takes either a percentage or a flat amount; percentage wins when both
        // are present so the UI can offer one field without ambiguity.
        const requestedPct = Math.min(100, Math.max(0, Number(it.discount_pct) || 0));
        const pid = it.product_id !== undefined ? it.product_id : it.id;
        const cap = caps.has(Number(pid)) ? caps.get(Number(pid)) : null;
        const pct = cap === null ? requestedPct : Math.min(requestedPct, cap);
        const flat = Math.max(0, round2(it.discount_amount));
        // The cap has to bind in money, not just percent: a request carrying
        // discount_pct: 0 with a huge discount_amount would otherwise take the flat
        // branch and discount the whole line, walking straight past the ceiling.
        const capAmount = cap === null ? gross : round2(gross * (cap / 100));
        const discount = pct > 0
            ? Math.min(round2(gross * (pct / 100)), capAmount)
            : Math.min(flat, capAmount);
        return {
            product_id: it.product_id !== undefined ? it.product_id : (it.id !== undefined ? it.id : null),
            slug: it.slug || '',
            name: it.name || '',
            name_ar: it.name_ar || '',
            model: it.model || '',
            brand: it.brand || '',
            image: it.image || '',
            description: it.description || '',
            description_ar: it.description_ar || '',
            unit_price: unitPrice,
            price: unitPrice, // the shared PDF/email helpers read `price`
            quantity,
            discount_pct: pct,
            requested_discount_pct: requestedPct,
            max_staff_discount_pct: cap,
            discount_amount: discount,
            line_total: round2(gross - discount),
            // What the price was worked out from. A customizable product priced at 1,600 is
            // meaningless on a quotation without the size that produced it, and the same
            // product at two sizes is two lines -- so both are carried through to the saved
            // items and the PDF rather than being rebuilt away here.
            variant_id: it.variant_id !== undefined && it.variant_id !== null ? Number(it.variant_id) : null,
            variant_label: it.variant_label || null,
            custom_dimensions: it.custom_dimensions && typeof it.custom_dimensions === 'object'
                ? it.custom_dimensions
                : null,
        };
    });

    const subtotal = round2(items.reduce((s, i) => s + i.unit_price * i.quantity, 0));
    const discount_amount = round2(items.reduce((s, i) => s + i.discount_amount, 0));
    const taxable = Math.max(0, round2(subtotal - discount_amount));
    const tax_amount = round2(taxable * 0.05);
    const total_amount = round2(taxable + tax_amount);
    return { items, subtotal, discount_amount, tax_amount, total_amount };
};

// Staff may only ever touch their own quotations; admins see everything. Applied
// on every read and write rather than only in the list, because filtering the UI
// alone still leaves /:id reachable for someone else's record.
const isStaffUser = (req) => !!(req.user && req.user.role === 'staff');

// Returns the row only when the requester is allowed to see it.
const ownedByRequester = async (req, id) => {
    const [rows] = await db.execute('SELECT * FROM staff_quotations WHERE id = ?', [id]);
    if (rows.length === 0) return { row: null, allowed: false };
    const row = rows[0];
    if (isStaffUser(req) && Number(row.created_by) !== Number(req.user.id)) {
        return { row, allowed: false };
    }
    return { row, allowed: true };
};

// The admin's maximum discount, as a share of the subtotal. At or below it a staff
// quotation is approved on submission and can be downloaded straight away; above
// it, it goes to an admin. Exceeding the figure is allowed but has to be signed
// off — it is a threshold, not a wall. 0 sends everything for approval, 100 none.
// Per-product caps are separate and remain hard clamps on an individual line.
const approvalThresholdPct = async () => {
    const raw = await getSettingValue('staff_quotation_max_discount_pct', '20');
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 20;
};

// Discount as a percentage of the pre-discount subtotal. Percent rather than a
// flat amount so the rule reads the same on a 2,000 quote and a 200,000 one.
const discountShare = (priced) =>
    priced.subtotal > 0 ? (priced.discount_amount / priced.subtotal) * 100 : 0;

// @desc    Create a staff-built quotation
// @route   POST /api/v1/staff-quotations
exports.createStaffQuotation = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        const { customer_name, customer_email, customer_phone, vat_number, notes } = req.body;

        if (!customer_name || !String(customer_name).trim()) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }
        // Admins are unrestricted; staff are held to each product's ceiling.
        const isStaff = req.user && req.user.role === 'staff';
        const caps = isStaff
            ? await maxDiscountByProduct((req.body.items || []).map(i => i.product_id !== undefined ? i.product_id : i.id))
            : new Map();
        const priced = priceItems(req.body.items, caps);
        if (priced.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Add at least one product' });
        }

        // An admin raising a quotation is the approver already. For staff it turns on
        // how deep the discount goes.
        const threshold = await approvalThresholdPct();
        const share = discountShare(priced);
        const needsApproval = isStaff && share > threshold;
        const autoNote = (!needsApproval && isStaff)
            ? `Auto-approved: ${share.toFixed(1)}% discount is within the ${threshold}% threshold`
            : null;

        // Which office this quotation is issued from. For staff this comes from their own
        // account, never the request body -- see resolveBranchForUser.
        const branchId = await resolveBranchForUser(req.user, req.body.branch_id);

        // Attach the quotation to a customer record, reusing one when a strong identifier
        // matches so a returning customer's history stays on a single profile.
        const { customer } = await customerService.findOrCreate({
            customer_id: req.body.customer_id,
            name: customer_name,
            company_name: req.body.company_name,
            email: customer_email,
            phone: customer_phone,
            vat_number,
            address: req.body.address,
        }, (req.user && req.user.id) || null);

        // The number and the row are written in one transaction: a failed insert releases
        // the number rather than burning it, and a concurrent create for the same branch
        // blocks on the counter row instead of taking the same ref.
        const conn = await db.getConnection();
        let insertId, quotation_ref, branchMeta;
        try {
            await conn.beginTransaction();
            branchMeta = await reserveOnConnection(conn, branchId);
            quotation_ref = branchMeta.ref;

            const [result] = await conn.execute(
                `INSERT INTO staff_quotations
                 (quotation_ref, branch_id, branch_code, branch_seq, branch_year, customer_id, created_by, created_by_name, created_by_role, customer_name, customer_email, customer_phone, vat_number, items, subtotal, discount_amount, tax_amount, total_amount, notes, status, reviewed_by, reviewed_by_name, reviewed_at, review_note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [quotation_ref, branchId, branchMeta.code, branchMeta.seq, branchMeta.year, customer.id,
                    (req.user && req.user.id) || null,
                    // Denormalised on purpose: the join below loses the author entirely if the
                    // account is later deleted, and a quotation must always say who raised it.
                    (req.user && req.user.name) || null, (req.user && req.user.role) || null,
                    customer_name, customer_email || null,
                    customer_phone || null, vat_number || null, JSON.stringify(priced.items),
                    priced.subtotal, priced.discount_amount, priced.tax_amount, priced.total_amount, notes || null,
                    needsApproval ? 'pending' : 'approved',
                    // Nobody reviewed an auto-approved quotation, so reviewed_by stays null;
                    // the note records why it did not need one.
                    (!needsApproval && isStaff) ? null : (isStaff ? null : ((req.user && req.user.id) || null)),
                    (!needsApproval && isStaff) ? 'Auto' : (isStaff ? null : ((req.user && req.user.name) || null)),
                    needsApproval ? null : new Date(),
                    autoNote]
            );
            insertId = result.insertId;
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

        res.status(201).json({
            success: true,
            data: {
                id: insertId, quotation_ref, status: needsApproval ? 'pending' : 'approved', customer_name,
                branch_id: branchId, branch_code: branchMeta.code, customer_id: customer.id,
                customer_email: customer_email || null, customer_phone: customer_phone || null,
                vat_number: vat_number || null, notes: notes || null, ...priced
            }
        });
    } catch (error) {
        // Branch/validation failures carry their own status; anything else is a 500.
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// @desc    List staff quotations
// @route   GET /api/v1/staff-quotations
exports.getStaffQuotations = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        // Staff see only what they raised; admins see the whole queue across every branch.
        const scoped = isStaffUser(req);
        const where = [];
        const params = [];
        if (scoped) {
            where.push('sq.created_by = ?');
            params.push(req.user.id);
        }

        // Admin filters. Each is optional and they combine, so "Dubai + rejected + this
        // month" narrows as expected. Staff may pass them too; their own-rows-only
        // restriction above still applies on top.
        const { branch_id, created_by, customer_id, status, date_from, date_to, quotation_ref } = req.query;
        if (branch_id) { where.push('sq.branch_id = ?'); params.push(Number(branch_id)); }
        if (created_by) { where.push('sq.created_by = ?'); params.push(Number(created_by)); }
        if (customer_id) { where.push('sq.customer_id = ?'); params.push(Number(customer_id)); }
        if (status) { where.push('sq.status = ?'); params.push(String(status)); }
        if (quotation_ref) { where.push('sq.quotation_ref LIKE ?'); params.push(`%${String(quotation_ref).trim()}%`); }
        if (date_from) { where.push('sq.created_at >= ?'); params.push(`${date_from} 00:00:00`); }
        // Inclusive of the whole end day: a range ending "today" must contain a quotation
        // raised this afternoon, which `<= 'YYYY-MM-DD'` alone would exclude.
        if (date_to) { where.push('sq.created_at <= ?'); params.push(`${date_to} 23:59:59`); }

        const [rows] = await db.query(`
            SELECT sq.*,
                   COALESCE(u.name, sq.created_by_name) AS created_by_name,
                   COALESCE(r.name, sq.created_by_role) AS created_by_role,
                   u.email AS created_by_email,
                   b.name AS branch_name,
                   c.name AS customer_record_name,
                   c.company_name AS customer_company
            FROM staff_quotations sq
            LEFT JOIN users u ON u.id = sq.created_by
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN branches b ON b.id = sq.branch_id
            LEFT JOIN customers c ON c.id = sq.customer_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY sq.id DESC
        `, params);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        next(error);
    }
};

// @desc    Get one staff quotation
// @route   GET /api/v1/staff-quotations/:id
exports.getStaffQuotation = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        const [rows] = await db.execute(
            `SELECT sq.*,
                    COALESCE(u.name, sq.created_by_name) AS created_by_name,
                    COALESCE(r.name, sq.created_by_role) AS created_by_role,
                    u.email AS created_by_email
             FROM staff_quotations sq
             LEFT JOIN users u ON u.id = sq.created_by
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE sq.id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Quotation not found' });
        // 404 rather than 403: a staff member has no business learning that someone
        // else's quotation exists at this id.
        if (isStaffUser(req) && Number(rows[0].created_by) !== Number(req.user.id)) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a staff quotation (totals are re-derived from the submitted lines)
// @route   PUT /api/v1/staff-quotations/:id
exports.updateStaffQuotation = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        const { customer_name, customer_email, customer_phone, vat_number, notes } = req.body;
        // Admins are unrestricted; staff are held to each product's ceiling.
        const isStaff = req.user && req.user.role === 'staff';
        const caps = isStaff
            ? await maxDiscountByProduct((req.body.items || []).map(i => i.product_id !== undefined ? i.product_id : i.id))
            : new Map();
        const priced = priceItems(req.body.items, caps);
        if (priced.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Add at least one product' });
        }
        // Any edit by staff invalidates a previous decision — otherwise an approved
        // quote could be rewritten after the fact and still read as approved. The
        // edited version is re-judged against the threshold, so trimming a discount
        // back under the line clears it again without an admin round trip.
        let resetReview = '';
        if (isStaff) {
            const threshold = await approvalThresholdPct();
            const share = discountShare(priced);
            resetReview = share > threshold
                ? ", status = 'pending', reviewed_by = NULL, reviewed_by_name = NULL, reviewed_at = NULL, review_note = NULL"
                : ", status = 'approved', reviewed_by = NULL, reviewed_by_name = 'Auto', reviewed_at = NOW(),"
                  + ` review_note = ${db.escape(`Auto-approved: ${share.toFixed(1)}% discount is within the ${threshold}% threshold`)}`;
        }
        const [r] = await db.execute(
            `UPDATE staff_quotations
             SET customer_name = ?, customer_email = ?, customer_phone = ?, vat_number = ?,
                 items = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, notes = ?${resetReview}
             WHERE id = ?`,
            [customer_name, customer_email || null, customer_phone || null, vat_number || null,
                JSON.stringify(priced.items), priced.subtotal, priced.discount_amount,
                priced.tax_amount, priced.total_amount, notes || null, req.params.id]
        );
        if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Quotation not found' });
        res.json({ success: true, message: 'Quotation updated', data: { id: Number(req.params.id), ...priced } });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a staff quotation
// @route   DELETE /api/v1/staff-quotations/:id
exports.deleteStaffQuotation = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        const owned = await ownedByRequester(req, req.params.id);
        if (!owned.row || !owned.allowed) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }
        const [r] = await db.execute('DELETE FROM staff_quotations WHERE id = ?', [req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Quotation not found' });
        res.json({ success: true, message: 'Quotation deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Email a staff quotation to the customer, with the client-rendered PDF attached
// @route   POST /api/v1/staff-quotations/:id/send-email
// Sending is a deliberate, separate action: staff routinely build and revise a quote
// before it is fit to leave the building, so creating one never emails on its own.
exports.sendStaffQuotationEmail = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        const { pdf_base64, locale } = req.body;
        const owned = await ownedByRequester(req, req.params.id);
        if (!owned.row || !owned.allowed) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const q = owned.row;
        if (!q.customer_email) {
            return res.status(400).json({ success: false, message: 'This quotation has no customer email' });
        }
        // The approval gate is meaningless if an unapproved quote can still be sent.
        if (q.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: q.status === 'rejected'
                    ? 'This quotation was not approved and cannot be sent'
                    : 'This quotation is awaiting approval and cannot be sent yet'
            });
        }
        const items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);

        let pdfBuffer = null;
        if (pdf_base64) {
            try {
                pdfBuffer = Buffer.from(String(pdf_base64).replace(/^data:application\/pdf[^,]*,/, ''), 'base64');
            } catch (e) {
                console.warn('[StaffQuotation] Could not decode pdf_base64:', e.message);
            }
        }

        const qLocale = String(locale || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
        await sendQuotationEmail(
            q.customer_email, q.customer_name, q.quotation_ref, q.total_amount, items, qLocale,
            { subtotal: q.subtotal, discount_amount: q.discount_amount, tax_amount: q.tax_amount },
            pdfBuffer
        );
        await db.execute('UPDATE staff_quotations SET email_sent = 1 WHERE id = ?', [req.params.id]);

        res.json({ success: true, message: 'Quotation emailed to the customer' });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve or reject a staff quotation
// @route   PATCH /api/v1/staff-quotations/:id/review
// Admin only — the route layer enforces it. Staff must never be able to clear
// their own submission, or the whole approval step is decorative.
exports.reviewStaffQuotation = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        const { status, review_note } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
        }
        // A rejection without a reason leaves the author with nothing to act on.
        if (status === 'rejected' && !String(review_note || '').trim()) {
            return res.status(400).json({ success: false, message: 'Add a note explaining why it was not approved' });
        }

        const [r] = await db.execute(
            `UPDATE staff_quotations
             SET status = ?, review_note = ?, reviewed_by = ?, reviewed_by_name = ?, reviewed_at = ?
             WHERE id = ?`,
            [status, String(review_note || '').trim() || null, (req.user && req.user.id) || null,
                (req.user && req.user.name) || null, new Date(), req.params.id]
        );
        if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Quotation not found' });

        res.json({
            success: true,
            message: status === 'approved' ? 'Quotation approved' : 'Quotation marked as not approved',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Look up existing customers to prefill a quotation
// @route   GET /api/v1/staff-quotations/customers?search=
// Deliberately NOT the admin user list: that needs the `users` permission, which
// quotation staff have no reason to hold. This returns only the handful of fields
// the quotation form fills in, and only for accounts with the customer role — so
// it can never be used to enumerate staff or admin accounts.
exports.lookupCustomers = async (req, res, next) => {
    try {
        const term = String(req.query.search || '').trim();
        if (term.length < 2) return res.json({ success: true, data: [] });

        const like = `%${term}%`;
        // Two sources, because a customer may exist as either: a `customers` record (the
        // walk-in and phone-enquiry case, which is the majority of staff quoting) or a
        // storefront account that has never been quoted. Results are tagged with `source`
        // so the UI can show which is which, and a `customers` row that is linked to a
        // user account suppresses the duplicate from the users side.
        const [customerRows] = await db.query(
            `SELECT c.id, c.user_id, c.name, c.email, c.phone AS phone_number,
                    c.company_name, c.vat_number, c.address,
                    'customer' AS source,
                    (SELECT COUNT(*) FROM staff_quotations sq WHERE sq.customer_id = c.id) AS quotation_count
               FROM customers c
              WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company_name LIKE ?
           ORDER BY quotation_count DESC, c.name ASC
              LIMIT 8`,
            [like, like, like, like]
        );

        const linkedUserIds = customerRows.map(r => r.user_id).filter(Boolean);
        const [userRows] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone_number, u.company_name, u.vat_number,
                    'user' AS source, 0 AS quotation_count
               FROM users u
               LEFT JOIN roles r ON r.id = u.role_id
              WHERE r.name = 'user'
                AND (u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ? OR u.company_name LIKE ?)
                ${linkedUserIds.length ? 'AND u.id NOT IN (?)' : ''}
           ORDER BY u.name ASC
              LIMIT 8`,
            linkedUserIds.length ? [like, like, like, like, linkedUserIds] : [like, like, like, like]
        );

        res.json({ success: true, data: [...customerRows, ...userRows] });
    } catch (error) {
        next(error);
    }
};

// @desc    Full customer profile: details, quotation summary, branch history, all quotes
// @route   GET /api/v1/staff-quotations/customers/:id/profile
// Deliberately NOT branch-scoped. The whole point is that a Sharjah clerk can see this
// customer already holds three Dubai quotations before raising a fourth.
exports.getCustomerProfile = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        const profile = await customerService.getProfile(req.params.id);
        if (!profile) return res.status(404).json({ success: false, message: 'Customer not found' });
        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
};

// @desc    Resolve a customer by a strong identifier (phone/email) without creating one
// @route   GET /api/v1/staff-quotations/customers/match?phone=&email=
// Lets the quotation form say "this customer already exists" as soon as staff finish
// typing a phone number, before anything is saved.
exports.matchCustomer = async (req, res, next) => {
    try {
        await ensureStaffQuotationsTable();
        // Phone only. The email is no longer an identifier -- one company address is
        // shared by every buyer in it -- so a request carrying just an email has nothing
        // to match on and is answered as "nobody" without touching the database.
        const { phone } = req.query;
        if (!phone) {
            return res.json({ success: true, data: null });
        }
        const found = await customerService.findExisting({ phone });
        if (!found) return res.json({ success: true, data: null });
        const profile = await customerService.getProfile(found.id);
        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
};

// @desc    List branches (for the admin branch filter and staff branch assignment)
// @route   GET /api/v1/staff-quotations/branches
exports.getBranches = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, code FROM branches WHERE is_active = 1 ORDER BY name ASC'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};
