const db = require('../config/db');
const slugify = require('slugify');
const ProductVariant = require('./productVariant.model');

class Product {
    static async findAll({ category, brand, seller, minPrice, maxPrice, search, sort, limit, offset, is_weekly_deal, is_limited_offer, is_featured, is_daily_offer, is_best_seller, status, stockStatus }) {
        let query = `
            SELECT p.*, 
            c.name as category_name, c.slug as category_slug,
            sc.name as sub_category_name,
            ssc.name as sub_sub_category_name,
            b.name as brand_name, b.name_ar as brand_name_ar, b.slug as brand_slug, b.image_url as brand_image, 
            s.name as seller_name, s.company_name as seller_company, s.id as seller_id,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
            COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = p.id), 0) as average_rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as total_reviews,
            COALESCE((SELECT SUM(quantity) FROM order_items WHERE product_id = p.id), 0) as sold_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories sc ON p.sub_category_id = sc.id
            LEFT JOIN categories ssc ON p.sub_sub_category_id = ssc.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN users s ON p.seller_id = s.id
        `;

        const whereClauses = [];
        const params = [];

        // Handle Status (Active/Draft)
        if (status === 'all') {
            // Admin: no mandatory is_active filter
        } else if (status) {
            whereClauses.push('p.status = ?');
            params.push(status);
            whereClauses.push('p.is_active = 1');
        } else {
            // Public: only active/null status AND is_active = 1
            whereClauses.push("(p.status = 'active' OR p.status IS NULL)");
            whereClauses.push('p.is_active = 1');
        }

        if (stockStatus === 'in_stock') {
            whereClauses.push('(p.stock_quantity > 0 OR p.track_inventory = 0)');
        } else if (stockStatus === 'out_of_stock') {
            whereClauses.push('(p.stock_quantity <= 0 AND p.track_inventory = 1)');
        }

        const isTrue = (val) => val === 'true' || val === 1 || val === '1' || val === true;

        if (is_weekly_deal !== undefined && isTrue(is_weekly_deal)) {
            whereClauses.push('p.is_weekly_deal = 1');
            whereClauses.push('p.is_limited_offer = 0');
            whereClauses.push('p.offer_end IS NOT NULL AND p.offer_end > NOW()');
        }
        if (is_limited_offer !== undefined && isTrue(is_limited_offer)) {
            whereClauses.push('p.is_limited_offer = 1');
            whereClauses.push('p.is_weekly_deal = 0');
            whereClauses.push('p.offer_end IS NOT NULL AND p.offer_end > NOW()');
        }
        if (is_featured !== undefined && isTrue(is_featured)) {
            whereClauses.push('p.is_featured = 1');
        }
        if (is_daily_offer !== undefined && isTrue(is_daily_offer)) {
            whereClauses.push('p.is_daily_offer = 1');
            whereClauses.push('p.offer_end IS NOT NULL AND p.offer_end > NOW()');
        }
        if (is_best_seller !== undefined && isTrue(is_best_seller)) {
            whereClauses.push('p.is_best_seller = 1');
        }

        if (category) {
            if (category === 'uncategorised') {
                whereClauses.push('(p.category_id IS NULL OR p.category_id = 0)');
            } else {
                // Collect the matched category ID and all its descendants
                const [catRows] = await db.execute(
                    'SELECT id FROM categories WHERE slug = ? OR id = ? LIMIT 1',
                    [category, category]
                );
            if (catRows.length > 0) {
                const rootId = catRows[0].id;
                const [allCatRows] = await db.execute(
                    'SELECT id FROM categories WHERE id = ? OR parent_id = ? OR parent_id IN (SELECT id FROM categories WHERE parent_id = ?)',
                    [rootId, rootId, rootId]
                );
                const catIds = allCatRows.map(r => r.id);
                const placeholders = catIds.map(() => '?').join(',');
                whereClauses.push(`(p.category_id IN (${placeholders}) OR p.sub_category_id IN (${placeholders}) OR p.sub_sub_category_id IN (${placeholders}))`);
                params.push(...catIds, ...catIds, ...catIds);
            } else {
                const categoryPattern = category.replace(/-/g, '%');
                whereClauses.push('(c.slug = ? OR sc.slug = ? OR ssc.slug = ? OR p.product_group LIKE ? OR p.sub_category LIKE ?)');
                params.push(category, category, category, categoryPattern, categoryPattern);
            }
            }
        }
        if (brand) {
            const brandList = String(brand).split(',').map(s => s.trim()).filter(Boolean);
            if (brandList.length > 0) {
                const placeholders = brandList.map(() => '?').join(',');
                whereClauses.push(`(b.slug IN (${placeholders}) OR b.id IN (${placeholders}))`);
                params.push(...brandList, ...brandList);
            }
        }
        if (seller) {
            if (seller === 'admin') {
                whereClauses.push('p.seller_id IS NULL');
            } else {
                whereClauses.push('p.seller_id = ?');
                params.push(seller);
            }
        }
        if (minPrice) {
            whereClauses.push('p.price >= ?');
            params.push(minPrice);
        }
        if (maxPrice) {
            whereClauses.push('p.price <= ?');
            params.push(maxPrice);
        }
        if (search) {
            const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);
            if (searchWords.length > 0) {
                const wordConditions = searchWords.map(originalWord => {
                    // Match at start of string OR after a space
                    const wordsToMatch = [originalWord];

                    if (originalWord.length > 3 && originalWord.endsWith('s')) {
                        let singular = originalWord.slice(0, -1);
                        if (originalWord.endsWith('ies')) singular = originalWord.slice(0, -3) + 'y';
                        wordsToMatch.push(singular);
                    } else if (originalWord.length > 3 && !originalWord.endsWith('s')) {
                        wordsToMatch.push(originalWord + 's');
                    }

                    const subConditions = [];
                    for (const word of wordsToMatch) {
                        const wordParams = [];
                        for (let i = 0; i < 8; i++) {
                            wordParams.push(`${word}%`, `% ${word}%`);
                        }
                        params.push(...wordParams);
                        subConditions.push('(' +
                            'p.name LIKE ? OR p.name LIKE ? OR ' +
                            'p.name_ar LIKE ? OR p.name_ar LIKE ? OR ' +
                            'c.name LIKE ? OR c.name LIKE ? OR ' +
                            'p.product_group LIKE ? OR p.product_group LIKE ? OR ' +
                            'p.sub_category LIKE ? OR p.sub_category LIKE ? OR ' +
                            'b.name LIKE ? OR b.name LIKE ? OR ' +
                            'b.name_ar LIKE ? OR b.name_ar LIKE ? OR ' +
                            'p.model LIKE ? OR p.model LIKE ?' +
                            ')');
                    }
                    return '(' + subConditions.join(' OR ') + ')';
                });
                whereClauses.push('(' + wordConditions.join(' AND ') + ')');
            }
        }

        try {
            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }

            if (sort) {
                const allowedSorts = {
                    'price_asc': 'p.price ASC',
                    'price_desc': 'p.price DESC',
                    'newest': 'p.created_at DESC',
                    'name_asc': 'p.name ASC'
                };
                query += ` ORDER BY ${allowedSorts[sort] || 'p.created_at DESC'}`;
            } else {
                query += ' ORDER BY p.created_at DESC';
            }

            // Create a copy of params for the count query before adding limit/offset
            const countParams = [...params];

            // Inline LIMIT/OFFSET as safe integers to avoid "Incorrect arguments to mysqld_stmt_execute" on Aiven MySQL 8.x
            const safeLimit = parseInt(limit) || 12;
            const safeOffset = parseInt(offset) || 0;
            query += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

            // Use .query instead of .execute for fetching data (it is sometimes more robust with placeholders in complex queries)
            const [rows] = await db.query(query, params);

            // Fetch images for these products
            if (rows.length > 0) {
                const productIds = rows.map(p => p.id);
                const [images] = await db.query(
                    `SELECT * FROM product_images WHERE product_id IN (${productIds.join(',')})`
                );

                rows.forEach(p => {
                    p.images = images.filter(img => img.product_id === p.id);
                });

                // For products with variants enabled, override the displayed price /
                // offer_price / image / stock with the default variant's values
                // (or first variant if no default flagged). This makes promotion cards
                // and listings reflect what the customer actually sees on the detail
                // page, instead of the now-disabled top-level pricing.
                const variantProductIds = rows.filter(p => Number(p.has_variants) === 1).map(p => p.id);
                if (variantProductIds.length > 0) {
                    const [variantRows] = await db.query(
                        `SELECT product_id, price, offer_price, stock_quantity, image_url, use_primary_image, is_default, id
                         FROM product_variants
                         WHERE product_id IN (${variantProductIds.join(',')})
                         ORDER BY is_default DESC, id ASC`
                    );
                    // First row per product wins (default first, then lowest id).
                    const chosenByProduct = {};
                    for (const v of variantRows) {
                        if (!chosenByProduct[v.product_id]) chosenByProduct[v.product_id] = v;
                    }

                    // Build a label like "Red / Large" for each chosen variant by
                    // fetching its option-value rows in one batch. Used by the
                    // notify-me flow on listings so the card can subscribe the
                    // user to the specific variant they're seeing.
                    const chosenVariantIds = Object.values(chosenByProduct).map(v => v.id);
                    const labelByVariantId = {};
                    if (chosenVariantIds.length > 0) {
                        const [valRows] = await db.query(
                            `SELECT pvo.variant_id, pvo.value, po.position
                             FROM product_variant_options pvo
                             JOIN product_options po ON po.id = pvo.option_id
                             WHERE pvo.variant_id IN (${chosenVariantIds.join(',')})
                             ORDER BY po.position ASC, po.id ASC`
                        );
                        for (const vr of valRows) {
                            if (!labelByVariantId[vr.variant_id]) labelByVariantId[vr.variant_id] = [];
                            labelByVariantId[vr.variant_id].push(String(vr.value || '').trim());
                        }
                    }

                    rows.forEach(p => {
                        const v = chosenByProduct[p.id];
                        if (!v) return;
                        const parts = (labelByVariantId[v.id] || []).filter(Boolean);
                        if (parts.length > 0) p.variant_label = parts.join(' / ').slice(0, 255);
                        if (v.price !== null && v.price !== undefined) p.price = v.price;
                        if (v.offer_price !== null && v.offer_price !== undefined) p.offer_price = v.offer_price;
                        if (v.stock_quantity !== null && v.stock_quantity !== undefined) p.stock_quantity = v.stock_quantity;
                        // Recalculate discount_percentage from the variant. If the variant has a
                        // valid offer_price below its price, derive a fresh %; otherwise zero it
                        // out so the stale top-level discount badge doesn't leak through.
                        const vPrice = Number(v.price) || 0;
                        const vOffer = Number(v.offer_price) || 0;
                        if (vPrice > 0 && vOffer > 0 && vOffer < vPrice) {
                            p.discount_percentage = Math.round(((vPrice - vOffer) / vPrice) * 100);
                        } else {
                            p.discount_percentage = 0;
                        }
                        // Image: prefer the variant's own image; fall back to the product's primary image
                        // when the variant is flagged use_primary_image or has no image.
                        if (!Number(v.use_primary_image) && v.image_url) {
                            p.primary_image = v.image_url;
                        }
                    });
                }
            }

            // Count query
            let countQuery = `
                SELECT COUNT(*) as total FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LEFT JOIN categories sc ON p.sub_category_id = sc.id
                LEFT JOIN categories ssc ON p.sub_sub_category_id = ssc.id
                LEFT JOIN brands b ON p.brand_id = b.id
            `;
            if (whereClauses.length > 0) {
                countQuery += ' WHERE ' + whereClauses.join(' AND ');
            }
            const [countRows] = await db.query(countQuery, countParams);
            const total = countRows[0].total;

            return { products: rows, total };
        } catch (error) {
            console.error('DATABASE ERROR IN Product.findAll:', error);
            console.error('QUERY:', query);
            console.error('PARAMS:', JSON.stringify(params));
            throw error;
        }
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT p.*, 
            c.name as category_name, c.slug as category_slug,
            sc.name as sub_category_name,
            ssc.name as sub_sub_category_name,
            b.name as brand_name, b.name_ar as brand_name_ar, b.slug as brand_slug, b.image_url as brand_image, b.description as brand_description, b.description_ar as brand_description_ar,
            s.name as seller_name, s.company_name as seller_company, s.id as seller_id,
            COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = p.id), 0) as average_rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as total_reviews,
            COALESCE((SELECT SUM(quantity) FROM order_items WHERE product_id = p.id), 0) as sold_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories sc ON p.sub_category_id = sc.id
            LEFT JOIN categories ssc ON p.sub_sub_category_id = ssc.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN users s ON p.seller_id = s.id
            WHERE p.id = ? OR p.slug = ?
        `, [id, id]);

        if (rows.length > 0) {
            const product = rows[0];
            const [images] = await db.execute('SELECT * FROM product_images WHERE product_id = ?', [product.id]);
            product.images = images;

            // Enrich frequently_bought_together IDs with product data
            let fbtIds = [];
            if (product.frequently_bought_together) {
                try {
                    fbtIds = JSON.parse(product.frequently_bought_together);
                } catch (e) { fbtIds = []; }
            }
            if (Array.isArray(fbtIds) && fbtIds.length > 0) {
                const placeholders = fbtIds.map(() => '?').join(',');
                const [fbtRows] = await db.query(
                    `SELECT p.id, p.name, p.name_ar, p.slug, p.price, p.offer_price, p.discount_percentage,
                     (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
                     FROM products p WHERE p.id IN (${placeholders}) AND p.is_active = 1`,
                    fbtIds
                );
                product.frequently_bought_together_products = fbtRows;
            } else {
                product.frequently_bought_together_products = [];
            }

            // Enrich you_may_also_need IDs with product data
            let ymanIds = [];
            if (product.you_may_also_need) {
                try {
                    ymanIds = JSON.parse(product.you_may_also_need);
                } catch (e) { ymanIds = []; }
            }
            if (Array.isArray(ymanIds) && ymanIds.length > 0) {
                const placeholders = ymanIds.map(() => '?').join(',');
                const [ymanRows] = await db.query(
                    `SELECT p.id, p.name, p.name_ar, p.slug, p.price, p.offer_price, p.discount_percentage,
                     (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
                     FROM products p WHERE p.id IN (${placeholders}) AND p.is_active = 1`,
                    ymanIds
                );
                product.you_may_also_need_products = ymanRows;
            } else {
                product.you_may_also_need_products = [];
            }

            // Attach options + variants if any
            if (Number(product.has_variants) === 1) {
                const { options, variants } = await ProductVariant.getByProductId(product.id);
                product.options = options;
                product.variants = variants;
            } else {
                product.options = [];
                product.variants = [];
            }

            return product;
        }

        return null;
    }

    static async generateUniqueSlug(name, excludeId = null) {
        let baseSlug = slugify(name || 'product', { lower: true, remove: /[*+~.()'"!:@]/g });
        let slug = baseSlug;
        let counter = 1;

        while (true) {
            let query = 'SELECT id FROM products WHERE slug = ?';
            let params = [slug];

            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }

            const [rows] = await db.execute(query, params);

            if (rows.length === 0) {
                return slug;
            }

            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }

    static async create(data) {
        try {
            const name = String(data.name || '');
            const model = data.model ? String(data.model) : null;
            const youtube_video_link = data.youtube_video_link ? String(data.youtube_video_link) : null;
            const resources = data.resources ? String(data.resources) : null;
            const slug = await this.generateUniqueSlug(name);
            const name_ar = data.name_ar ? String(data.name_ar) : null;
            const description = data.description ? String(data.description) : null;
            const description_ar = data.description_ar ? String(data.description_ar) : null;
            const short_description = data.short_description ? String(data.short_description) : null;
            const short_description_ar = data.short_description_ar ? String(data.short_description_ar) : null;
            const specifications = data.specifications ? String(data.specifications) : null;
            const price = parseFloat(data.price) || 0;
            const discount_percentage = parseFloat(data.discount_percentage) || 0;
            const offer_price = data.offer_price ? parseFloat(data.offer_price) : (discount_percentage > 0 ? price - (price * discount_percentage / 100) : null);
            const stock_quantity = parseInt(data.stock_quantity) || 0;
            const category_id = (data.category_id && !isNaN(parseInt(data.category_id))) ? parseInt(data.category_id) : null;
            const sub_category_id = (data.sub_category_id && !isNaN(parseInt(data.sub_category_id))) ? parseInt(data.sub_category_id) : null;
            const sub_sub_category_id = (data.sub_sub_category_id && !isNaN(parseInt(data.sub_sub_category_id))) ? parseInt(data.sub_sub_category_id) : null;
            const brand_id = (data.brand_id && !isNaN(parseInt(data.brand_id))) ? parseInt(data.brand_id) : null;
            const isTrue = (val) => val === true || val === 'true' || val === 1 || val === '1';
            const is_featured = isTrue(data.is_featured) ? 1 : 0;
            let is_weekly_deal = isTrue(data.is_weekly_deal) ? 1 : 0;
            let is_limited_offer = isTrue(data.is_limited_offer) ? 1 : 0;
            const is_daily_offer = isTrue(data.is_daily_offer) ? 1 : 0;
            const is_best_seller = isTrue(data.is_best_seller) ? 1 : 0;
            const track_inventory = isTrue(data.track_inventory) ? 1 : 0;

            const status = data.status || 'active';
            const product_group = data.product_group || data.heading || null;
            const sub_category = data.sub_category || null;
            const seller_id = (data.seller_id && !isNaN(parseInt(data.seller_id))) ? parseInt(data.seller_id) : null;
            const offer_start = data.offer_start || null;
            const offer_end = data.offer_end || null;

            const params = [
                name, name_ar, slug, description, description_ar, short_description, short_description_ar,
                specifications, price, discount_percentage, offer_price, stock_quantity, track_inventory,
                category_id, sub_category_id, sub_sub_category_id, brand_id, seller_id,
                is_featured, is_weekly_deal, is_limited_offer, is_daily_offer, is_best_seller,
                status, product_group, sub_category, model, youtube_video_link, resources,
                offer_start, offer_end,
                data.frequently_bought_together ? String(data.frequently_bought_together) : null,
                data.you_may_also_need ? String(data.you_may_also_need) : null,
                (data.warranty !== undefined && data.warranty !== '' && data.warranty !== null) ? parseInt(data.warranty) : null,
                (data.warranty_ar !== undefined && data.warranty_ar !== '' && data.warranty_ar !== null) ? parseInt(data.warranty_ar) : null
            ].map(p => (p === undefined ? null : p));

            const [result] = await db.execute(
                'INSERT INTO products (name, name_ar, slug, description, description_ar, short_description, short_description_ar, specifications, price, discount_percentage, offer_price, stock_quantity, track_inventory, category_id, sub_category_id, sub_sub_category_id, brand_id, seller_id, is_featured, is_weekly_deal, is_limited_offer, is_daily_offer, is_best_seller, status, product_group, sub_category, model, youtube_video_link, resources, offer_start, offer_end, frequently_bought_together, you_may_also_need, warranty, warranty_ar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                params
            );

            const productId = result.insertId;

            // Handle multiple images
            if (data.images && Array.isArray(data.images)) {
                for (let i = 0; i < data.images.length; i++) {
                    await db.execute(
                        'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
                        [productId, data.images[i], i === 0 ? 1 : 0]
                    );
                }
            } else if (data.image_url) {
                // Fallback to single image_url if provided
                await db.execute(
                    'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
                    [productId, data.image_url, 1]
                );
            }

            if (Array.isArray(data.options) && Array.isArray(data.variants) && data.options.length > 0) {
                await this._persistVariants(productId, data.options, data.variants);
            }

            return productId;
        } catch (error) {
            console.error('Database Error in Product.create:', error);
            throw error;
        }
    }

    static async _persistVariants(productId, options, variants) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await ProductVariant.saveForProduct(conn, productId, options, variants);
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            console.error('Failed to persist variants for product', productId, error);
            throw error;
        } finally {
            conn.release();
        }
    }

    static async update(id, data) {
        const allowedColumns = [
            'name', 'name_ar', 'description', 'description_ar', 'short_description', 'short_description_ar',
            'specifications', 'price', 'discount_percentage', 'offer_price', 'stock_quantity',
            'track_inventory', 'category_id', 'sub_category_id', 'sub_sub_category_id', 'brand_id',
            'seller_id', 'is_featured', 'is_weekly_deal', 'is_limited_offer', 'is_daily_offer',
            'is_best_seller', 'status', 'product_group', 'sub_category', 'model',
            'youtube_video_link', 'resources', 'offer_start', 'offer_end',
            'frequently_bought_together', 'you_may_also_need', 'warranty', 'warranty_ar'
        ];

        const productId = parseInt(id);
        if (isNaN(productId)) {
            throw new Error('Invalid product ID');
        }

        const cleanData = {};

        if (data.name) {
            const newSlug = await this.generateUniqueSlug(data.name, productId);
            const [currentRows] = await db.execute('SELECT slug FROM products WHERE id = ?', [productId]);

            if (currentRows.length > 0 && currentRows[0].slug === newSlug) {
                console.log(`SLUG_UPDATE_SKIP: Slug "${newSlug}" matches current. Skipping update.`);
            } else {
                cleanData.slug = newSlug;
            }
        }

        Object.keys(data).forEach(key => {
            if (allowedColumns.includes(key) && data[key] !== undefined && key !== 'slug') {
                if (['is_featured', 'is_weekly_deal', 'is_limited_offer', 'is_daily_offer', 'is_active', 'track_inventory'].includes(key)) {
                    const val = data[key];
                    cleanData[key] = (val === true || val === 'true' || val === 1 || val === '1') ? 1 : 0;
                } else if (['category_id', 'sub_category_id', 'sub_sub_category_id', 'brand_id'].includes(key)) {
                    // Handle numeric foreign keys: empty string or null -> null
                    const val = data[key];
                    if (val === '' || val === null || val === undefined) {
                        cleanData[key] = null;
                    } else {
                        const parsed = parseInt(val);
                        cleanData[key] = isNaN(parsed) ? null : parsed;
                    }
                } else if (['offer_start', 'offer_end'].includes(key)) {
                    // Handle datetime columns: empty string -> null (strict MySQL rejects '')
                    cleanData[key] = (data[key] && data[key] !== '') ? data[key] : null;
                } else if (['offer_price', 'price', 'discount_percentage', 'stock_quantity', 'warranty', 'warranty_ar'].includes(key)) {
                    // Handle numeric columns: empty string -> null
                    const val = data[key];
                    if (val === '' || val === null || val === undefined) {
                        cleanData[key] = null;
                    } else {
                        const parsed = parseFloat(val);
                        cleanData[key] = isNaN(parsed) ? null : parsed;
                    }
                } else {
                    cleanData[key] = data[key] === null ? null : data[key];
                }
            }
        });

        if (cleanData.is_weekly_deal === 1) {
            cleanData.is_limited_offer = 0;
        } else if (cleanData.is_limited_offer === 1) {
            cleanData.is_weekly_deal = 0;
        }

        // Handle images update
        if (data.images && Array.isArray(data.images)) {
            // Option 1: Replace all images (simpler for now)
            await db.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);
            for (let i = 0; i < data.images.length; i++) {
                await db.execute(
                    'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
                    [productId, data.images[i], i === 0 ? 1 : 0]
                );
            }
        } else if (data.image_url) {
            // Fallback: update/set primary image
            const [existing] = await db.execute(
                'SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1',
                [productId]
            );

            if (existing.length > 0) {
                await db.execute(
                    'UPDATE product_images SET image_url = ? WHERE product_id = ? AND is_primary = 1',
                    [data.image_url, productId]
                );
            } else {
                await db.execute(
                    'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, 1)',
                    [productId, data.image_url]
                );
            }
        }

        if (Object.keys(cleanData).length > 0) {
            const fields = Object.keys(cleanData).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(cleanData), productId];
            await db.execute(`UPDATE products SET ${fields} WHERE id = ?`, values);
        }

        // Persist variants if payload includes them. An empty variants array clears them.
        if (Array.isArray(data.options) && Array.isArray(data.variants)) {
            await this._persistVariants(productId, data.options, data.variants);
        }
    }

    static async bulkUpdate(ids, data) {
        if (!Array.isArray(ids) || ids.length === 0) return;

        const allowedColumns = [
            'is_featured', 'is_weekly_deal', 'is_limited_offer', 'is_daily_offer',
            'is_active', 'status', 'offer_start', 'offer_end', 'discount_percentage', 'price'
        ];

        const cleanData = {};
        Object.keys(data).forEach(key => {
            if (allowedColumns.includes(key) && data[key] !== undefined) {
                if (['is_featured', 'is_weekly_deal', 'is_limited_offer', 'is_daily_offer', 'is_active'].includes(key)) {
                    const val = data[key];
                    cleanData[key] = (val === true || val === 'true' || val === 1 || val === '1') ? 1 : 0;
                } else if (['offer_start', 'offer_end'].includes(key)) {
                    // Handle datetime columns: empty string -> null (strict MySQL rejects '')
                    cleanData[key] = (data[key] && data[key] !== '') ? data[key] : null;
                } else if (['discount_percentage', 'price'].includes(key)) {
                    // Handle numeric columns: empty string -> null
                    const val = data[key];
                    if (val === '' || val === null || val === undefined) {
                        cleanData[key] = null;
                    } else {
                        const parsed = parseFloat(val);
                        cleanData[key] = isNaN(parsed) ? null : parsed;
                    }
                } else {
                    cleanData[key] = data[key];
                }
            }
        });

        if (Object.keys(cleanData).length === 0) return;

        const fields = Object.keys(cleanData).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(cleanData)];

        // Use placeholders for IDs
        const placeholders = ids.map(() => '?').join(',');
        const query = `UPDATE products SET ${fields} WHERE id IN (${placeholders})`;

        await db.execute(query, [...values, ...ids]);
    }

    static async delete(id) {
        // Perform a hard delete as requested. 
        // Note: product_images, cart_items, and order_items will be deleted automatically due to ON DELETE CASCADE constraints.
        await db.execute('DELETE FROM products WHERE id = ?', [id]);
    }

    static async bulkDelete(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(`DELETE FROM products WHERE id IN (${placeholders})`, ids);
    }
}

module.exports = Product;
