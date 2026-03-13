const db = require('./config/db');

async function cleanup() {
    try {
        console.log('Starting intelligent cleanup of similar brands...');

        // 1. Delete brands with NULL image_url if a similar brand (same first 5 characters or fuzzy match) exists with an image
        const [allBrands] = await db.query('SELECT id, name, image_url, brand_type FROM brands');

        const toDeleteIds = [];

        for (const b1 of allBrands) {
            if (!b1.image_url) {
                // Check if a similar brand with an image exists
                const b1Name = b1.name.toLowerCase().replace(/[^a-z0-9]/g, '');

                for (const b2 of allBrands) {
                    if (b2.image_url && b1.id !== b2.id) {
                        const b2Name = b2.name.toLowerCase().replace(/[^a-z0-9]/g, '');

                        // If one name is contained in the other and they are long enough (fuzzy match)
                        if (b1Name === b2Name ||
                            (b1Name.length > 3 && b2Name.includes(b1Name)) ||
                            (b2Name.length > 3 && b1Name.includes(b2Name))) {

                            // Prefer keeping b2 (has image)
                            toDeleteIds.push(b1.id);
                            console.log(`Marking for deletion: "${b1.name}" (ID ${b1.id}) - Match found: "${b2.name}" (ID ${b2.id})`);
                            break;
                        }
                    }
                }
            }
        }

        if (toDeleteIds.length > 0) {
            console.log(`Deleting ${toDeleteIds.length} duplicate/similar brands...`);
            await db.query('DELETE FROM brands WHERE id IN (?)', [toDeleteIds]);
        }

        // 2. Extra specific cleanups if needed
        const manualCleanup = [
            "Mariots", // "MARIOT" exists
            "Capinox, Empero", // "capinox" and "EMPERO" exist
            "Empero, Mariot",
            "LaCimbali",
            "ubermilk" // "UEBERMILK" exists
        ];

        for (const name of manualCleanup) {
            await db.query('DELETE FROM brands WHERE name = ?', [name]);
        }

        console.log('Cleanup finished.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
