const db = require('./config/db');

async function featureAllProducts() {
    try {
        console.log('Starting to update all products to featured...');
        const [result] = await db.execute('UPDATE products SET is_featured = 1');
        console.log(`SUCCESS: Updated ${result.affectedRows} products to be featured.`);
        process.exit(0);
    } catch (err) {
        console.error('ERROR updating products:', err.message);
        process.exit(1);
    }
}

featureAllProducts();
