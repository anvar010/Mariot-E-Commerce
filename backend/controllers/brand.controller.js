const Brand = require('../models/brand.model');
const generateUniqueSlug = require('../utils/generateSlug');

exports.getBrands = async (req, res, next) => {
    try {
        const { category, is_daily_offer } = req.query;
        const dailyOnly = is_daily_offer === '1' || is_daily_offer === 'true';
        let brands;
        if (dailyOnly) {
            brands = await Brand.findWithDailyOffers(category || null);
        } else if (category) {
            brands = await Brand.findByCategoryId(category);
        } else {
            brands = await Brand.findAll();
        }
        res.json({ success: true, data: brands });
    } catch (error) {
        next(error);
    }
};

exports.getBrand = async (req, res, next) => {
    try {
        const brand = await Brand.findBySlug(req.params.slug);
        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }
        res.json({ success: true, data: brand });
    } catch (error) {
        next(error);
    }
};

exports.createBrand = async (req, res, next) => {
    try {
        const slug = await generateUniqueSlug(req.body.name, 'brands');
        const data = {
            name: req.body.name,
            name_ar: req.body.name_ar || null,
            slug,
            image_url: req.body.image_url || null
        };
        const id = await Brand.create(data);
        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: { id, ...data }
        });
    } catch (error) {
        // Handle duplicate entry error gracefully
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: `Brand "${req.body.name}" already exists`
            });
        }
        next(error);
    }
};

exports.syncBrands = async (req, res, next) => {
    try {
        const { brands } = req.body;
        if (!brands || !Array.isArray(brands)) {
            return res.status(400).json({ success: false, message: 'Invalid brands data. Expected { brands: [...] }' });
        }

        let synced = 0;
        let failed = 0;
        const errors = [];

        for (const brand of brands) {
            try {
                const slug = await generateUniqueSlug(brand.name, 'brands');
                await Brand.upsert({
                    name: brand.name,
                    name_ar: brand.name_ar || null,
                    slug,
                    image_url: brand.image_url || brand.logo || null
                });
                synced++;
            } catch (err) {
                failed++;
                errors.push({ name: brand.name, error: err.message });
            }
        }

        const failedMsg = failed > 0 ? `, ${failed} failed` : '';
        res.json({
            success: true,
            message: `Synced ${synced} brands successfully${failedMsg}`,
            data: { synced, failed, errors: errors.length > 0 ? errors : undefined }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateBrand = async (req, res, next) => {
    try {
        if (req.body.name) {
            req.body.slug = await generateUniqueSlug(req.body.name, 'brands', req.params.id);
        }
        await Brand.update(req.params.id, req.body);
        res.json({ success: true, message: 'Brand updated' });
    } catch (error) {
        next(error);
    }
};

exports.deleteBrand = async (req, res, next) => {
    try {
        await Brand.delete(req.params.id);
        res.json({ success: true, message: 'Brand deleted' });
    } catch (error) {
        next(error);
    }
};

exports.deleteBrands = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'Invalid IDs' });
        }
        await Brand.bulkDelete(ids);
        res.json({ success: true, message: `Successfully deleted ${ids.length} brands` });
    } catch (error) {
        next(error);
    }
};
