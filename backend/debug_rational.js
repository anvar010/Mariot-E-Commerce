require('dotenv').config({ path: 'd:/MARIOT/backend/.env' });
const mysql = require('mysql2/promise');

(async () => {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        // Lets check all brands matching rational
        const [rows] = await conn.query("SELECT id, name, SUBSTRING(description, 1, 50) as desc_preview FROM brands WHERE name LIKE '%Rational%' OR name LIKE '%RATIONAL%'");
        console.log("Rational Brands found:", rows);

        // check random product with brand RATIONAL
        const [products] = await conn.query("SELECT p.name, b.name as brandName, b.description FROM products p JOIN brands b on p.brand_id = b.id WHERE b.name LIKE '%Rational%' LIMIT 1");
        console.log("Example product query:", products);

    } catch (err) {
        console.error(err);
    } finally {
        if (conn) await conn.end();
    }
})();
