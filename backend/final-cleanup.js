const db = require('./config/db');

async function finalCleanup() {
    try {
        console.log('Final specific cleanup...');

        const toDelete = [
            "Inofrigo",
            "Tecno Cooler",
            "Vito Oil Filter System",
            "Zemic Europe",
            "Fagor Professional",
            "PrinceCastle",
            "Gelmatic",
            "George Haddad",
            "Hamilton Beach USA",
            "Server USA",
            "Southbend USA",
            "Star Manufacturing USA",
            "Waring USA",
            "RM Gastro",
            "Motex",
            "Johny",
            "Falater",
            "GGF",
            "Blendec",
            "Mac Pan",
            "Mariots",
            "HOBART"
        ];

        for (const name of toDelete) {
            await db.query('DELETE FROM brands WHERE name = ?', [name]);
            console.log(`Deleted: ${name}`);
        }

        console.log('Cleanup finished.');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

finalCleanup();
