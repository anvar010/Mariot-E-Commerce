export const CATEGORIES_STRUCTURE: { [key: string]: { left: { title: string, items: string[] }[], right: { title: string, items: string[] }[] } | string[] } = {
    'coffee-makers': {
        left: [
            { title: "Espresso Machines", items: ["Volumetric Espresso Machines", "Gravimetric Espresso Machines", "Super Automatic Espresso Machines"] },
            { title: "Coffee Grinders", items: ["Espresso Grinders", "Brewed Coffee Grinders"] },
            { title: "Coffee & Tea Brewers", items: ["Pour Overs", "Batch Brewers", "Water Boilers", "Filters", "Tea Makers"] },
            { title: "Coffee Roasters", items: [] },
            { title: "Manual Brewing", items: ["Drinkware", "Coffee Scales", "Brewers", "Coffee Filters", "Cold Brewers"] }
        ],
        right: [
            { title: "Coffee Beans", items: [] },
            { title: "Coffee Accessories", items: ["Milk Pitchers", "Tampers", "Coffee Cups", "Tamping Mat", "Knock Box", "Cleaning Products", "Thermometer", "Espresso Baskets", "Coffee Distributor", "Shot glasses", "Portafilters", "Power Water Pumps", "Other Coffee Accessories", "Pitcher Rinser"] }
        ]
    },
    'ice-equipment': {
        left: [
            { title: "Self Contained Ice Makers", items: [] },
            { title: "Ice Dispensers", items: [] }
        ],
        right: [
            { title: "Stackable Ice Makers", items: [] },
            { title: "Ice Bins", items: [] }
        ]
    },
    'cooking-equipment': {
        left: [
            { title: "Outdoor Grilling", items: [] },
            { title: "Commercial Fryers", items: ["Gas Fryers", "Electric Fryers", "Pressure Fryer", "Oil Filtration And Accessories", "Fry Dump Stations"] },
            { title: "Restaurant Ranges", items: ["Gas Ranges", "Electric Ranges", "Countertop Ranges", "Induction Ranges"] },
            { title: "Commercial Griddles & Accessories", items: ["Electric Griddles", "Gas Griddles"] }
        ],
        right: [
            { title: "Toasters And Panini Grills", items: ["Bun Toasters", "Conveyor Toasters", "Panini Grills", "Pop-Up Toasters"] },
            { title: "Waffles And Crepe Machines", items: ["Waffle Irons", "Baking Plates And Accessories", "Crepe Maker"] },
            { title: "Charbroilers", items: ["Radiant Charbroilers", "Lava Rock Charbroilers", "Electric Charbroilers"] },
            { title: "Specialty Cooking Equipment", items: ["Sous Vide Machines", "Pasta Cookers", "Salamander Grills", "Shawarma Machines", "Specialty Equipment", "Steam Kettles & Braising Pans"] }
        ]
    },
    'refrigeration': {
        left: [
            {
                title: "Refrigerators",
                items: [
                    "Reach In Refrigerators",
                    "Undercounter Refrigerators",
                    "Work Top Refrigerators",
                    "Prep Table Refrigerators",
                    "Chef Base Refrigerators",
                    "Display Refrigerators",
                    "Merchandising Refrigerators",
                    "Underbar Refrigerators",
                    "Blast Chillers & Freezers"
                ]
            }
        ],
        right: [
            {
                title: "Freezers",
                items: [
                    "Reach-In Freezers",
                    "Undercounter Freezers",
                    "Work Top Freezers",
                    "Ice Cream Dipping Cabinets",
                    "Merchandising Freezers"
                ]
            },
            {
                title: "Ice Cream Machines",
                items: [
                    "Countertop Ice Cream Machines",
                    "Floor Mount Ice Cream Machines"
                ]
            }
        ]
    },
    'beverage-equipment': {
        left: [
            { title: "Blenders", items: [] },
            { title: "Juicers", items: [] },
            { title: "Slushy Machines", items: [] },
            { title: "Milkshake Machines", items: [] }
        ],
        right: [
            { title: "Hot Beverage Dispensers", items: [] },
            { title: "Beverage Supplies Accessories", items: [] },
            { title: "Chocolate Fountains", items: [] }
        ]
    },
    'commercial-ovens': {
        left: [
            { title: "Microwave Ovens", items: [] },
            { title: "Convection Ovens", items: [] },
            { title: "High Speed Hybrid Ovens", items: [] },
            { title: "Conveyor Ovens", items: [] },
            { title: "Combi Ovens", items: [] }
        ],
        right: [
            { title: "Pizza Ovens", items: [] },
            { title: "Bakery Deck Ovens", items: [] },
            { title: "Cook and Hold Ovens", items: [] },
            { title: "Oven Accessories", items: [] },
            { title: "Charcoal Ovens", items: [] }
        ]
    },
    'food-preparation': {
        left: [
            { title: "Food Processing Equipment", items: ["Food Processing Machines", "Food Processor Blades and Discs"] },
            { title: "Food Packaging Appliances", items: ["Vacuum Sealers", "Label Printers", "Vacuum Sealers Accessories"] },
            { title: "Food Blenders", items: ["Hand Blenders"] },
            { title: "Dehydrators", items: [] },
            { title: "Fruit, Vegetable, and Salad Preparation", items: ["Commercial French Fry Cutters", "Manual Vegetable and Fruit Cutters", "Peelers & Dryers"] }
        ],
        right: [
            { title: "Food Slicers", items: [] },
            { title: "Dough Mixer", items: [] },
            { title: "Food Scales", items: [] },
            { title: "Dough Sheeters and Dough Presses", items: [] },
            { title: "Meat and Seafood Preparation", items: ["Meat Mincer", "Bone Saw Cutters", "Breading Equipment", "Patty Press"] },
            { title: "Pastries Decorating Equipment", items: [] }
        ]
    },
    'food-holding-and-warming-line': {
        left: [
            { title: "Heat Lamps", items: [] },
            { title: "Countertop Warmers and Display Cases", items: [] },
            { title: "Strip Warmers", items: [] }
        ],
        right: [
            { title: "Holding and Proofing Cabinets", items: [] },
            { title: "Drop In Wells", items: [] }
        ]
    },
    'delivery-and-storage': {
        left: [
            { title: "Storage Shelves", items: [] },
            { title: "Storage Bins", items: [] },
            { title: "Storage Racks", items: [] }
        ],
        right: [
            { title: "Carts, Trucks and Dollies", items: [] },
            { title: "Delivery Bags and Boxes", items: [] },
            { title: "Dinnerware Storage and Transport", items: [] }
        ]
    },
    'parts': {
        left: [
            { title: "Somerset Parts", items: [] },
            { title: "Amana Menumaster Parts", items: [] },
            { title: "Ansul Parts", items: [] }
        ],
        right: [
            { title: "APW Parts", items: [] },
            { title: "Bakers Pride Parts", items: [] }
        ]
    },
    'used-equipment': {
        left: [
            { title: "Coffee", items: [] },
            { title: "Beverage", items: [] },
            { title: "Cooking Equipment", items: [] },
            { title: "Refrigeration", items: [] }
        ],
        right: [
            { title: "Ice Equipment", items: [] },
            { title: "Display and Merchandising", items: [] },
            { title: "Storage", items: [] },
            { title: "Furniture", items: [] }
        ]
    },
    'dishwashing': {
        left: [
            { title: "Undercounter Dishwashers", items: [] },
            { title: "Hood Dishwashers", items: [] },
            { title: "Conveyor Dishwashers", items: [] }
        ],
        right: [
            { title: "Faucets", items: ["Wall Mount Faucets", "Deck Mount Faucets", "Pre-Rinse Faucets and Spray Valves", "Dipper Wells"] },
            { title: "Dish Racks", items: [] },
            { title: "Booster Heaters", items: [] }
        ]
    },
    'stainless-steel-equipment': {
        left: [
            { title: "Stainless Steel Tables", items: ["Stainless Steel Work Tables"] },
            { title: "Stainless Steel Sinks", items: ["Mop Sink", "Stainless Steel Hand Sinks"] },
            { title: "Stainless Steel Cabinets", items: [] },
            { title: "Stainless Steel Shelves", items: [] }
        ],
        right: [
            { title: "Stainless Steel Hoods", items: ["Exhaust Hood - Low Profile"] },
            { title: "Stainless Steel Trolly", items: [] },
            { title: "Stainless Steel Category", items: [] },
            { title: "Stainless Steel Ice Bins", items: [] },
            { title: "Stainless Steel Grease Traps", items: [] }
        ]
    },
    'janitorial-safety-supplies': {
        left: [
            { title: "Trash Bins and Recycling Containers", items: [] },
            { title: "Sink Waste Management", items: [] },
            { title: "Washroom Equipment", items: [] },
            { title: "Cleaning Chemicals and Sanitizers", items: [] }
        ],
        right: [
            { title: "Cleaning Equipment and tools", items: [] },
            { title: "Insect Control", items: [] },
            { title: "Air Filters", items: [] }
        ]
    },
    'water-treatment': {
        left: [
            { title: "Filters", items: [] },
            { title: "Reverse Osmosis", items: [] }
        ],
        right: [
            { title: "Water Softeners", items: [] },
            { title: "Cartridges & Accessories", items: [] }
        ]
    },
    'home-use': {
        left: [
            { title: "Cooking Appliances", items: [] },
            { title: "Food Preparation Appliances", items: [] }
        ],
        right: [
            { title: "Coffee Equipment for Home Use", items: ["Brewers for Home Use", "Manual Brewing Equipment"] },
            { title: "Coffee for Home Use", items: [] }
        ]
    },
    'dining-room': {
        left: [
            { title: "Buffetware", items: ["Buffet Dispensers", "Chafing Dishes"] },
            { title: "Tabletops", items: ["Tableware"] }
        ],
        right: [
            { title: "Restaurant Furniture", items: [] }
        ]
    },
    'smallwares': {
        left: [
            { title: "Cookware", items: ["Sauce Pots and Stock Pots", "Fry Pans and Sauce Pans", "Cast Iron Cookware", "Bakeware", "Cookware Covers and Accessories"] },
            { title: "Serving Supplies", items: ["Serving Utensils and Tools", "Dry Food Dispenser Parts and Accessories"] },
            { title: "Kitchen Hand Tools", items: [] },
            { title: "Restaurant Food Storage", items: ["Food Storage Containers", "Plastic Food Pans, Drain Trays, and Lids", "Stainless Steel Steam Table Food Pans and Accessories"] }
        ],
        right: [
            { title: "Pizza Smallwares", items: ["Pizza Making Tools and Utensils", "Pizza Pans", "Pizza Oven and Cooking Tools"] },
            { title: "Beverage Service Supplies", items: ["Beverage Dispensers"] },
            { title: "Baking Smallwares", items: ["Bakery Pans and Cake Molds"] },
            { title: "Kitchen Supplies", items: ["Cutting Boards", "Skimmers and Strainers"] },
            { title: "Kitchen Cutlery", items: [] }
        ]
    },
    'disposables': {
        left: [
            { title: "Paper & Eco-Friendly Disposables", items: ["Paper Cups", "Napkins", "Paper Food Trays", "Straws & Stirrers", "Paper Bags"] }
        ],
        right: []
    },
    'food-beverage-ingredients': {
        left: [
            { title: "Ice Cream Supplies", items: [] }
        ],
        right: [
            { title: "TEA", items: [] }
        ]
    }
};

export const CATEGORIES_LIST = [
    { name: 'Coffee Makers', slug: 'coffee-makers' },
    { name: 'Ice Equipment', slug: 'ice-equipment' },
    { name: 'Cooking Equipment', slug: 'cooking-equipment' },
    { name: 'Refrigeration', slug: 'refrigeration' },
    { name: 'Beverage Equipment', slug: 'beverage-equipment' },
    { name: 'Commercial Ovens', slug: 'commercial-ovens' },
    { name: 'Food Preparation', slug: 'food-preparation' },
    { name: 'Food Holding and Warming Line', slug: 'food-holding-and-warming-line' },
    { name: 'Delivery and Storage', slug: 'delivery-and-storage' },
    { name: 'Parts', slug: 'parts' },
    { name: 'Used Equipment', slug: 'used-equipment' },
    { name: 'Dishwashing', slug: 'dishwashing' },
    { name: 'Stainless Steel Equipment', slug: 'stainless-steel-equipment' },
    { name: 'Janitorial & Safety Supplies', slug: 'janitorial-safety-supplies' },
    { name: 'Water Treatment', slug: 'water-treatment' },
    { name: 'Home Use', slug: 'home-use' },
    { name: 'Dining Room', slug: 'dining-room' },
    { name: 'Smallwares', slug: 'smallwares' },
    { name: 'Disposables', slug: 'disposables' },
    { name: 'Food & Beverage Ingredients', slug: 'food-beverage-ingredients' }
];
