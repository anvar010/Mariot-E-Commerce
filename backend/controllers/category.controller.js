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
        const data = {
            ...req.body,
            slug: slugify(req.body.name, { lower: true })
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
        if (req.body.name) {
            req.body.slug = slugify(req.body.name, { lower: true });
        }
        await Category.update(req.params.id, req.body);
        res.json({ success: true, message: 'Category updated' });
    } catch (error) {
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
