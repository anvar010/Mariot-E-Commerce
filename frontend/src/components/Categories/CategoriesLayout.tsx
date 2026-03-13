'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CategoriesLayout.module.css';
import { API_BASE_URL } from '@/config';
import Loader from '@/components/shared/Loader/Loader';
import { useTranslations } from 'next-intl';
import {
    ChevronRight,
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

interface CategoriesLayoutProps {
    isPopup?: boolean;
    onClose?: () => void;
}

const CategoriesLayout = ({ isPopup = false, onClose }: CategoriesLayoutProps) => {
    const t = useTranslations('categories');
    const tc = useTranslations('categoryContent');
    const categories = [
        { name: t('coffee-makers'), slug: 'coffee-makers', icon: Coffee },
        { name: t('ice-equipment'), slug: 'ice-equipment', icon: IceCream },
        { name: t('cooking-equipment'), slug: 'cooking-equipment', icon: Flame },
        { name: t('refrigeration'), slug: 'refrigeration', icon: Fridge },
        { name: t('beverage-equipment'), slug: 'beverage-equipment', icon: GlassWater },
        { name: t('commercial-ovens'), slug: 'commercial-ovens', icon: Microwave },
        { name: t('food-preparation'), slug: 'food-preparation', icon: Apple },
        { name: t('food-holding-and-warming-line'), slug: 'food-holding-and-warming-line', icon: ChefHat },
        { name: t('delivery-and-storage'), slug: 'delivery-and-storage', icon: Truck },
        { name: t('parts'), slug: 'parts', icon: Settings },
        { name: t('used-equipment'), slug: 'used-equipment', icon: RotateCcw },
        { name: t('dishwashing'), slug: 'dishwashing', icon: Waves },
        { name: t('stainless-steel-equipment'), slug: 'stainless-steel-equipment', icon: ShieldCheck },
        { name: t('janitorial-safety-supplies'), slug: 'janitorial-safety-supplies', icon: Trash2 },
        { name: t('water-treatment'), slug: 'water-treatment', icon: Droplets },
        { name: t('home-use'), slug: 'home-use', icon: Home },
        { name: t('dining-room'), slug: 'dining-room', icon: Utensils },
        { name: t('smallwares'), slug: 'smallwares', icon: ChefHat },
        { name: t('disposables'), slug: 'disposables', icon: PackageSearch },
        { name: t('food-beverage-ingredients'), slug: 'food-beverage-ingredients', icon: Beef }
    ];

    const [activeIndex, setActiveIndex] = useState(0);
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const brandMap: { [key: string]: { name: string, logo: string }[] } = {
        'coffee-makers': [
            { name: 'LA MARZOCCO', logo: '/assets/brands/La-Marzocco.png.webp' },
            { name: 'LA CIMBALI', logo: '/assets/brands/lacimbali.jpg.webp' },
            { name: 'RANCILIO', logo: '/assets/brands/Rancilio-logo-1.png.webp' },
            { name: 'Anfim', logo: '/assets/brands/anfilm.png.webp' },
            { name: 'MAHLKONIG', logo: '/assets/brands/MAHLKONIG-vector-logo.png.webp' },
            { name: 'Bunn', logo: '/assets/brands/bunn.webp' }
        ],
        'ice-equipment': [
            { name: 'Hoshizaki', logo: '/assets/brands/hoshizaki.webp' },
            { name: 'BREMA', logo: '/assets/brands/brema.jpg.webp' }
        ],
        'cooking-equipment': [
            { name: 'FAGOR', logo: '/assets/brands/FagorProfesional.png.webp' },
            { name: 'VULCAN', logo: '/assets/brands/VULCAN-BRAND.png.webp' },
            { name: 'SOUTHBEND', logo: '/assets/brands/southbend.jpg.webp' },
            { name: 'PITCO', logo: '/assets/brands/pitco.jpg.webp' },
            { name: 'Frymaster', logo: '/assets/brands/FRYMASTER.png.webp' },
            { name: 'ROLLER GRILL', logo: '/assets/brands/roller-grill.jpg.webp' }
        ],
        'refrigeration': [
            { name: 'TECNODOM', logo: '/assets/brands/tecnodom.jpg.webp' },
            { name: 'INFRICO', logo: '/assets/brands/inofrigo.jpg.webp' },
            { name: 'Desmon', logo: '/assets/brands/desmon.png.webp' },
            { name: 'TECHNOCOOLER', logo: '/assets/brands/technocooler.jpg.webp' }
        ],
        'beverage-equipment': [
            { name: 'GEL MATIC', logo: '/assets/brands/gelmatic.jpg.webp' },
            { name: 'COFRIMELL', logo: '/assets/brands/cofrimell.jpg.webp' },
            { name: 'VITAMIX', logo: '/assets/brands/vitamix.jpg.webp' },
            { name: 'blendtec', logo: '/assets/brands/Blendec-logo.png.webp' },
            { name: 'Zumex', logo: '/assets/brands/Zumex.png.webp' }
        ],
        'commercial-ovens': [
            { name: 'RATIONAL', logo: '/assets/brands/rational.jpg.webp' },
            { name: 'UNOX', logo: '/assets/brands/unox.jpg.webp' },
            { name: 'MERRYCHEF', logo: '/assets/brands/merrychef.png.webp' },
            { name: 'MENUMASTER', logo: '/assets/brands/menumaster.jpg.webp' },
            { name: 'Middleby Marshall', logo: '/assets/brands/middleby-marshall-logo.gif.webp' }
        ],
        'food-preparation': [
            { name: 'fimar', logo: '/assets/brands/fimar.jpg.webp' },
            { name: 'robot coupe', logo: '/assets/brands/robotcoupe.jpg.webp' },
            { name: 'La Minerva', logo: '/assets/brands/LA-MINERVA.png.webp' },
            { name: 'Zmatik', logo: '/assets/brands/zmatik-1.webp' }
        ],
        'food-holding-and-warming-line': [
            { name: 'ALTO-SHAAM', logo: '/assets/brands/Alto-Shaam.png.webp' }
        ],
        'dishwashing': [
            { name: 'IMESA', logo: '/assets/brands/imesa.jpg.webp' },
            { name: 'HCONVED', logo: '/assets/brands/hoonved.jpg.webp' },
            { name: 'Speed Queen', logo: '/assets/brands/Speed-Queen.png.webp' }
        ],
        'delivery-and-storage': [
            { name: '3MF', logo: '/assets/brands/3mf.jpg.webp' },
            { name: 'CAMRY', logo: '/assets/brands/camry.jpg.webp' }
        ],
        'parts': [
            { name: 'POSLIX', logo: '/assets/brands/poslix.jpg.webp' },
            { name: 'Zemic', logo: '/assets/brands/Zemic-Europe.png.webp' }
        ]
    };

    useEffect(() => {
        if (categories[activeIndex]) {
            const activeSlug = categories[activeIndex].slug;
            const mappedBrands = brandMap[activeSlug] || [];
            setBrands(mappedBrands);
        }
        setLoading(false);
    }, [activeIndex]);

    if (loading) return <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>;

    const activeCategory = categories[activeIndex];

    const getSubcategories = (slug: string): any => {
        switch (slug) {
            case 'coffee-makers':
                return {
                    left: [
                        { title: "espresso-machines", items: ["volumetric-espresso-machines", "gravimetric-espresso-machines", "super-automatic-espresso-machines"] },
                        { title: "coffee-grinders", items: ["espresso-grinders", "brewed-coffee-grinders"] },
                        { title: "coffee-tea-brewers", items: ["pour-overs", "batch-brewers", "water-boilers", "filters-item", "tea-makers"] },
                        { title: "coffee-roasters", items: [] },
                        { title: "manual-brewing", items: ["drinkware", "coffee-scales", "brewers", "coffee-filters", "cold-brewers"] }
                    ],
                    right: [
                        { title: "coffee-beans", items: [] },
                        { title: "coffee-accessories", items: ["milk-pitchers", "tampers", "coffee-cups", "tamping-mat", "knock-box", "cleaning-products", "thermometer", "espresso-baskets", "coffee-distributor", "shot-glasses", "portafilters", "power-water-pumps", "other-coffee-accessories", "pitcher-rinser"] }
                    ]
                };
            case 'ice-equipment':
                return {
                    left: [
                        { title: "self-contained-ice-makers", items: [] },
                        { title: "ice-dispensers", items: [] }
                    ],
                    right: [
                        { title: "stackable-ice-makers", items: [] },
                        { title: "ice-bins", items: [] }
                    ]
                };
            case 'cooking-equipment':
                return {
                    left: [
                        { title: "outdoor-grilling", items: [] },
                        { title: "commercial-fryers", items: ["gas-fryers", "electric-fryers", "pressure-fryer", "oil-filtration-and-accessories", "fry-dump-stations"] },
                        { title: "restaurant-ranges", items: ["gas-ranges", "electric-ranges", "countertop-ranges", "induction-ranges"] },
                        { title: "commercial-griddles-accessories", items: ["electric-griddles", "gas-griddles"] }
                    ],
                    right: [
                        { title: "toasters-and-panini-grills", items: ["bun-toasters", "conveyor-toasters", "panini-grills", "pop-up-toasters"] },
                        { title: "waffles-and-crepe-machines", items: ["waffle-irons", "baking-plates-and-accessories", "crepe-maker"] },
                        { title: "charbroilers", items: ["radiant-charbroilers", "lava-rock-charbroilers", "electric-charbroilers"] },
                        { title: "specialty-cooking-equipment", items: ["sous-vide-machines", "pasta-cookers", "salamander-grills", "shawarma-machines", "specialty-equipment", "steam-kettles-braising-pans"] }
                    ]
                };
            case 'refrigeration':
                return {
                    left: [
                        {
                            title: "refrigerators",
                            items: [
                                "reach-in-refrigerators",
                                "undercounter-refrigerators",
                                "work-top-refrigerators",
                                "prep-table-refrigerators",
                                "chef-base-refrigerators",
                                "display-refrigerators",
                                "merchandising-refrigerators",
                                "underbar-refrigerators",
                                "blast-chillers-freezers"
                            ]
                        }
                    ],
                    right: [
                        {
                            title: "freezers",
                            items: [
                                "reach-in-freezers",
                                "undercounter-freezers",
                                "work-top-freezers",
                                "ice-cream-dipping-cabinets",
                                "merchandising-freezers"
                            ]
                        },
                        {
                            title: "ice-cream-machines",
                            items: [
                                "countertop-ice-cream-machines",
                                "floor-mount-ice-cream-machines"
                            ]
                        }
                    ]
                };
            case 'beverage-equipment':
                return {
                    left: [
                        { title: "blenders", items: [] },
                        { title: "juicers", items: [] },
                        { title: "slushy-machines", items: [] },
                        { title: "milkshake-machines", items: [] }
                    ],
                    right: [
                        { title: "hot-beverage-dispensers", items: [] },
                        { title: "beverage-supplies-accessories", items: [] },
                        { title: "chocolate-fountains", items: [] }
                    ]
                };
            case 'commercial-ovens':
                return {
                    left: [
                        { title: "microwave-ovens", items: [] },
                        { title: "convection-ovens", items: [] },
                        { title: "high-speed-hybrid-ovens", items: [] },
                        { title: "conveyor-ovens", items: [] },
                        { title: "combi-ovens", items: [] }
                    ],
                    right: [
                        { title: "pizza-ovens", items: [] },
                        { title: "bakery-deck-ovens", items: [] },
                        { title: "cook-and-hold-ovens", items: [] },
                        { title: "oven-accessories", items: [] },
                        { title: "charcoal-ovens", items: [] }
                    ]
                };
            case 'food-preparation':
                return {
                    left: [
                        { title: "food-processing-equipment", items: ["food-processing-machines", "food-processor-blades-and-discs"] },
                        { title: "food-packaging-appliances", items: ["vacuum-sealers", "label-printers", "vacuum-sealers-accessories"] },
                        { title: "food-blenders", items: ["hand-blenders"] },
                        { title: "dehydrators", items: [] },
                        { title: "fruit-vegetable-and-salad-preparation", items: ["commercial-french-fry-cutters", "manual-vegetable-and-fruit-cutters", "peelers-dryers"] }
                    ],
                    right: [
                        { title: "food-slicers", items: [] },
                        { title: "dough-mixer", items: [] },
                        { title: "food-scales", items: [] },
                        { title: "dough-sheeters-and-dough-presses", items: [] },
                        { title: "meat-and-seafood-preparation", items: ["meat-mincer", "bone-saw-cutters", "breading-equipment", "patty-press"] },
                        { title: "pastries-decorating-equipment", items: [] }
                    ]
                };
            case 'food-holding-and-warming-line':
                return {
                    left: [
                        { title: "heat-lamps", items: [] },
                        { title: "countertop-warmers-and-display-cases", items: [] },
                        { title: "strip-warmers", items: [] }
                    ],
                    right: [
                        { title: "holding-and-proofing-cabinets", items: [] },
                        { title: "drop-in-wells", items: [] }
                    ]
                };
            case 'delivery-and-storage':
                return {
                    left: [
                        { title: "storage-shelves", items: [] },
                        { title: "storage-bins", items: [] },
                        { title: "storage-racks", items: [] }
                    ],
                    right: [
                        { title: "carts-trucks-and-dollies", items: [] },
                        { title: "delivery-bags-and-boxes", items: [] },
                        { title: "dinnerware-storage-and-transport", items: [] }
                    ]
                };
            case 'parts':
                return {
                    left: [
                        { title: "somerset-parts", items: [] },
                        { title: "amana-menumaster-parts", items: [] },
                        { title: "ansul-parts", items: [] }
                    ],
                    right: [
                        { title: "apw-parts", items: [] },
                        { title: "bakers-pride-parts", items: [] }
                    ]
                };
            case 'used-equipment':
                return {
                    left: [
                        { title: "coffee", items: [] },
                        { title: "beverage", items: [] },
                        { title: "cooking-equipment", items: [] },
                        { title: "refrigeration", items: [] }
                    ],
                    right: [
                        { title: "ice-equipment", items: [] },
                        { title: "display-and-merchandising", items: [] },
                        { title: "storage", items: [] },
                        { title: "furniture", items: [] }
                    ]
                };
            case 'dishwashing':
                return {
                    left: [
                        { title: "undercounter-dishwashers", items: [] },
                        { title: "hood-dishwashers", items: [] },
                        { title: "conveyor-dishwashers", items: [] }
                    ],
                    right: [
                        { title: "faucets", items: ["wall-mount-faucets", "deck-mount-faucets", "pre-rinse-faucets-and-spray-valves", "dipper-wells"] },
                        { title: "dish-racks", items: [] },
                        { title: "booster-heaters", items: [] }
                    ]
                };
            case 'stainless-steel-equipment':
                return {
                    left: [
                        { title: "stainless-steel-tables", items: ["stainless-steel-work-tables"] },
                        { title: "stainless-steel-sinks", items: ["mop-sink", "stainless-steel-hand-sinks"] },
                        { title: "stainless-steel-cabinets", items: [] },
                        { title: "stainless-steel-shelves", items: [] }
                    ],
                    right: [
                        { title: "stainless-steel-hoods", items: ["exhaust-hood-low-profile"] },
                        { title: "stainless-steel-trolly", items: [] },
                        { title: "stainless-steel-category", items: [] },
                        { title: "stainless-steel-ice-bins", items: [] },
                        { title: "stainless-steel-grease-traps", items: [] }
                    ]
                };
            case 'janitorial-safety-supplies':
                return {
                    left: [
                        { title: "trash-bins-and-recycling-containers", items: [] },
                        { title: "sink-waste-management", items: [] },
                        { title: "washroom-equipment", items: [] },
                        { title: "cleaning-chemicals-and-sanitizers", items: [] }
                    ],
                    right: [
                        { title: "cleaning-equipment-and-tools", items: [] },
                        { title: "insect-control", items: [] },
                        { title: "air-filters", items: [] }
                    ]
                };
            case 'water-treatment':
                return {
                    left: [
                        { title: "filters-item", items: [] },
                        { title: "reverse-osmosis", items: [] }
                    ],
                    right: [
                        { title: "water-softeners", items: [] },
                        { title: "cartridges-accessories", items: [] }
                    ]
                };
            case 'home-use':
                return {
                    left: [
                        { title: "cooking-appliances", items: [] },
                        { title: "food-preparation-appliances", items: [] }
                    ],
                    right: [
                        { title: "coffee-equipment-for-home-use", items: ["brewers-for-home-use", "manual-brewing-equipment"] },
                        { title: "coffee-for-home-use", items: [] }
                    ]
                };
            case 'dining-room':
                return {
                    left: [
                        { title: "buffetware", items: ["buffet-dispensers", "chafing-dishes"] },
                        { title: "tabletops", items: ["tableware"] }
                    ],
                    right: [
                        { title: "restaurant-furniture", items: [] }
                    ]
                };
            case 'smallwares':
                return {
                    left: [
                        { title: "cookware", items: ["sauce-pots-and-stock-pots", "fry-pans-and-sauce-pans", "cast-iron-cookware", "bakeware", "cookware-covers-and-accessories"] },
                        { title: "serving-supplies", items: ["serving-utensils-and-tools", "dry-food-dispenser-parts-and-accessories"] },
                        { title: "kitchen-hand-tools", items: [] },
                        { title: "restaurant-food-storage", items: ["food-storage-containers", "plastic-food-pans-drain-trays-and-lids", "stainless-steel-steam-table-food-pans-and-accessories"] }
                    ],
                    right: [
                        { title: "pizza-smallwares", items: ["pizza-making-tools-and-utensils", "pizza-pans", "pizza-oven-and-cooking-tools"] },
                        { title: "beverage-service-supplies", items: ["beverage-dispensers"] },
                        { title: "baking-smallwares", items: ["bakery-pans-and-cake-molds"] },
                        { title: "kitchen-supplies", items: ["cutting-boards", "skimmers-and-strainers"] },
                        { title: "kitchen-cutlery", items: [] }
                    ]
                };
            case 'disposables':
                return {
                    left: [
                        { title: "paper-eco-friendly-disposables", items: ["paper-cups", "napkins", "paper-food-trays", "straws-stirrers", "paper-bags"] }
                    ],
                    right: []
                };
            case 'food-beverage-ingredients':
                return {
                    left: [
                        { title: "ice-cream-supplies", items: [] }
                    ],
                    right: [
                        { title: "tea", items: [] }
                    ]
                };
            default:
                return [];
        }
    };

    const subcats = getSubcategories(activeCategory.slug);

    const renderFlatSubcats = (list: string[]) => (
        <div className={styles.subCatGrid}>
            {list.map(item => (
                <Link
                    key={item}
                    href={`/shop?category=${item}`}
                    className={styles.subCatItem}
                    onClick={onClose}
                >
                    <span>{tc(item)}</span>
                    <ChevronRight className={styles.itemIcon} size={16} />
                </Link>
            ))}
        </div>
    );

    const renderNestedSubcats = (data: { left: any[], right: any[] }) => (
        <div className={styles.nestedGrid}>
            <div className={styles.nestedColumn}>
                {data.left.map((group, idx) => (
                    <div key={idx} className={styles.categoryGroup}>
                        <Link
                            href={`/shop?category=${group.title}`}
                            onClick={onClose}
                            className={styles.groupTitleLink}
                        >
                            <span className={styles.groupTitle}>{tc(group.title)}</span>
                        </Link>
                        <div className={styles.groupItems}>
                            {group.items.map((item: string) => (
                                <Link
                                    key={item}
                                    href={`/shop?category=${item}`}
                                    className={styles.nestedLink}
                                    onClick={onClose}
                                >
                                    {tc(item)}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.nestedColumn}>
                {data.right.map((group, idx) => (
                    <div key={idx} className={styles.categoryGroup}>
                        <Link
                            href={`/shop?category=${group.title}`}
                            onClick={onClose}
                            className={styles.groupTitleLink}
                        >
                            <span className={styles.groupTitle}>{tc(group.title)}</span>
                        </Link>
                        <div className={styles.groupItems}>
                            {group.items.map((item: string) => (
                                <Link
                                    key={item}
                                    href={`/shop?category=${item}`}
                                    className={styles.nestedLink}
                                    onClick={onClose}
                                >
                                    {tc(item)}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <section className={`${styles.categoriesPage} ${isPopup ? styles.popupMode : ''}`}>
            <div className={styles.container}>
                <div className={`${styles.wrapper} ${isPopup ? styles.popupWrapper : ''}`}>
                    <div className={styles.sidebar}>
                        <ul className={styles.sidebarList}>
                            {categories.map((item, idx) => (
                                <li
                                    key={idx}
                                    className={`${styles.sidebarItem} ${activeIndex === idx ? styles.activeItem : ''}`}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                >
                                    <div className={styles.labelWrapper}>
                                        {item.icon && <item.icon size={18} className={styles.sidebarIcon} />}
                                        <span className={styles.sidebarLabel}>{item.name}</span>
                                    </div>
                                    <ChevronRight className={styles.chevronIcon} size={16} />
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className={styles.mainContent}>
                        <div className={styles.contentGrid}>
                            <div className={styles.contentColumn} key={activeCategory.slug}>
                                {activeCategory && (
                                    <>
                                        <h2 className={styles.columnTitle}>{activeCategory.name}</h2>
                                        <div className={styles.columnList}>
                                            {Array.isArray(subcats)
                                                ? (subcats.length > 0 ? renderFlatSubcats(subcats) : (
                                                    <div className={styles.subCatGrid}>
                                                        <h3 className={styles.subHeading}>Featured Products</h3>
                                                        <div className={styles.subCatItem}>Commercial Solutions</div>
                                                        <div className={styles.subCatItem}>Industrial Equipment</div>
                                                    </div>
                                                ))
                                                : renderNestedSubcats(subcats)
                                            }
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className={styles.brandsColumn}>
                                <h2 className={styles.brandsTitle}>{tc("top-brands")}</h2>
                                <div className={styles.brandsGrid}>
                                    {brands?.map((brand, idx) => (
                                        <Link
                                            href={`/shop?brand=${encodeURIComponent(brand.name.toLowerCase().replace(/ /g, '-'))}`}
                                            key={idx}
                                            className={styles.brandBox}
                                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                                            onClick={onClose}
                                        >
                                            {brand.logo ? (
                                                <img
                                                    src={brand.logo}
                                                    alt={brand.name}
                                                    className={styles.brandLogoImg}
                                                />
                                            ) : (
                                                <span className={styles.brandTextFallback}>{brand.name}</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CategoriesLayout;
