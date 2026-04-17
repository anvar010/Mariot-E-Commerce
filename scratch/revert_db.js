const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mariot_b2b',
});

async function runRevert() {
    console.log("STARTING DATABASE REVERT...");
    try {
        // Find products updated recently (last hour)
        const [products] = await pool.query("SELECT id, name, category_id, sub_category_id FROM products WHERE updated_at > NOW() - INTERVAL 1 HOUR");
        console.log(`Found ${products.length} recently updated products to analyze for revert.`);

        let revertCount = 0;

        for (const product of products) {
            let prevMain = null;
            let prevSub = null;

            // Rule 1: It was an Oven/Cooker/etc moved to Cooking/Commercial Ovens
            if (/oven|combi|pizza|deck|convection|cooker|charbroiler|induction|griddle/i.test(product.name)) {
                prevMain = 1; // Coffee Makers (The old dump category)
                prevSub = null; 
            }
            // Rule 2: It was an Espresso/Coffee machine moved to Coffee Makers
            else if (/espresso|coffee|grinder|brewer/i.test(product.name)) {
                prevMain = 101; // Food Slicers (The other old dump category)
                prevSub = null;
            }

            if (prevMain && (product.category_id != prevMain || product.sub_category_id != prevSub)) {
                console.log(`Reverting [${product.id}] ${product.name} -> Back to Main: ${prevMain}, Sub: ${prevSub}`);
                
                await pool.query(
                    "UPDATE products SET category_id = ?, sub_category_id = ? WHERE id = ?",
                    [prevMain, prevSub, product.id]
                );
                revertCount++;
            }
        }

        console.log(`\nRevert successful. ${revertCount} products returned to previous state.`);
        process.exit(0);
    } catch (err) {
        console.error("Revert failed:", err);
        process.exit(1);
    }
}

runRevert();
