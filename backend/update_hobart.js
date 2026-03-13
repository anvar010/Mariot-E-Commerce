require('dotenv').config({ path: 'd:/MARIOT/backend/.env' });
const mysql = require('mysql2/promise');

const missingBrands = [
    { name: "Hobart", about: "Hobart is an iconic, deeply historical American manufacturer absolutely renowned for producing practically indestructible commercial kitchen equipment. Famous worldwide for their legendary, massive-torque planetary mixers and highly advanced, heavy-duty commercial dishwashing systems, Hobart machines form the absolute, unbreakable foundation of enormous industrial bakeries, busy pizzerias, and massive catering facilities that simply cannot afford equipment failure." }
];

(async () => {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        for (const brand of missingBrands) {
            console.log(`Updating brand: ${brand.name}`);
            const [result] = await conn.query('UPDATE brands SET description = ? WHERE name COLLATE utf8mb4_general_ci LIKE ?', [brand.about, `%${brand.name}%`]);
            if (result.affectedRows === 0) {
                console.log(`Brand not found by exact match: ${brand.name}, trying broader match.`);
                const [result2] = await conn.query('UPDATE brands SET description = ? WHERE name COLLATE utf8mb4_general_ci LIKE ?', [brand.about, `%${brand.name.split(' ')[0]}%`]);
                if (result2.affectedRows > 0) {
                    console.log(`Updated ${brand.name} via broader match.`);
                } else {
                    console.error(`Could not update description for ${brand.name}`);
                }
            } else {
                console.log(`Successfully updated ${brand.name}`);
            }
        }
        console.log("Finished updating Hobart.");

    } catch (err) {
        console.error(err);
    } finally {
        if (conn) await conn.end();
    }
})();
