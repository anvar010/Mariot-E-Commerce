export const CATEGORIES_STRUCTURE: { [key: string]: { left: { title: string, items: string[] }[], right: { title: string, items: string[] }[] } | string[] } = {
    'beverage-equipment': {
        left: [
            { title: "Juicers", items: [] },
            { title: "Slushy Machines", items: [] },
            { title: "Milkshake Machines", items: [] },
        ],
        right: [
            { title: "Hot Beverage Dispensers", items: [] },
            { title: "Chocolate Fountains", items: [] },
            { title: "Blenders", items: [] },
        ]
    },
    'coffee-makers': {
        left: [
            { title: "Espresso Machines", items: ["Volumetric Espresso Machines", "Gravimetric Espresso Machines"] },
            { title: "Coffee Grinders", items: ["Espresso Grinders", "Brewed Coffee Grinders"] },
        ],
        right: [
            { title: "Coffee & Tea Brewers", items: ["Pour Overs", "Water Boilers", "Filters", "Tea Makers"] },
        ]
    },
    'commercial-ovens': {
        left: [
            { title: "Microwave Ovens", items: [] },
            { title: "Convection Ovens", items: [] },
            { title: "High Speed Hybrid Ovens", items: [] },
            { title: "Conveyor Ovens", items: [] },
            { title: "Combi Ovens", items: [] },
        ],
        right: [
            { title: "Pizza Ovens", items: [] },
            { title: "Bakery Deck Ovens", items: [] },
            { title: "Cook and Hold Ovens", items: [] },
            { title: "Oven Accessories", items: [] },
        ]
    },
    'cooking-equipment': {
        left: [
            { title: "Commercial Griddles & Accessories", items: ["Gas Griddles", "Electric Griddles"] },
            { title: "Restaurant Ranges", items: ["Gas Ranges", "Electric Ranges", "Countertop Ranges", "Induction Ranges"] },
            { title: "Toasters and Panini Grills", items: ["Conveyor Toasters", "Panini Grills", "Pop-Up Toasters"] },
            { title: "Waffle and Crepe Machines", items: ["Waffle Irons", "Baking Plates", "Crepe Makers"] },
        ],
        right: [
            { title: "Char broilers", items: ["Radiant Char broilers", "Lava Rock Char broilers"] },
            { title: "Specialty Cooking Equipment", items: ["Electric Char broilers", "Sous Vide Machines", "Pasta Cookers", "Salamander Grills", "Shawarma Machines", "Specialty Equipment", "Steam Kettles & Braising Pans"] },
            { title: "Commercial fryer", items: ["Gas fryer", "Electric fryer", "Pressure fryer", "Oil Filtration and Accessories", "Fry Dump Stations"] },
            { title: "Parts", items: [] },
        ]
    },
    'food-holding-and-warming-line': {
        left: [
            { title: "Heat Lamps", items: [] },
            { title: "Countertop Warmers and Display Cases", items: [] },
        ],
        right: [
            { title: "Strip Warmers", items: [] },
            { title: "Holding and Proofing Cabinets", items: [] },
        ]
    },
    'food-preparation': {
        left: [
            { title: "Food Processing Equipment", items: ["Food Processing Machines", "Food Processor Blades and Discs"] },
            { title: "Food Packaging Appliances", items: ["Vacuum Sealers", "Label-Printers"] },
            { title: "Food Blenders", items: ["Hand Blenders"] },
            { title: "Dehydrators", items: [] },
        ],
        right: [
            { title: "Peelers & Dryers", items: ["Commercial French Fry Cutters", "Manual Vegetable and Fruit Cutters", "Peelers & Dryers"] },
            { title: "Food Slicers", items: [] },
            { title: "Dough Sheeters and Dough Presses", items: [] },
            { title: "Meat and Seafood Preparation", items: ["Meat Mincer", "Bone Saw Cutters", "Patty Press"] },
        ]
    },
    'ice-equipment': {
        left: [
            { title: "Ice Cube", items: [] },
            { title: "Ice Flakers", items: [] },
        ],
        right: [
            { title: "Ice Bin", items: [] },
        ]
    },
    'laundries': {
        left: [
            { title: "washing machines", items: [] },
            { title: "dryers", items: [] },
        ],
        right: [
            { title: "IRON", items: [] },
            { title: "Dishwasher", items: [] },
        ]
    },
    'refrigeration': {
        left: [
            { title: "Refrigerators", items: ["Reach in Refrigerators", "Undercounter Refrigerators", "Work Top Refrigerators", "Prep Table Refrigerators", "Chef Base Refrigerators", "Display Refrigerators", "Merchandising Refrigerators", "Blast Chillers & Freezers"] },
            { title: "Ice Cream Machines", items: ["Countertop Ice Cream Machines", "Floor Mount Ice Cream Machines"] },
        ],
        right: [
            { title: "Freezers", items: ["Reach-In Freezers", "Undercounter Freezers", "Work Top Freezers", "Ice Cream Dipping Cabinets", "Merchandising Freezers"] },
        ]
    },
    'storage': {
        left: [
            { title: "Storage Shelves", items: [] },
            { title: "Storage Racks", items: [] },
        ],
        right: [
            { title: "Carts, Trucks and Dollies", items: [] },
            { title: "Dinnerware Storage and Transport", items: [] },
        ]
    },
};

export const CATEGORIES_LIST = [
    { name: 'Beverage Equipment', slug: 'beverage-equipment' },
    { name: 'Coffee Makers', slug: 'coffee-makers' },
    { name: 'Commercial Ovens', slug: 'commercial-ovens' },
    { name: 'Cooking equipment', slug: 'cooking-equipment' },
    { name: 'Food Holding and Warming Line', slug: 'food-holding-and-warming-line' },
    { name: 'Food Preparation', slug: 'food-preparation' },
    { name: 'Ice equipment', slug: 'ice-equipment' },
    { name: 'laundries', slug: 'laundries' },
    { name: 'Refrigeration', slug: 'refrigeration' },
    { name: 'Storage', slug: 'storage' },
];
