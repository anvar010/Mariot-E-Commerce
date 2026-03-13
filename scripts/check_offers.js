const path = require('path');
require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../backend/.env') });
const db = require(path.resolve(__dirname, '../backend/config/db'));

async function checkOffers() {
    try {
        const [limited] = await db.execute("SELECT id, name, is_limited_offer FROM products WHERE is_limited_offer = 1 OR is_limited_offer = true");
        const [weekly] = await db.execute("SELECT id, name, is_weekly_deal FROM products WHERE is_weekly_deal = 1 OR is_weekly_deal = true");

        console.log('Limited Offers Count:', limited.length);
        console.log('Limited Offers:', limited);

        console.log('Weekly Deals Count:', weekly.length);
        console.log('Weekly Deals:', weekly);

        process.exit(0);
    } catch (err) {
        console.error('Error checking offers:', err);
        process.exit(1);
    }
}

checkOffers();
