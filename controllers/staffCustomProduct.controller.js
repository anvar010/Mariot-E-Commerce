const db = require('../config/db');
const fs = require('fs');

// Products that exist only for quoting: one-off fabrications, items sourced for a single
// customer, anything not in the catalogue. Kept in their own table rather than as hidden
// rows in `products`, so no storefront query -- listings, search, sitemap, feeds -- can
// ever surface one by forgetting a filter.
let tableEnsured = false;
const ensureTable = async () => {
    if (tableEnsured) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS staff_custom_products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            model VARCHAR(100) NULL,
            brand VARCHAR(255) NULL,
            description TEXT NULL,
            image VARCHAR(500) NULL,
            unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            is_fabrication TINYINT(1) NOT NULL DEFAULT 0,
            specs LONGTEXT NULL,
            created_by INT NULL,
            created_by_name VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_scp_created_by (created_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    tableEnsured = true;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Specs are free-form label -> value pairs (Width, Material, Thickness...). Trimmed, empty
// values dropped, and capped so a pasted blob cannot bloat every quotation it lands on.
const cleanSpecs = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const out = {};
    Object.entries(raw).slice(0, 25).forEach(([k, v]) => {
        const key = String(k || '').trim().slice(0, 60);
        const val = String(v ?? '').trim().slice(0, 200);
        if (key && val) out[key] = val;
    });
    return Object.keys(out).length ? out : null;
};

const parseRow = (r) => {
    let specs = null;
    if (r.specs) { try { specs = JSON.parse(r.specs); } catch { specs = null; } }
    return { ...r, unit_price: Number(r.unit_price) || 0, is_fabrication: Number(r.is_fabrication) === 1, specs };
};

const readBody = (body) => ({
    name: String(body.name || '').trim().slice(0, 255),
    model: String(body.model || '').trim().slice(0, 100) || null,
    brand: String(body.brand || '').trim().slice(0, 255) || null,
    description: String(body.description || '').trim() || null,
    image: String(body.image || '').trim().slice(0, 500) || null,
    unit_price: Math.max(0, round2(body.unit_price)),
    is_fabrication: body.is_fabrication ? 1 : 0,
    specs: cleanSpecs(body.specs),
});

// Everyone who can quote may use every custom product -- that is the point of saving them.
// Changing or removing one is limited to whoever created it, and admins.
const canModify = (req, row) =>
    !(req.user && req.user.role === 'staff') || Number(row.created_by) === Number(req.user.id);

// @desc    List custom products
// @route   GET /api/v1/staff-quotations/custom-products?search=
exports.getCustomProducts = async (req, res, next) => {
    try {
        await ensureTable();
        const term = String(req.query.search || '').trim();
        const params = [];
        let where = '';
        if (term) {
            const like = `%${term}%`;
            where = 'WHERE name LIKE ? OR model LIKE ? OR brand LIKE ? OR description LIKE ?';
            params.push(like, like, like, like);
        }
        const [rows] = await db.query(
            `SELECT * FROM staff_custom_products ${where} ORDER BY updated_at DESC, id DESC`, params
        );
        res.json({ success: true, data: rows.map(parseRow) });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a custom product
// @route   POST /api/v1/staff-quotations/custom-products
exports.createCustomProduct = async (req, res, next) => {
    try {
        await ensureTable();
        const p = readBody(req.body);
        if (!p.name) return res.status(400).json({ success: false, message: 'Product name is required' });
        const [r] = await db.execute(
            `INSERT INTO staff_custom_products
             (name, model, brand, description, image, unit_price, is_fabrication, specs, created_by, created_by_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.name, p.model, p.brand, p.description, p.image, p.unit_price, p.is_fabrication,
                p.specs ? JSON.stringify(p.specs) : null,
                (req.user && req.user.id) || null, (req.user && req.user.name) || null]
        );
        const [rows] = await db.execute('SELECT * FROM staff_custom_products WHERE id = ?', [r.insertId]);
        res.status(201).json({ success: true, data: parseRow(rows[0]) });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a custom product. Quotations already saved keep the copy they were
//          priced with -- a quotation is a record of what was sent.
// @route   PUT /api/v1/staff-quotations/custom-products/:id
exports.updateCustomProduct = async (req, res, next) => {
    try {
        await ensureTable();
        const [found] = await db.execute('SELECT * FROM staff_custom_products WHERE id = ?', [req.params.id]);
        if (found.length === 0) return res.status(404).json({ success: false, message: 'Custom product not found' });
        if (!canModify(req, found[0])) {
            return res.status(403).json({ success: false, message: 'Only the person who created this product can change it' });
        }
        const p = readBody(req.body);
        if (!p.name) return res.status(400).json({ success: false, message: 'Product name is required' });
        await db.execute(
            `UPDATE staff_custom_products
             SET name = ?, model = ?, brand = ?, description = ?, image = ?, unit_price = ?, is_fabrication = ?, specs = ?
             WHERE id = ?`,
            [p.name, p.model, p.brand, p.description, p.image, p.unit_price, p.is_fabrication,
                p.specs ? JSON.stringify(p.specs) : null, req.params.id]
        );
        const [rows] = await db.execute('SELECT * FROM staff_custom_products WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: parseRow(rows[0]) });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a custom product
// @route   DELETE /api/v1/staff-quotations/custom-products/:id
exports.deleteCustomProduct = async (req, res, next) => {
    try {
        await ensureTable();
        const [found] = await db.execute('SELECT * FROM staff_custom_products WHERE id = ?', [req.params.id]);
        if (found.length === 0) return res.status(404).json({ success: false, message: 'Custom product not found' });
        if (!canModify(req, found[0])) {
            return res.status(403).json({ success: false, message: 'Only the person who created this product can delete it' });
        }
        await db.execute('DELETE FROM staff_custom_products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Custom product deleted' });
    } catch (error) {
        next(error);
    }
};

// Custom product photos live in their own folder, uploads/qt_custom_products. The upload
// middleware and controller both read the folder from req.query, so it is pinned here
// rather than taken from the request -- staff must not be able to write anywhere else.
// Express 5 exposes req.query as a getter, so it is shadowed with an own property.
exports.CUSTOM_PRODUCT_FOLDER = 'qt_custom_products';
exports.forceUploadFolder = (req, res, next) => {
    Object.defineProperty(req, 'query', {
        value: { ...req.query, folder: exports.CUSTOM_PRODUCT_FOLDER },
        writable: true, configurable: true, enumerable: true,
    });
    next();
};

// The shared upload middleware also accepts PDFs and 3D models, which the admin media
// routes need. A custom product only ever has a photo, so anything else is refused here.
exports.requireImage = (req, res, next) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload an image' });
    if (!String(req.file.mimetype || '').startsWith('image/')) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: 'Only image files are allowed' });
    }
    next();
};
