const db = require('../config/db');
const { sendQuotationEmail } = require('../utils/sendEmail');

// Lazy migration: persist the applied coupon/points discount so admin views and
// re-downloads can show a discount line. Runs once; cheap no-op afterwards.
let quotationDiscountColumnReady = false;
const ensureQuotationDiscountColumn = async () => {
    if (quotationDiscountColumnReady) return;
    try {
        const [cols] = await db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotations' AND COLUMN_NAME = 'discount_amount'`
        );
        if (cols.length === 0) {
            await db.query(`ALTER TABLE quotations ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER subtotal`);
        }
        quotationDiscountColumnReady = true;
    } catch (e) {
        console.error('[Quotation] Failed to ensure discount_amount column:', e.message);
    }
};

exports.createQuotation = async (req, res, next) => {
    try {
        const {
            customer_name, customer_email, customer_phone, vat_number, items, subtotal, tax_amount, total_amount,
            discount_amount = 0, coupon_discount = 0, points_discount = 0, coupon_code = null, points_used = 0
        } = req.body;

        await ensureQuotationDiscountColumn();

        // Prefer user from auth middleware (optionalProtect), fallback to body, then null
        const user_id = req.user?.id || req.body.user_id || null;

        // Sequential ref derived from the row id (assigned after insert). A temp placeholder
        // satisfies the NOT NULL UNIQUE column; we set the real EQT-{id} right after.
        const tempRef = `EQT-TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Enrich each line with the product's short description so the quotation PDF can
        // show it under the title/brand. Cart items don't carry it, so look it up here.
        try {
            const ids = [...new Set((items || []).map(i => i.id).filter(Boolean))];
            if (ids.length > 0) {
                const [rows] = await db.query(
                    'SELECT id, model, specifications, specifications_ar FROM products WHERE id IN (?)',
                    [ids]
                );
                const byId = {};
                rows.forEach(r => { byId[r.id] = r; });
                (items || []).forEach(it => {
                    const p = byId[it.id];
                    if (p) {
                        // Show the product specifications (like the product detail page) in the quotation.
                        it.specifications = p.specifications || '';
                        it.specifications_ar = p.specifications_ar || '';
                        // Cart lines may not carry the model — fall back to the product's model.
                        if (!it.model && p.model) it.model = p.model;
                    }
                });
            }
        } catch (e) {
            console.error('[Quotation] short description enrich failed:', e.message);
        }

        const [result] = await db.execute(
            `INSERT INTO quotations (quotation_ref, customer_name, customer_email, customer_phone, vat_number, items, subtotal, discount_amount, tax_amount, total_amount, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tempRef, customer_name, customer_email, customer_phone, vat_number, JSON.stringify(items), subtotal, discount_amount, tax_amount, total_amount, user_id]
        );

        // Sequential ref from the new row id, e.g. EQT-00042.
        const newId = result.insertId;
        const quotation_ref = `EQT-${String(newId).padStart(5, '0')}`;
        await db.execute('UPDATE quotations SET quotation_ref = ? WHERE id = ?', [quotation_ref, newId]);

        const newQuotation = {
            id: newId,
            quotation_ref,
            customer_name,
            customer_email,
            customer_phone,
            vat_number,
            items,
            subtotal,
            discount_amount,
            coupon_discount,
            points_discount,
            coupon_code,
            points_used,
            tax_amount,
            total_amount,
            user_id,
            created_at: new Date()
        };

        // --- ASYNC QUOTATION EMAIL ---
        const qLocale = String(req.body?.locale || req.headers?.['x-locale'] || req.cookies?.NEXT_LOCALE || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
        (async () => {
            try {
                await sendQuotationEmail(
                    customer_email,
                    customer_name,
                    quotation_ref,
                    total_amount,
                    items,
                    qLocale,
                    { subtotal, discount_amount, coupon_discount, points_discount, coupon_code, points_used, tax_amount }
                );
            } catch (err) {
                console.error('[Email Service Error] Failed to send quotation email:', err.message);
            }
        })();

        res.status(201).json({
            success: true,
            data: newQuotation
        });
    } catch (error) {
        console.error('Error creating quotation:', error);
        next(error);
    }
};

exports.getMyQuotations = async (req, res, next) => {
    try {
        const [quotations] = await db.execute(
            'SELECT * FROM quotations WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        res.status(200).json({
            success: true,
            data: quotations
        });
    } catch (error) {
        console.error('Error fetching quotations:', error);
        next(error);
    }
};

exports.deleteQuotation = async (req, res, next) => {
    try {
        const [quotation] = await db.execute(
            'SELECT * FROM quotations WHERE id = ?',
            [req.params.id]
        );

        if (quotation.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        // Check if user owns the quotation or is admin
        if (quotation[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Not authorized to delete this quotation' });
        }

        await db.execute('DELETE FROM quotations WHERE id = ?', [req.params.id]);

        res.status(200).json({
            success: true,
            message: 'Quotation deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting quotation:', error);
        next(error);
    }
};

exports.getQuotations = async (req, res, next) => {
    try {
        const [quotations] = await db.execute(
            'SELECT * FROM quotations ORDER BY created_at DESC'
        );

        res.status(200).json({
            success: true,
            data: quotations
        });
    } catch (error) {
        console.error('Error fetching all quotations:', error);
        next(error);
    }
};
