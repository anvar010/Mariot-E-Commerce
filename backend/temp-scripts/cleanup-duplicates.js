const db = require('./config/db');

async function cleanup() {
    try {
        console.log('Searching for duplicates...');

        // Find brands with duplicate names (case-insensitive)
        const [duplicates] = await db.query(`
            SELECT name, COUNT(*) as count 
            FROM brands 
            GROUP BY LOWER(TRIM(name)) 
            HAVING count > 1
        `);

        if (duplicates.length === 0) {
            console.log('No duplicates found by name.');
        } else {
            console.log(`Found ${duplicates.length} duplicate names.`);

            for (const dup of duplicates) {
                const name = dup.name;
                console.log(`Cleaning up: "${name}"`);

                // Get all IDs for this name
                const [rows] = await db.query('SELECT id FROM brands WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) ORDER BY id ASC', [name]);

                if (rows.length > 1) {
                    const keepId = rows[0].id;
                    const deleteIds = rows.slice(1).map(r => r.id);

                    console.log(`Keeping ID: ${keepId}, Deleting IDs: ${deleteIds.join(', ')}`);

                    await db.query('DELETE FROM brands WHERE id IN (?)', [deleteIds]);
                }
            }
        }

        // Find brands with duplicate slugs
        const [slugDuplicates] = await db.query(`
            SELECT slug, COUNT(*) as count 
            FROM brands 
            GROUP BY slug 
            HAVING count > 1
        `);

        if (slugDuplicates.length > 0) {
            console.log(`Found ${slugDuplicates.length} duplicate slugs.`);
            for (const dup of slugDuplicates) {
                const slug = dup.slug;
                const [rows] = await db.query('SELECT id FROM brands WHERE slug = ? ORDER BY id ASC', [slug]);
                if (rows.length > 1) {
                    const keepId = rows[0].id;
                    const deleteIds = rows.slice(1).map(r => r.id);
                    await db.query('DELETE FROM brands WHERE id IN (?)', [deleteIds]);
                    console.log(`Slug "${slug}": Kept ID ${keepId}, Deleted ${deleteIds.length} extras.`);
                }
            }
        }

        console.log('Cleanup completed.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
