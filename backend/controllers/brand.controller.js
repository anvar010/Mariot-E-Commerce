const Brand = require('../models/brand.model');
const slugify = require('slugify');

exports.getBrands = async (req, res, next) => {
    try {
        const { category } = req.query;
        let brands;
        if (category) {
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
        const data = {
            ...req.body,
            slug: slugify(req.body.name, { lower: true })
        };
        const id = await Brand.create(data);
        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: { id, ...data }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateBrand = async (req, res, next) => {
    try {
        if (req.body.name) {
            req.body.slug = slugify(req.body.name, { lower: true });
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
