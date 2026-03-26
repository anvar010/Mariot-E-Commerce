require('dotenv').config();
const db = require('./config/db');
const Product = require('./models/product.model');

async function runTest() {
    try {
        console.log('--- Starting Multi-Image Product Test ---');

        // 1. Create a product with multiple images
        const testData = {
            name: 'Test Multi-Image Product ' + Date.now(),
            price: 299.99,
            stock_quantity: 50,
            images: [
                'http://example.com/main.jpg',
                'http://example.com/side.jpg',
                'http://example.com/back.jpg'
            ]
        };

        console.log('Action: Creating product with 3 images...');
        const productId = await Product.create(testData);
        console.log('✅ Product created with ID:', productId);

        // 2. Retrieve to verify
        console.log('Action: Fetching product to verify images...');
        const product = await Product.findById(productId);

        console.log('--- Results (Create) ---');
        console.log('Name:', product.name);
        console.log('Primary Image (from join):', product.primary_image);
        console.log('All Images count:', product.images.length);
        console.table(product.images.map(img => ({
            id: img.id,
            url: img.image_url,
            is_primary: img.is_primary
        })));

        if (product.images.length === 3) {
            console.log('🚀 CREATE TEST PASSED: 3 images found.');
        } else {
            console.error('❌ CREATE TEST FAILED: Image count mismatch.');
        }

        // 3. Update with new images
        console.log('\nAction: Updating product with 2 new images...');
        const updateData = {
            images: [
                'http://example.com/new_main.jpg',
                'http://example.com/new_extra.jpg'
            ]
        };
        await Product.update(productId, updateData);

        // 4. Verify update
        const updatedProduct = await Product.findById(productId);
        console.log('--- Results (Update) ---');
        console.log('All Images count:', updatedProduct.images.length);
        console.table(updatedProduct.images.map(img => ({
            id: img.id,
            url: img.image_url,
            is_primary: img.is_primary
        })));

        // 5. Verify findAll includes images
        console.log('\nAction: Testing findAll to verify image array inclusion...');
        const { products } = await Product.findAll({ limit: 10, offset: 0 });
        const listProduct = products.find(p => p.id === productId);

        if (listProduct && listProduct.images && listProduct.images.length === 2) {
            console.log('🚀 FINDALL TEST PASSED: Images array included in list view.');
        } else {
            console.error('❌ FINDALL TEST FAILED: Images array missing or incorrect in list view.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Test Error:', error);
        process.exit(1);
    }
}

runTest();
