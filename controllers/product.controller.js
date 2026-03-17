const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Brand = require('../models/brand.model');
const slugify = require('slugify');
const xlsx = require('xlsx');
const fs = require('fs');

exports.bulkImport = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an excel file' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Cache for category/brand IDs
        const categoryMap = {};
        const brandMap = {};

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                // Basic validation
                if (!row.name || !row.price) {
                    throw new Error(`Row ${i + 2}: Missing mandatory fields (name or price)`);
                }

                // Get or create Category
                let categoryId = null;
                if (row.category) {
                    const catName = row.category.trim();
                    if (!categoryMap[catName]) {
                        let cat = await Category.findBySlug(slugify(catName, { lower: true }));
                        if (!cat) {
                            const newId = await Category.create({
                                name: catName,
                                slug: slugify(catName, { lower: true })
                            });
                            categoryMap[catName] = newId;
                        } else {
                            categoryMap[catName] = cat.id;
                        }
                    }
                    categoryId = categoryMap[catName];
                }

                // Get or create Brand
                let brandId = null;
                if (row.brand) {
                    const brandName = row.brand.trim();
                    if (!brandMap[brandName]) {
                        let brand = await Brand.findBySlug(slugify(brandName, { lower: true }));
                        if (!brand) {
                            const newId = await Brand.create({
                                name: brandName,
                                slug: slugify(brandName, { lower: true })
                            });
                            brandMap[brandName] = newId;
                        } else {
                            brandMap[brandName] = brand.id;
                        }
                    }
                    brandId = brandMap[brandName];
                }

                // Process images if comma separated
                let images = [];
                if (row.images) {
                    if (typeof row.images === 'string') {
                        images = row.images.split(',').map(img => img.trim());
                    } else {
                        images = [String(row.images)];
                    }
                }

                // Prepare product data
                const productData = {
                    name: row.name,
                    name_ar: row.name_ar,
                    description: row.description,
                    description_ar: row.description_ar,
                    short_description: row.short_description || row['short description'],
                    short_description_ar: row.short_description_ar || row['short description ar'],
                    specifications: row.specifications,
                    price: row.price,
                    discount_percentage: row.discount_percentage || 0,
                    stock_quantity: row.stock_quantity || 0,
                    category_id: categoryId,
                    brand_id: brandId,
                    is_featured: row.is_featured === 1 || row.is_featured === true || String(row.is_featured).toLowerCase() === 'yes',
                    is_weekly_deal: row.is_weekly_deal === 1 || row.is_weekly_deal === true || String(row.is_weekly_deal).toLowerCase() === 'yes',
                    is_limited_offer: row.is_limited_offer === 1 || row.is_limited_offer === true || String(row.is_limited_offer).toLowerCase() === 'yes',
                    is_daily_offer: row.is_daily_offer === 1 || row.is_daily_offer === true || String(row.is_daily_offer).toLowerCase() === 'yes',
                    offer_start: row.offer_start || null,
                    offer_end: row.offer_end || null,
                    status: row.status || 'active',
                    product_group: row.product_group || row.group || row.heading,
                    sub_category: row.sub_category,
                    model: row.model,
                    youtube_video_link: row.youtube_video_link ? (String(row.youtube_video_link).startsWith('{') ? row.youtube_video_link : JSON.stringify({ links: [row.youtube_video_link], featuredIndex: 0 })) : null,
                    resources: row.resources ? (String(row.resources).startsWith('[') ? row.resources : JSON.stringify(String(row.resources).split(',').map(r => {
                        const parts = r.split(':');
                        return { name: parts.length > 1 ? parts[0].trim() : 'Download', url: (parts.length > 1 ? parts[1] : parts[0]).trim() };
                    }))) : null,
                    images: images
                };

                await Product.create(productData);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row ${i + 2}: ${error.message}`);
                console.error(`Import Error Row ${i + 2}:`, error);
            }
        }

        // Cleanup
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        next(error);
    }
};

exports.getProducts = async (req, res, next) => {
    try {
        console.log('GET PRODUCTS QUERY:', JSON.stringify(req.query));
        const { category, brand, seller, minPrice, maxPrice, search, sort, page = 1, limit = 12, is_weekly_deal, is_limited_offer, is_featured, is_daily_offer, is_best_seller, status, stockStatus } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { products, total } = await Product.findAll({
            category, brand, seller, minPrice, maxPrice, search, sort, limit: parseInt(limit), offset, is_weekly_deal, is_limited_offer, is_featured, is_daily_offer, is_best_seller, status, stockStatus
        });

        res.json({
            success: true,
            count: products.length,
            total,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            },
            data: products
        });
    } catch (error) {
        next(error);
    }
};

exports.getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
};

exports.createProduct = async (req, res, next) => {
    try {
        console.log('CREATE PRODUCT BODY:', JSON.stringify(req.body));
        const id = await Product.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { id, ...req.body }
        });
    } catch (error) {
        next(error);
    }
};

exports.updateProduct = async (req, res, next) => {
    try {
        await Product.update(req.params.id, req.body);
        res.json({ success: true, message: 'Product updated' });
    } catch (error) {
        next(error);
    }
};

exports.deleteProduct = async (req, res, next) => {
    try {
        await Product.delete(req.params.id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        next(error);
    }
};

exports.bulkUpdateProducts = async (req, res, next) => {
    try {
        const { ids, data } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'Invalid IDs' });
        }
        await Product.bulkUpdate(ids, data);
        res.json({ success: true, message: `Successfully updated ${ids.length} products` });
    } catch (error) {
        next(error);
    }
};
