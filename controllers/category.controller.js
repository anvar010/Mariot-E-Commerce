const Category = require('../models/category.model');
const generateUniqueSlug = require('../utils/generateSlug');

exports.getCategories = async (req, res, next) => {
    try {
        const { brand, is_limited, is_weekly, search } = req.query;
        const isLimited = is_limited === '1' || is_limited === 'true';
        const isWeekly = is_weekly === '1' || is_weekly === 'true';
        const searchTerm = (search || '').trim();
        const categories = brand
            ? await Category.findByBrand(brand)
            : searchTerm
                ? await Category.findBySearch(searchTerm)
                : (isLimited || isWeekly)
                    ? await Category.findActiveByOffer({ is_limited_offer: isLimited, is_weekly_deal: isWeekly })
                    : await Category.findAll();
        res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

exports.getCategory = async (req, res, next) => {
    try {
        const category = await Category.findBySlug(req.params.slug);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const { name, name_ar, description, description_ar, image_url, banner_url, is_active, parent_id, type, brands } = req.body;
        const slug = await generateUniqueSlug(name, 'categories');
        const data = {
            name,
            name_ar: name_ar || null,
            slug,
            description: description || null,
            description_ar: description_ar || null,
            image_url: image_url || null,
            banner_url: banner_url || null,
            is_active: is_active !== undefined ? is_active : 1,
            parent_id: parent_id || null,
            type: type || 'main_category',
            brands: brands || []
        };
        const id = await Category.create(data);
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { id, ...data }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const id = req.params.id;
        const updateData = { ...req.body };
        if (updateData.name) {
            updateData.slug = await generateUniqueSlug(updateData.name, 'categories', id);
        }
        if (updateData.parent_id === '') updateData.parent_id = null;
        await Category.update(id, updateData);
        res.json({ success: true, message: 'Category updated' });
    } catch (error) {
        console.error('UPDATE ERROR:', error);
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        await Category.delete(req.params.id);
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        next(error);
    }
};
