/**
 * Delivery zones — how much longer than the UAE each destination takes.
 *
 * A product carries one delivery_days figure, which is the UAE promise. Rather
 * than storing a full product × country matrix (1,400 products times seven
 * countries, all of it hand-maintained), each destination holds an offset and the
 * shown date is product.delivery_days + zone.extra_days. Editing one row moves
 * the promise for the whole catalogue.
 */
const db = require('../config/db');

// Seeded on first use so the feature works the moment it ships, rather than the
// selector appearing with nothing in it. All of it is editable afterwards.
const DEFAULT_ZONES = [
    ['AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 0, 1],
    ['SA', 'Saudi Arabia', 'المملكة العربية السعودية', 2, 2],
    ['KW', 'Kuwait', 'الكويت', 3, 3],
    ['QA', 'Qatar', 'قطر', 3, 4],
    ['BH', 'Bahrain', 'البحرين', 3, 5],
    ['OM', 'Oman', 'عُمان', 3, 6],
    ['WW', 'Other countries', 'دول أخرى', 7, 7],
];

let tableReady = false;
const ensureTable = async () => {
    if (tableReady) return;

    await db.query(`
        CREATE TABLE IF NOT EXISTS delivery_zones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            country_code VARCHAR(2) NOT NULL UNIQUE,
            country_name VARCHAR(120) NOT NULL,
            country_name_ar VARCHAR(120),
            extra_days INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            order_index INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // CREATE TABLE IF NOT EXISTS never alters a table that already exists, so any
    // column added later needs its own ALTER — the trap that left hero_slides
    // without image_ar.
    for (const [col, ddl] of [
        ['country_name_ar', 'VARCHAR(120)'],
        ['is_active', 'TINYINT(1) NOT NULL DEFAULT 1'],
        ['order_index', 'INT NOT NULL DEFAULT 0'],
    ]) {
        try { await db.query(`ALTER TABLE delivery_zones ADD COLUMN ${col} ${ddl}`); }
        catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
    }

    const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM delivery_zones');
    if (count === 0) {
        await db.query(
            `INSERT INTO delivery_zones (country_code, country_name, country_name_ar, extra_days, order_index)
             VALUES ${DEFAULT_ZONES.map(() => '(?,?,?,?,?)').join(',')}`,
            DEFAULT_ZONES.flat()
        );
        console.log(`[DeliveryZones] Seeded ${DEFAULT_ZONES.length} default zones`);
    }

    tableReady = true;
};

// @desc    Zones a shopper can pick from
// @route   GET /api/v1/delivery-zones
exports.listZones = async (req, res, next) => {
    try {
        await ensureTable();
        const [rows] = await db.query(
            `SELECT country_code, country_name, country_name_ar, extra_days
             FROM delivery_zones WHERE is_active = 1
             ORDER BY order_index ASC, country_name ASC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        // A product page must still render its default promise if this fails.
        console.error('[DeliveryZones] list failed:', error.message);
        res.json({ success: true, data: [] });
    }
};

// @desc    Every zone, active or not
// @route   GET /api/v1/delivery-zones/admin
exports.listAllZones = async (req, res, next) => {
    try {
        await ensureTable();
        const [rows] = await db.query(
            'SELECT * FROM delivery_zones ORDER BY order_index ASC, country_name ASC'
        );
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
};

// @desc    Create or update a zone, keyed on its country code
// @route   POST /api/v1/delivery-zones
exports.upsertZone = async (req, res, next) => {
    try {
        await ensureTable();
        const code = String(req.body.country_code || '').trim().toUpperCase().slice(0, 2);
        const name = String(req.body.country_name || '').trim();
        const extra = Number(req.body.extra_days);

        if (!/^[A-Z]{2}$/.test(code)) {
            return res.status(400).json({ success: false, message: 'A two-letter country code is required.' });
        }
        if (!name) {
            return res.status(400).json({ success: false, message: 'A country name is required.' });
        }
        // A negative offset would promise delivery before the product is ready, and
        // a year is well past the point where a date is a useful promise.
        if (!Number.isInteger(extra) || extra < 0 || extra > 365) {
            return res.status(400).json({ success: false, message: 'Extra days must be between 0 and 365.' });
        }

        await db.query(
            `INSERT INTO delivery_zones (country_code, country_name, country_name_ar, extra_days, is_active, order_index)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                country_name = VALUES(country_name),
                country_name_ar = VALUES(country_name_ar),
                extra_days = VALUES(extra_days),
                is_active = VALUES(is_active),
                order_index = VALUES(order_index)`,
            [
                code,
                name.slice(0, 120),
                String(req.body.country_name_ar || '').trim().slice(0, 120) || null,
                extra,
                req.body.is_active === false || req.body.is_active === 0 ? 0 : 1,
                Number.isInteger(Number(req.body.order_index)) ? Number(req.body.order_index) : 0,
            ]
        );

        const [[zone]] = await db.query('SELECT * FROM delivery_zones WHERE country_code = ?', [code]);
        res.json({ success: true, data: zone });
    } catch (error) { next(error); }
};

// @desc    Remove a zone
// @route   DELETE /api/v1/delivery-zones/:code
exports.deleteZone = async (req, res, next) => {
    try {
        await ensureTable();
        const code = String(req.params.code || '').trim().toUpperCase().slice(0, 2);
        const [result] = await db.query('DELETE FROM delivery_zones WHERE country_code = ?', [code]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Zone not found' });
        }
        res.json({ success: true, message: 'Zone removed' });
    } catch (error) { next(error); }
};
