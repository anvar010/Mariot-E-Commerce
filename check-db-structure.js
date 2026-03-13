const path = require('path');
const db = require(path.join('d:', 'MARIOT', 'backend', 'config', 'db'));

async function check() {
    try {
        console.log('--- reviews table ---');
        const [reviewsCols] = await db.execute('DESCRIBE reviews');
        console.log(reviewsCols.map(c => c.Field));

        console.log('--- products table ---');
        const [productsCols] = await db.execute('DESCRIBE products');
        console.log(productsCols.map(c => c.Field));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
