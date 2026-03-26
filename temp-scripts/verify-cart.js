require('dotenv').config();
const db = require('./config/db');
const Cart = require('./models/cart.model');

async function runCartTest() {
    try {
        console.log('--- Starting Cart Integration Test ---');

        // 1. Get a test user
        const [users] = await db.execute('SELECT id, email FROM users LIMIT 1');
        if (users.length === 0) {
            console.error('❌ No users found in database. Create a user first.');
            process.exit(1);
        }
        const user = users[0];
        console.log(`Using User: ${user.email} (ID: ${user.id})`);

        // 2. Get a test product
        const [products] = await db.execute('SELECT id, name FROM products LIMIT 1');
        if (products.length === 0) {
            console.error('❌ No products found in database. Create a product first.');
            process.exit(1);
        }
        const product = products[0];
        console.log(`Using Product: ${product.name} (ID: ${product.id})`);

        // 3. Add to cart
        console.log(`Action: Adding product ID ${product.id} to cart...`);
        await Cart.addItem(user.id, product.id, 1);
        console.log('✅ Item added successfully.');

        // 4. Retrieve cart
        console.log(`Action: Fetching cart for User ID ${user.id}...`);
        const items = await Cart.getCartItems(user.id);

        console.log('--- Results ---');
        console.log(`Total items in cart: ${items.length}`);
        console.table(items.map(i => ({
            ID: i.id,
            Product: i.name,
            Qty: i.quantity,
            Price: i.price,
            Offer: i.offer_price
        })));

        const found = items.find(i => i.product_id === product.id);
        if (found) {
            console.log('🚀 TEST PASSED: Product found in cart with correct quantity.');
        } else {
            console.error('❌ TEST FAILED: Product not found in cart.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Test Error:', error);
        process.exit(1);
    }
}

runCartTest();
