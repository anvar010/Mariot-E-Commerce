const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Brand = require('../models/brand.model');
const db = require('../config/db'); // Fix: Import db
const slugify = require('slugify');
const ExcelJS = require('exceljs');
const fs = require('fs');

exports.bulkImport = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an excel file' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        // Convert ExcelJS rows to array of objects using header row
        const headers = [];
        const rows = [];
        worksheet.eachRow((row, rowNumber) => {
            const values = row.values; // ExcelJS row.values is 1-indexed (index 0 is empty)
            if (rowNumber === 1) {
                // First row = headers
                for (let i = 1; i < values.length; i++) {
                    headers.push(String(values[i] || '').trim());
                }
            } else {
                const obj = {};
                for (let i = 0; i < headers.length; i++) {
                    obj[headers[i]] = values[i + 1] !== undefined ? values[i + 1] : null;
                }
                rows.push(obj);
            }
        });

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Cache for category/brand IDs
        const categoryMap = {}; // Main Category Map
        const subCategoryMap = {}; // Sub Category Map (keyed by parentId:name)
        const subSubCategoryMap = {}; // Sub-Sub Category Map (keyed by parentId:name)
        const brandMap = {};

        // 1. Pre-resolve all categories and brands sequentially to avoid race conditions
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Resolve Main Category
            let mainId = null;
            const mainName = (row.category || row.Category || row.main_category)?.toString().trim();
            if (mainName) {
                if (!categoryMap[mainName]) {
                    let cat = await Category.findBySlug(slugify(mainName, { lower: true }));
                    if (!cat) {
                        mainId = await Category.create({ name: mainName, slug: slugify(mainName, { lower: true }), type: 'main_category' });
                    } else {
                        mainId = cat.id;
                    }
                    categoryMap[mainName] = mainId;
                } else {
                    mainId = categoryMap[mainName];
                }
            }

            // Resolve Sub Category
            let subId = null;
            const subName = (row.sub_category || row['sub category'] || row.product_group || row.Group)?.toString().trim();
            if (subName && mainId) {
                const mapKey = `${mainId}:${subName}`;
                if (!subCategoryMap[mapKey]) {
                    // Search for existing sub category under this parent
                    let [existing] = await db.query('SELECT id FROM categories WHERE name = ? AND parent_id = ? AND type = "sub_category"', [subName, mainId]);
                    if (existing.length === 0) {
                        subId = await Category.create({ name: subName, slug: slugify(subName, { lower: true }), type: 'sub_category', parent_id: mainId });
                    } else {
                        subId = existing[0].id;
                    }
                    subCategoryMap[mapKey] = subId;
                } else {
                    subId = subCategoryMap[mapKey];
                }
            }

            // Resolve Sub-Sub Category
            let subSubId = null;
            const subSubName = (row.sub_sub_category || row['sub sub category'] || row.final_sub_category)?.toString().trim();
            if (subSubName && subId) {
                const mapKey = `${subId}:${subSubName}`;
                if (!subSubCategoryMap[mapKey]) {
                    let [existing] = await db.query('SELECT id FROM categories WHERE name = ? AND parent_id = ? AND type = "sub_sub_category"', [subSubName, subId]);
                    if (existing.length === 0) {
                        subSubId = await Category.create({ name: subSubName, slug: slugify(subSubName, { lower: true }), type: 'sub_sub_category', parent_id: subId });
                    } else {
                        subSubId = existing[0].id;
                    }
                    subSubCategoryMap[mapKey] = subSubId;
                } else {
                    subSubId = subSubCategoryMap[mapKey];
                }
            }

            if (row.brand) {
                const brandName = row.brand.trim();
                if (!brandMap[brandName]) {
                    let brand = await Brand.findBySlug(slugify(brandName, { lower: true }));
                    if (!brand) {
                        const newId = await Brand.create({ name: brandName, slug: slugify(brandName, { lower: true }) });
                        brandMap[brandName] = newId;
                    } else {
                        brandMap[brandName] = brand.id;
                    }
                }
            }
        }

        // 2. Process products in chunks concurrently
        const CHUNK_SIZE = 10;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);

            await Promise.all(chunk.map(async (row, index) => {
                const rowIndex = i + index;
                try {
                    // Basic validation
                    if (!row.name || !row.price) {
                        throw new Error(`Row ${rowIndex + 2}: Missing mandatory fields (name or price)`);
                    }

                    const mainName = (row.category || row.Category || row.main_category)?.toString().trim();
                    const subName = (row.sub_category || row['sub category'] || row.product_group || row.Group)?.toString().trim();
                    const subSubName = (row.sub_sub_category || row['sub sub category'] || row.final_sub_category)?.toString().trim();

                    const categoryId = mainName ? categoryMap[mainName] : null;
                    const subCategoryId = (categoryId && subName) ? subCategoryMap[`${categoryId}:${subName}`] : null;
                    const subSubCategoryId = (subCategoryId && subSubName) ? subSubCategoryMap[`${subCategoryId}:${subSubName}`] : null;

                    const brandId = row.brand ? brandMap[row.brand.trim()] : null;

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
                        sub_category_id: subCategoryId,
                        sub_sub_category_id: subSubCategoryId,
                        brand_id: brandId,
                        is_featured: row.is_featured === 1 || row.is_featured === true || String(row.is_featured).toLowerCase() === 'yes',
                        is_weekly_deal: row.is_weekly_deal === 1 || row.is_weekly_deal === true || String(row.is_weekly_deal).toLowerCase() === 'yes',
                        is_limited_offer: row.is_limited_offer === 1 || row.is_limited_offer === true || String(row.is_limited_offer).toLowerCase() === 'yes',
                        is_daily_offer: row.is_daily_offer === 1 || row.is_daily_offer === true || String(row.is_daily_offer).toLowerCase() === 'yes',
                        offer_start: row.offer_start || null,
                        offer_end: row.offer_end || null,
                        status: row.status || 'active',
                        product_group: subName || null,
                        sub_category: subSubName || null,
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
                    results.errors.push(`Row ${rowIndex + 2}: ${error.message}`);
                    console.error(`Import Error Row ${rowIndex + 2}:`, error);
                }
            }));
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
        const { category, brand, seller, minPrice, maxPrice, search, sort, page = 1, limit = 12, is_weekly_deal, is_limited_offer, is_featured, is_daily_offer, status, stockStatus } = req.query;
        const offset = (page - 1) * limit;

        const { products, total } = await Product.findAll({
            category, brand, seller, minPrice, maxPrice, search, sort, limit, offset, is_weekly_deal, is_limited_offer, is_featured, is_daily_offer, status, stockStatus
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
        console.error('GET PRODUCTS ERROR:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error fetching products',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
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

exports.deleteProducts = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'Invalid IDs' });
        }
        await Product.bulkDelete(ids);
        res.json({ success: true, message: `Successfully deleted ${ids.length} products` });
    } catch (error) {
        next(error);
    }
};

exports.getSuggestions = async (req, res, next) => {
    try {
        const { search } = req.query;
        if (!search || search.trim().length < 2) {
            return res.json({ success: true, data: [] });
        }

        // Fetch matching products with limited fields for performance
        const { products } = await Product.findAll({
            search: search.trim(),
            limit: 8,
            status: 'active',
            stockStatus: 'in_stock'
        });

        const suggestions = products.map(p => ({
            id: p.id,
            name: p.name,
            model: p.model,
            slug: p.slug,
            price: p.price,
            offer_price: p.offer_price,
            primary_image: p.primary_image,
            category_name: p.category_name,
            type: 'product'
        }));

        // Fetch matching categories
        const [categories] = await db.query(
            'SELECT id, name, slug FROM categories WHERE name LIKE ? OR slug LIKE ? LIMIT 3',
            [`%${search.trim()}%`, `%${search.trim()}%`]
        );

        categories.forEach(c => {
            suggestions.push({
                id: c.id,
                name: c.name,
                slug: c.slug,
                type: 'category'
            });
        });

        // Fetch matching brands
        const [brands] = await db.query(
            'SELECT id, name, slug, image_url FROM brands WHERE name LIKE ? OR slug LIKE ? LIMIT 3',
            [`%${search.trim()}%`, `%${search.trim()}%`]
        );

        brands.forEach(b => {
            suggestions.push({
                id: b.id,
                name: b.name,
                slug: b.slug,
                primary_image: b.image_url,
                type: 'brand'
            });
        });

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        console.error('GET SUGGESTIONS ERROR:', error);
        res.status(500).json({ success: false, message: 'Error fetching suggestions' });
    }
};

