export const CATEGORY_MAPPING: { [key: string]: string[] } = {
    'cooking-line': ['Cooker', 'Fryers', 'Grills', 'Pasta Cooker', 'Pasta Maker', 'Combi Oven', 'Rice Cooker', 'Food Warmers', 'Microwave', 'Salamander', 'Tandoori Oven', 'Tilting & Boiling pan'],
    'refrigeration-line': ['Freezer & Chillers', 'Ice Maker & Flakes', 'Ice Cream Machines', 'Ice Cream Display', 'Display Chiller'],
    'bakery-line': ['Bakery Oven', 'Bakery Mixers', 'Rolling Machine', 'Bread Slicer', 'Bakery Display'],
    'coffee-bar-line': ['Blenders', 'Juice Maker', 'Coffee Grinder', 'Coffee Machines', 'Coffee Warming', 'Slush Machine', 'Tea Maker', 'Ice Crusher'],
    'food-processing': ['Cutter Mixer', 'Meat Mincer', 'Meat Slicer & Bone Saw', 'Bar Vacuum Machine', 'Cheese Grater', 'Hamburger Press', 'Knife Sterilizers', 'Shawarma Knife', 'Vegetable Equipment', 'Pasta Maker'],
    'dry-store': ['Storage Shelves', 'Insect Killer', 'Packing Machines'],
    'laundry-dish-washer': ['Laundry Machines', 'Dish Washer Machines'],
    'snack-maker': ['Waffle Maker', 'Crepe Maker', 'Hotdog Maker', 'Donut Maker', 'Chocolate Fountain', 'Cone Baker', 'Pan Cake Maker', 'Cheese Warmer', 'Water Boiler', 'Ice Cream Powder', 'Sandwich Maker'],
    'supermarket-equipment': ['Supermarket Chiller', 'Meat Display', 'Fish Display', 'Shelves', 'Trolley', 'Scales & Pos']
};

export const getParentCategory = (subcategorySlug: string) => {
    const formattedSlug = subcategorySlug.toLowerCase();
    for (const [parent, subs] of Object.entries(CATEGORY_MAPPING)) {
        if (subs.some(sub => sub.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-') === formattedSlug)) {
            return parent;
        }
    }
    return null;
};

export const getSubcategoriesForParent = (parentSlug: string) => {
    return CATEGORY_MAPPING[parentSlug] || [];
};
