
const mysql = require('mysql2/promise');
const dbConfig = { host: '127.0.0.1', user: 'root', password: '', database: 'mariot_b2b' };

async function run() {
    const connection = await mysql.createConnection(dbConfig);
    const [cats] = await connection.execute('SELECT id, name, parent_id, type FROM categories');

    // Index categories by name (lowercase) for fast lookup
    const catMap = {};
    cats.forEach(c => {
        const name = c.name.toLowerCase().trim();
        if (!catMap[name]) catMap[name] = [];
        catMap[name].push(c);
    });

    const [products] = await connection.execute('SELECT id, name, product_group, sub_category FROM products');
    console.log(`Analyzing ${products.length} products...`);

    let updates = 0;
    for (const p of products) {
        let bestMatch = null;
        const group = (p.product_group || '').toLowerCase().trim();
        const sub = (p.sub_category || '').toLowerCase().trim();
        const name = (p.name || '').toLowerCase().trim();

        // 1. Try to find match in sub (often more specific)
        if (sub && catMap[sub]) {
            bestMatch = catMap[sub][0];
        } else if (group && catMap[group]) {
            bestMatch = catMap[group][0];
        } else {
            // Fuzzy search for Ice, Coffee, etc. if no exact match
            if (name.includes('ice machine') || group.includes('ice')) {
                bestMatch = cats.find(c => c.name === 'Ice Equipment' && c.type === 'main_category');
            } else if (name.includes('coffee') || group.includes('coffee')) {
                bestMatch = cats.find(c => c.name === 'Coffee Makers' && c.type === 'main_category');
            }
        }

        if (bestMatch) {
            let catId = null;
            let subCatId = null;
            let subSubCatId = null;

            if (bestMatch.type === 'sub_sub_category') {
                subSubCatId = bestMatch.id;
                const parentSub = cats.find(c => c.id === bestMatch.parent_id);
                if (parentSub) {
                    subCatId = parentSub.id;
                    const parentMain = cats.find(c => c.id === parentSub.parent_id);
                    if (parentMain) catId = parentMain.id;
                }
            } else if (bestMatch.type === 'sub_category') {
                subCatId = bestMatch.id;
                const parentMain = cats.find(c => c.id === bestMatch.parent_id);
                if (parentMain) catId = parentMain.id;
            } else if (bestMatch.type === 'main_category') {
                catId = bestMatch.id;
            }

            await connection.execute(
                'UPDATE products SET category_id = ?, sub_category_id = ?, sub_sub_category_id = ? WHERE id = ?',
                [catId, subCatId, subSubCatId, p.id]
            );
            updates++;
        }
    }

    console.log(`Migration complete. Updated ${updates} products.`);
    await connection.end();
}
run();
