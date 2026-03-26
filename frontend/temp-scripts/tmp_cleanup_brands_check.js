const mysql = require('mysql2/promise');

function normalize(name) {
    return name.toLowerCase().replace(/[\s\-_]/g, '');
}

async function cleanupBrands() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'mariot_b2b'
        });

        const [brands] = await db.query('SELECT * FROM brands');

        const groups = {};
        brands.forEach(b => {
            const key = normalize(b.name);
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });

        const mergeActions = [];
        for (const key in groups) {
            const group = groups[key];
            if (group.length > 1) {
                // Find the best one in group (has image or description)
                const best = group.sort((a, b) => {
                    const aScore = (a.image_url ? 2 : 0) + (a.description ? 1 : 0);
                    const bScore = (b.image_url ? 2 : 0) + (b.description ? 1 : 0);
                    if (aScore !== bScore) return bScore - aScore;
                    return b.id - a.id; // Keep newer if scores are equal
                })[0];

                const redundancies = group.filter(b => b.id !== best.id);
                mergeActions.push({ best, redundancies });
            }
        }

        if (mergeActions.length === 0) {
            console.log('No duplicate brand names found through normalization.');
        } else {
            console.log(`Found ${mergeActions.length} groups of potential duplicate brands.`);
            for (const action of mergeActions) {
                console.log(`- KEEP: "${action.best.name}" (ID: ${action.best.id})`);
                action.redundancies.forEach(r => {
                    console.log(`  - REMOVE: "${r.name}" (ID: ${r.id})`);
                });
            }
        }

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

cleanupBrands();
