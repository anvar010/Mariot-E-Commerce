/**
 * File products under the sub-categories that exist for them.
 *
 * 375 products sit on a main category whose sub-categories were added later, so the shop's
 * category filter has nothing to narrow by on those pages. The names carry enough to classify
 * from, so each rule below reads a name and answers with a destination.
 *
 * Deliberately conservative. A product only moves when a rule matches it clearly; anything
 * ambiguous is reported and left exactly where it is, because a wrong category is worse than
 * no category -- it hides a product from the filter a shopper actually used.
 *
 * Run with --dry to see what it would do and change nothing.
 */

require('dotenv').config();
const db = require('../config/db');

/**
 * Keyed by main category name, in order. The first pattern that matches a product name wins,
 * so the specific ones come before the general.
 *
 * Accessory patterns go LAST within a group: "Rational Roasting and Baking Tray" should be an
 * accessory, but "Convection Oven" must be matched as an oven first.
 */
const RULES = {
    'Dishwashing Equipment': [
        [/GLASSWASHER|GLASS WASHER/i, 'Glasswashers'],
        [/HOOD[- ]?TYPE/i, 'Hood Type Dishwashers'],
        [/UNDER ?COUNTER/i, 'Undercounter Dishwashers'],
        [/POT WASH|UTENSIL|PRE-?WASH/i, 'Utensil Washers'],
        [/CONVEYOR|RACK-?MOUNTED|PASS[- ]?THROUGH/i, 'Conveyor Dishwashers'],
    ],

    'Commercial Ovens': [
        [/\bPROOFER\b/i, 'Proofer'],
        [/COMBI/i, 'Combi Ovens'],
        [/CONVECTION/i, 'Convection Ovens'],
        [/CONVEYOR/i, 'Conveyor Ovens'],
        [/MICROWAVE/i, 'Microwave Ovens'],
        [/PIZZA/i, 'Pizza Ovens'],
        [/DECK OVEN|BAKERY DECK|BREAD PRODUCTION/i, 'Bakery Deck Ovens'],
        [/COOK AND HOLD|HOLDING CABINET|HOT FRIDGE/i, 'Cook and Hold Ovens'],
        [/HIGH ?SPEED|HYBRID/i, 'High Speed Hybrid Ovens'],
        // Last: the Rational range is largely trays, grids and containers.
        [/TRAY|GRID\b|GRATE|CONTAINER|VARIOSMOKER|ACCESSOR|CONNECTOR|RACK\b|CARE |DETERGENT|TAB\b|MOULD|SUPERSPIKE|SMOKER|STAND\b|MULTIBAKER|SPIKE|BASKET|PAN\b|LID\b|HOSE|FILTER/i,
            'Oven Accessories'],
    ],

    'Food Holding and Warming Line': [
        [/HEAT ?LAMP|GANTRY/i, 'Heat Lamps'],
        [/STRIP WARMER/i, 'Strip Warmers'],
        [/PROOFING|HOLDING CABINET/i, 'Holding and Proofing Cabinets'],
        [/HOT DISPLAY|HEATED DISPLAY|DISPLAY WARMER|BAIN[- ]?MARIE|SOUP/i, 'Hot Display '],
        [/WARMER|DISPLAY CASE|COUNTERTOP/i, 'Countertop Warmers and Display Cases'],
    ],

    'Coffee Makers': [
        [/GRINDER/i, 'Coffee Grinders'],
        [/ESPRESSO/i, 'Espresso Machines'],
        [/WATER SOFT/i, 'Water Softner'],
        [/BREWER|FILTER COFFEE|BATCH|TEA/i, 'Coffee & Tea Brewers'],
    ],

    'Refrigeration': [
        [/FREEZER/i, 'Freezers'],
        [/CHILLER|FRIDGE|REFRIGERAT/i, 'Refrigerators'],
    ],

    'Beverage Equipment': [
        // Note the trailing space: that is how the category is named in the data.
        [/JUICER|JUICE/i, 'Juicer '],
        [/BLENDER/i, 'Blenders'],
        [/MILKSHAKE/i, 'Milkshake Machines'],
        [/SLUSH/i, 'Slushy Machines'],
        [/CHOCOLATE FOUNTAIN/i, 'Chocolate Fountains'],
        [/DISPENSER|BOILER|URN/i, 'Hot Beverage Dispensers'],
    ],

    'Storage': [
        [/SHELV/i, 'Storage Shelves'],
        [/RACK/i, 'Storage Racks'],
        [/TROLLEY|CART|TRUCK|DOLLY|DOLLIES/i, 'Carts, Trucks and Dollies'],
        [/DINNERWARE|PLATE|TRANSPORT/i, 'Dinnerware Storage and Transport'],
    ],
};

(async () => {
    const dry = process.argv.includes('--dry');
    try {
        // The whole tree, so a destination name can be resolved to an id under the right parent.
        const [cats] = await db.execute(
            'SELECT id, name, parent_id FROM categories WHERE is_active = 1',
        );
        const mainByName = new Map();
        for (const c of cats) if (!c.parent_id) mainByName.set(String(c.name), c);

        const childId = (parentId, name) => {
            const hit = cats.find(c => c.parent_id === parentId && String(c.name).toLowerCase() === name.toLowerCase());
            return hit ? hit.id : null;
        };

        let moved = 0, skipped = 0;
        const unmatched = [];
        const missingDest = new Set();

        for (const [mainName, rules] of Object.entries(RULES)) {
            const main = mainByName.get(mainName);
            if (!main) { console.log(`  ! no such main category: ${mainName}`); continue; }

            const [rows] = await db.execute(
                `SELECT id, name FROM products
                 WHERE category_id = ? AND (sub_category_id IS NULL OR sub_category_id = category_id)`,
                [main.id],
            );
            if (rows.length === 0) continue;

            console.log(`\n  ${mainName}: ${rows.length} unfiled`);
            const tally = {};

            for (const p of rows) {
                const name = String(p.name || '');
                const rule = rules.find(([re]) => re.test(name));
                if (!rule) { unmatched.push(`${mainName}: ${name}`); skipped++; continue; }

                const destId = childId(main.id, rule[1]);
                if (!destId) { missingDest.add(`${mainName} > ${rule[1]}`); skipped++; continue; }

                tally[rule[1]] = (tally[rule[1]] || 0) + 1;
                moved++;
                if (!dry) {
                    await db.execute(
                        'UPDATE products SET sub_category_id = ?, sub_sub_category_id = NULL WHERE id = ?',
                        [destId, p.id],
                    );
                }
            }
            for (const [k, v] of Object.entries(tally)) console.log(`     ${k}: ${v}`);
        }

        console.log(`\n  ${dry ? 'would move' : 'moved'}: ${moved}`);
        console.log(`  left alone: ${skipped}`);

        if (missingDest.size) {
            console.log('\n  These destinations do not exist yet -- create them, or the rule is wrong:');
            [...missingDest].forEach(d => console.log(`     ${d}`));
        }
        if (unmatched.length) {
            console.log(`\n  No rule matched these ${unmatched.length}; they stay where they are:`);
            unmatched.slice(0, 40).forEach(n => console.log(`     ${n.slice(0, 96)}`));
            if (unmatched.length > 40) console.log(`     ... and ${unmatched.length - 40} more`);
        }
    } catch (err) {
        console.error('FAILED:', err.message);
        process.exitCode = 1;
    } finally {
        process.exit();
    }
})();
