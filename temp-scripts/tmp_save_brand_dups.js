const mysql = require('mysql2/promise');
const fs = require('fs');

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

        let output = '';
        const mergeActions = [];
        for (const key in groups) {
            const group = groups[key];
            if (group.length > 1) {
                const best = group.sort((a, b) => {
                    const aScore = (a.image_url ? 2 : 0) + (a.description ? 1 : 0);
                    const bScore = (b.image_url ? 2 : 0) + (b.description ? 1 : 0);
                    if (aScore !== bScore) return bScore - aScore;
                    return b.id - a.id;
                })[0];

                const redundancies = group.filter(b => b.id !== best.id);
                mergeActions.push({ best, redundancies });
                output += `- KEEP: "${best.name}" (ID: ${best.id})\n`;
                redundancies.forEach(r => output += `  - REMOVE: "${r.name}" (ID: ${r.id})\n`);
            }
        }

        fs.writeFileSync('brand_dups_full.txt', output);
        console.log('Saved to brand_dups_full.txt');

        await db.end();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

cleanupBrands();
