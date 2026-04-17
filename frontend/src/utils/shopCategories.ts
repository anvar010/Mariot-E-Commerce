import {
    Coffee,
    IceCream,
    Flame,
    Smartphone as Fridge,
    GlassWater,
    Microwave,
    Apple,
    ChefHat,
    Truck,
    Settings,
    RotateCcw,
    Waves,
    ShieldCheck,
    Trash2,
    Droplets,
    Home,
    Utensils,
    PackageSearch,
    Beef
} from 'lucide-react';

export const SHOP_CATEGORIES = [
    { name: 'Coffee Makers', slug: 'coffee-makers', icon: Coffee },
    { name: 'Ice Equipment', slug: 'ice-equipment', icon: IceCream },
    { name: 'Cooking Equipment', slug: 'cooking-equipment', icon: Flame },
    { name: 'Refrigeration', slug: 'refrigeration', icon: Fridge },
    { name: 'Beverage Equipment', slug: 'beverage-equipment', icon: GlassWater },
    { name: 'Commercial Ovens', slug: 'commercial-ovens', icon: Microwave },
    { name: 'Food Preparation', slug: 'food-preparation', icon: Apple },
    { name: 'Food Holding and Warming Line', slug: 'food-holding-and-warming-line', icon: ChefHat },
    { name: 'Delivery and Storage', slug: 'delivery-and-storage', icon: Truck },
    { name: 'Parts', slug: 'parts', icon: Settings },
    { name: 'Used Equipment', slug: 'used-equipment', icon: RotateCcw },
    { name: 'Dishwashing', slug: 'dishwashing', icon: Waves },
    { name: 'Stainless Steel Equipment', slug: 'stainless-steel-equipment', icon: ShieldCheck },
    { name: 'Janitorial & Safety Supplies', slug: 'janitorial-safety-supplies', icon: Trash2 },
    { name: 'Water Treatment', slug: 'water-treatment', icon: Droplets },
    { name: 'Home Use', slug: 'home-use', icon: Home },
    { name: 'Dining Room', slug: 'dining-room', icon: Utensils },
    { name: 'Smallwares', slug: 'smallwares', icon: ChefHat },
    { name: 'Disposables', slug: 'disposables', icon: PackageSearch },
    { name: 'Food & Beverage Ingredients', slug: 'food-beverage-ingredients', icon: Beef }
];

export const SHOP_SUBCATEGORIES: { [key: string]: { left: any[], right: any[] } } = {
    // Legacy hardcoded structure removed. Content is now fetched dynamically from the database.
};

export const normalizeSlug = (str: string) => str.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');

export const getChildCategories = (currentSlug: string) => {
    // 1. Check if it's a Top Level Category
    const subcats = SHOP_SUBCATEGORIES[currentSlug];
    if (subcats) {
        // Return all "titles" from left and right as immediate children
        const children = [];
        if (subcats.left) children.push(...subcats.left.map(g => g.title));
        if (subcats.right) children.push(...subcats.right.map(g => g.title));
        return children;
    }

    // 2. Check if it's a Second Level Category (Group Title)
    // We need to search through all values in SHOP_SUBCATEGORIES
    for (const key in SHOP_SUBCATEGORIES) {
        const { left, right } = SHOP_SUBCATEGORIES[key];
        const allGroups = [...(left || []), ...(right || [])];

        const foundGroup = allGroups.find(g => normalizeSlug(g.title) === currentSlug);
        if (foundGroup) {
            return foundGroup.items || [];
        }
    }

    return [];
};

export const getParentCategory = (currentSlug: string) => {
    // Check if it is a subcategory (Group Title) of a main category
    for (const key in SHOP_SUBCATEGORIES) {
        const { left, right } = SHOP_SUBCATEGORIES[key];
        const allGroups = [...(left || []), ...(right || [])];

        // precise match on slugified title
        const foundGroup = allGroups.find(g => normalizeSlug(g.title) === currentSlug);
        if (foundGroup) {
            return key; // Return the parent category slug
        }

        // Check if it is an item within a group
        // If currentSlug is an item, its parent is the group title
        for (const group of allGroups) {
            const foundItem = group.items.find((item: string) => normalizeSlug(item) === currentSlug);
            if (foundItem) {
                return normalizeSlug(group.title);
            }
        }
    }
    return null;
};
