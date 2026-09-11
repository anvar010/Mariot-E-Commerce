/**
 * Re-file REDFOX products under the right sub- and sub-sub-category.
 *
 * All 128 of them sat directly on "Cooking equipment" with the sub and sub-sub fields
 * pointing at that same category, so the brand page's category filter had exactly one
 * entry to offer and no way to narrow anything.
 *
 * The product names are structured enough to classify from -- "GAS GRIDDLE PLATE - FTH",
 * "ELECTRIC FRYER - FE" -- so each rule below reads a name and answers with a destination.
 * Order matters: the first rule that matches wins, so the more specific patterns come first.
 *
 * Run with --dry to see what it would do and change nothing. Without it, only rows whose
 * destination differs from what they already have are written.
 */

require('dotenv').config();
const db = require('../config/db');

// Destination ids, from the live category tree.
const CAT = {
    COOKING: 17,

    CHAR_BROILERS: 34,
    LAVA_ROCK: 36,
    RADIANT: 35,

    FRYER: 45,
    ELECTRIC_FRYER: 47,
    GAS_FRYER: 46,
    FRY_DUMP: 50,

    GRIDDLES: 18,
    ELECTRIC_GRIDDLES: 20,
    GAS_GRIDDLES: 19,

    RANGES: 21,
    COUNTERTOP_RANGES: 24,
    ELECTRIC_RANGES: 23,
    GAS_RANGES: 22,

    SPECIALTY: 37,
    PASTA_COOKERS: 40,
    SALAMANDER: 41,
    SPECIALTY_EQUIP: 43,

    TOASTERS: 26,
    PANINI: 28,

    WAFFLE_CREPE: 30,
    CREPE_MAKERS: 33,
};

/**
 * [test, sub-category, sub-sub-category]
 *
 * A null sub-sub means the product is filed at sub level -- correct where the tree has no
 * child that fits, and better than inventing one.
 */
const RULES = [
    // Griddles / fry-tops. Chromed, grooved and "fry-top" are all griddle plates.
    [/GRIDDLE|FRY-?\s?TOP|FRY TOP/i, null, null, (n) =>
        /GAS/i.test(n) ? [CAT.GRIDDLES, CAT.GAS_GRIDDLES] : [CAT.GRIDDLES, CAT.ELECTRIC_GRIDDLES]],

    // Fry dump stations are their own thing, and must be tested before FRYER.
    [/FRY DUMP/i, CAT.FRYER, CAT.FRY_DUMP],

    // "SALAMDER" is a typo in the catalogue itself, so both spellings are matched.
    [/SALAMANDER|SALAMDER/i, CAT.SPECIALTY, CAT.SALAMANDER],

    // Fryers.
    [/FRYER/i, null, null, (n) =>
        /GAS/i.test(n) ? [CAT.FRYER, CAT.GAS_FRYER] : [CAT.FRYER, CAT.ELECTRIC_FRYER]],

    // Lava stone and water grills are char broilers.
    [/LAVA\s*STONE|LAVA ROCK/i, CAT.CHAR_BROILERS, CAT.LAVA_ROCK],
    [/WATER GRILL/i, CAT.CHAR_BROILERS, CAT.RADIANT],

    // Contact grills and light-grilling plates are panini-style.
    [/CONTACT GRILL|LIGHT GRILLING/i, CAT.TOASTERS, CAT.PANINI],

    [/CREPE MAKER/i, CAT.WAFFLE_CREPE, CAT.CREPE_MAKERS],
    [/PASTA COOKER/i, CAT.SPECIALTY, CAT.PASTA_COOKERS],

    // Cookers and hotplates are ranges. "Taburet hob" is a stool-mounted hob.
    [/COOKER|COOKING RANGE|HOTPLATE|HOT PLATE|TABURET HOB/i, null, null, (n) =>
        /GAS/i.test(n) ? [CAT.RANGES, CAT.GAS_RANGES]
            : /TABLE TOP|TT |TABURET/i.test(n) ? [CAT.RANGES, CAT.COUNTERTOP_RANGES]
                : [CAT.RANGES, CAT.ELECTRIC_RANGES]],

    // Everything that keeps food hot, or is an accessory, goes to Specialty Equipment.
    // Bain maries, hot cupboards, heating elements, sausage rollers, display cases and
    // the odd spare part have no closer home in this tree, and Specialty Equipment is
    // what it is for.
    [/BAIN MARIE|HOT CUPBOARD|HEATING (ELEMENT|TOP)|SAUSAGE ROLLER|DISPLAY WINDOW|WASH BASIN|FIRECLAY|CERAMIC PLATE|TEFLON|ACCESORY|ACCESSORY|CLAM GRILL|OVEN/i,
        CAT.SPECIALTY, CAT.SPECIALTY_EQUIP],
];

const classify = (name) => {
    for (const [test, sub, subsub, fn] of RULES) {
        if (test.test(name)) {
            if (fn) {
                const [s, ss] = fn(name);
                return { sub: s, subsub: ss };
            }
            return { sub, subsub };
        }
    }
    return null;
};

(async () => {
    const dry = process.argv.includes('--dry');
    try {
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.category_id, p.sub_category_id, p.sub_sub_category_id
            FROM products p JOIN brands b ON p.brand_id = b.id
            WHERE b.slug = 'redfox'
        `);
        console.log(`REDFOX products: ${rows.length}${dry ? '  (dry run)' : ''}\n`);

        const unmatched = [];
        let planned = 0, unchanged = 0;

        for (const p of rows) {
            const dest = classify(p.name || '');
            if (!dest) { unmatched.push(p); continue; }

            const already = Number(p.sub_category_id) === dest.sub
                && Number(p.sub_sub_category_id) === (dest.subsub || null);
            if (already) { unchanged++; continue; }

            planned++;
            if (!dry) {
                await db.execute(
                    'UPDATE products SET category_id = ?, sub_category_id = ?, sub_sub_category_id = ? WHERE id = ?',
                    [CAT.COOKING, dest.sub, dest.subsub, p.id],
                );
            }
        }

        console.log(`  ${dry ? 'would update' : 'updated'}: ${planned}`);
        console.log(`  already correct: ${unchanged}`);
        console.log(`  unmatched: ${unmatched.length}`);
        if (unmatched.length) {
            console.log('\n  These were left alone -- no rule matched:');
            unmatched.forEach(p => console.log(`    ${p.id}  ${p.name}`));
        }
    } catch (err) {
        console.error('FAILED:', err.message);
        process.exitCode = 1;
    } finally {
        process.exit();
    }
})();
