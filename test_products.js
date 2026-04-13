const Product = require('./backend/models/product.model');
const db = require('./backend/config/db');

async function testQuery() {
    try {
        console.log("Testing Product.findAll with status='all'");
        const result = await Product.findAll({
            status: 'all',
            limit: 10,
            page: 1,
            offset: 0
        });
        console.log("Found:", result.products.length);
        console.log("Total:", result.total);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

testQuery();
