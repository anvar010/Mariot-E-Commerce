const Category = require('../models/category.model');
const slugify = require('slugify');

exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Category.findAll();
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
        const { name, name_ar, description, image_url, is_active, parent_id, type, brands } = req.body;
        const data = {
            name,
            name_ar: name_ar || null,
            slug: slugify(name, { lower: true }),
            description: description || null,
            image_url: image_url || null,
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
        console.log('=== UPDATE CATEGORY ===');
        console.log('ID:', req.params.id);
        console.log('Body:', JSON.stringify(req.body));
        const updateData = { ...req.body };
        if (updateData.name) {
            updateData.slug = slugify(updateData.name, { lower: true });
        }
        if (updateData.parent_id === '') updateData.parent_id = null;
        console.log('Final updateData:', JSON.stringify(updateData));
        await Category.update(req.params.id, updateData);
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
