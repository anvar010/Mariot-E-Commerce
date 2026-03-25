'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BrandsLayout.module.css';
import { Link } from '@/i18n/navigation';
import { Truck, ShieldCheck, Award } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { API_BASE_URL, BASE_URL } from '@/config';

const categories = [
    "All", "Cooking", "Refrigeration-line", "Coffee & Bar", "Bakery", "Food Processing", "Snack Maker", "Laundry & Dish Washer", "Super Market", "Dry Store"
];

/*
const initialBrands = [
    { name: "3MF", logo: "/assets/brands/3mf.jpg.webp" },
    { name: "ALTO-SHAAM", logo: "/assets/brands/Alto-Shaam.png.webp" },
    { name: "Anfim", logo: "/assets/brands/anfilm.png.webp" },
    { name: "APW Wyott", logo: "/assets/brands/apwwyott.png.webp" },
    { name: "ASAKI", logo: "/assets/brands/asaki-logo.jpg.webp" },
    { name: "BERJAYA", logo: "/assets/brands/Berjaya-Logo.jpg.webp" },
    { name: "blendtec", logo: "/assets/brands/Blendec-logo.png.webp" },
    { name: "BREMA", logo: "/assets/brands/brema.jpg.webp" },
    { name: "CAMRY", logo: "/assets/brands/camry.jpg.webp" },
    { name: "capinox", logo: "/assets/brands/capinox.jpg.webp" },
    { name: "COFRIMELL", logo: "/assets/brands/cofrimell.jpg.webp" },
    { name: "Desmon", logo: "/assets/brands/desmon.png.webp" },
    { name: "EASYLINE", logo: "/assets/brands/easyline.jpg.webp" },
    { name: "Electrolux", logo: "/assets/brands/electrolux.jpg.webp" },
    { name: "GG F", logo: "/assets/brands/ggf-logo.jpg.webp" },
    { name: "EMPERO", logo: "/assets/brands/empero.jpg.webp" },
    { name: "FAGOR", logo: "/assets/brands/FagorProfesional.png.webp" },
    { name: "ACE FILTERS", logo: "/assets/brands/Falater.png.webp" },
    { name: "fimar", logo: "/assets/brands/fimar.jpg.webp" },
    { name: "Frymaster", logo: "/assets/brands/FRYMASTER.png.webp" },
    { name: "GEL MATIC", logo: "/assets/brands/gelmatic.jpg.webp" },
    { name: "GHS", logo: "/assets/brands/ghs.jpg.webp" },
    { name: "Hamilton Beach", logo: "/assets/brands/hamilton-logo.jpg.webp" },
    { name: "Hatco", logo: "/assets/brands/hacto.jpg.webp" },
    { name: "HENNY PENNY", logo: "/assets/brands/hennypenny.jpg.webp" },
    { name: "HCONVED", logo: "/assets/brands/hoonved.jpg.webp" },
    { name: "IMESA", logo: "/assets/brands/imesa.jpg.webp" },
    { name: "IMPERIAL", logo: "/assets/brands/IMPERIAL.png.webp" },
    { name: "INFRICO", logo: "/assets/brands/inofrigo.jpg.webp" },
    { name: "JOSPER", logo: "/assets/brands/josper.jpg.webp" },
    { name: "KITCHENAID", logo: "/assets/brands/Kitchen-Aid.png.webp" },
    { name: "LA MARZOCCO", logo: "/assets/brands/La-Marzocco.png.webp" },
    { name: "La Minerva", logo: "/assets/brands/LA-MINERVA.png.webp" },
    { name: "LA CIMBALI", logo: "/assets/brands/lacimbali.jpg.webp" },
    { name: "Longoni", logo: "/assets/brands/Longoni-Brand.png.webp" },
    { name: "mac.pan", logo: "/assets/brands/macpac.jpg.webp" },
    { name: "MAHLKONIG", logo: "/assets/brands/MAHLKONIG-vector-logo.png.webp" },
    { name: "MARIOT", logo: "/assets/brands/mariot.jpg.webp" },
    { name: "MARIOT FABRICATION", logo: "/assets/brands/fabrication.webp" },
    { name: "MBM", logo: "/assets/brands/mbm-logo.jpg.webp" },
    { name: "MENUMASTER", logo: "/assets/brands/menumaster.jpg.webp" },
    { name: "MERRYCHEF", logo: "/assets/brands/merrychef.png.webp" },
    { name: "Middleby Marshall", logo: "/assets/brands/middleby-marshall-logo.gif.webp" },
    { name: "miska", logo: "/assets/brands/Logo-MiskaFoodTechnology1.jpg.webp" },
    { name: "MKE-MATIC", logo: "/assets/brands/mke-logo.jpg.webp" },
    { name: "MOEL", logo: "/assets/brands/moel.jpg.webp" },
    { name: "MONOLITH", logo: "/assets/brands/monolith.jpg.webp" },
    { name: "nuova SIMONELLI", logo: "/assets/brands/simonelli.jpg.webp" },
    { name: "OMEGA", logo: "/assets/brands/Omega.png.webp" },
    { name: "oztiryakiler", logo: "/assets/brands/oztriyakiler.jpg.webp" },
    { name: "PITCO", logo: "/assets/brands/pitco.jpg.webp" },
    { name: "POSLIX", logo: "/assets/brands/poslix.jpg.webp" },
    { name: "PRINCE CASTLE", logo: "/assets/brands/prince-casle.png.webp" },
    { name: "RANCILIO", logo: "/assets/brands/Rancilio-logo-1.png.webp" },
    { name: "RATIONAL", logo: "/assets/brands/rational.jpg.webp" },
    { name: "RED FOX", logo: "/assets/brands/redfox.jpg.webp" },
    { name: "robot coupe", logo: "/assets/brands/robotcoupe.jpg.webp" },
    { name: "ROLLER GRILL", logo: "/assets/brands/roller-grill.jpg.webp" },
    { name: "ROTONDI", logo: "/assets/brands/Rotondi-Group.png.webp" },
    { name: "SAB", logo: "/assets/brands/sab.jpg.webp" },
    { name: "samixir", logo: "/assets/brands/samixir.jpg.webp" },
    { name: "SANTOS", logo: "/assets/brands/santos.jpg.webp" },
    { name: "SAP", logo: "/assets/brands/sap-bone-saw-machine-in-dubai.png.webp" },
    { name: "SHEFFIELD", logo: "/assets/brands/Sheffiel.png.webp" },
    { name: "SOFINOR", logo: "/assets/brands/sofinor.jpg.webp" },
    { name: "SOUTHBEND", logo: "/assets/brands/southbend.jpg.webp" },
    { name: "SPACEMAN", logo: "/assets/brands/20210329_Spaceman-Logo_Black.png.webp" },
    { name: "Speed Queen", logo: "/assets/brands/Speed-Queen.png.webp" },
    { name: "STAR", logo: "/assets/brands/star.jpg.webp" },
    { name: "TOASTMASTER", logo: "/assets/brands/Toastmaster.png.webp" },
    { name: "UNION", logo: "/assets/brands/Union.png.webp" },
    { name: "VULCAN", logo: "/assets/brands/VULCAN-BRAND.png.webp" },
    { name: "SERVER", logo: "/assets/brands/server.jpg.webp" },
    { name: "STILCO", logo: "/assets/brands/stilco1.jpg.webp" },
    { name: "TECHNOCOOLER", logo: "/assets/brands/technocooler.jpg.webp" },
    { name: "TECNODOM", logo: "/assets/brands/tecnodom.jpg.webp" },
    { name: "UEBERMILK", logo: "/assets/brands/uebermilk_logo_small.png.webp" },
    { name: "UNOX", logo: "/assets/brands/unox.jpg.webp" },
    { name: "VITAMIX", logo: "/assets/brands/vitamix.jpg.webp" },
    { name: "BATTISTELLA", logo: "/assets/brands/BATTISTELLA-1.webp" },
    { name: "BILAIT", logo: "/assets/brands/BILAIT-Logo.webp" },
    { name: "VITO", logo: "/assets/brands/VITO-OIL-FILTER-SYSTEM.png.webp" },
    { name: "Zemic", logo: "/assets/brands/Zemic-Europe.png.webp" },
    { name: "Zumex", logo: "/assets/brands/Zumex.png.webp" },
    { name: "Ailipu", logo: "/assets/brands/ailipu-1.webp" },
    { name: "Bimatic", logo: "/assets/brands/bimatic.webp" },
    { name: "Bunn", logo: "/assets/brands/bunn.webp" },
    { name: "Grindmaster", logo: "/assets/brands/grindmaster.webp" },
    { name: "Hoshizaki", logo: "/assets/brands/hoshizaki.webp" },
    { name: "Mussana", logo: "/assets/brands/mussana.webp" },
    { name: "Pastaline", logo: "/assets/brands/pastaline.webp" },
    { name: "Salva", logo: "/assets/brands/salva.webp" },
    { name: "Snooker", logo: "/assets/brands/snooker-1.webp" },
    { name: "Turbo Chef", logo: "/assets/brands/turbo-chef.webp" },
    { name: "Venarro", logo: "/assets/brands/venarro.jpg.webp" },
    { name: "Venix", logo: "/assets/brands/venix.jpg.webp" },
    { name: "Warning", logo: "/assets/brands/warning.jpg.webp" },
    { name: "Zmatik", logo: "/assets/brands/zmatik-1.webp" }
];

const brandCategories: { [key: string]: string } = {
    "RATIONAL": "Cooking",
    "UNOX": "Cooking",
    "FAGOR": "Cooking",
    "ALTO-SHAAM": "Cooking",
    "VULCAN": "Cooking",
    "SOUTHBEND": "Cooking",
    "MERRYCHEF": "Cooking",
    "MENUMASTER": "Cooking",
    "Middleby Marshall": "Cooking",
    "PITCO": "Cooking",
    "Frymaster": "Cooking",
    "HENNY PENNY": "Cooking",
    "JOSPER": "Cooking",
    "ROLLER GRILL": "Cooking",
    "STAR": "Cooking",
    "TOASTMASTER": "Cooking",
    "TECNODOM": "Refrigeration-line",
    "Hoshizaki": "Refrigeration-line",
    "INFRICO": "Refrigeration-line",
    "Desmon": "Refrigeration-line",
    "TECHNOCOOLER": "Refrigeration-line",
    "BREMA": "Refrigeration-line",
    "GEL MATIC": "Coffee & Bar",
    "COFRIMELL": "Coffee & Bar",
    "LA MARZOCCO": "Coffee & Bar",
    "LA CIMBALI": "Coffee & Bar",
    "RANCILIO": "Coffee & Bar",
    "Anfim": "Coffee & Bar",
    "MAHLKONIG": "Coffee & Bar",
    "nuova SIMONELLI": "Coffee & Bar",
    "Bunn": "Coffee & Bar",
    "VITAMIX": "Coffee & Bar",
    "blendtec": "Coffee & Bar",
    "Hamilton Beach": "Coffee & Bar",
    "samixir": "Coffee & Bar",
    "Zumex": "Coffee & Bar",
    "fimar": "Food Processing",
    "mac.pan": "Bakery",
    "Zmatik": "Bakery",
    "Pastaline": "Bakery",
    "Salva": "Bakery",
    "SAB": "Coffee & Bar",
    "MONOLITH": "Food Processing",
    "robot coupe": "Food Processing",
    "La Minerva": "Food Processing",
    "SANTOS": "Coffee & Bar",
    "Bimatic": "Food Processing",
    "Grindmaster": "Coffee & Bar",
    "Warning": "Food Processing",
    "IMESA": "Laundry & Dish Washer",
    "HCONVED": "Laundry & Dish Washer",
    "Speed Queen": "Laundry & Dish Washer",
    "Winterhalter": "Laundry & Dish Washer",
    "ASAKI": "Food Processing",
    "GHS": "Food Processing",
    "POSLIX": "All",
    "Zemic": "All",
    "3MF": "Dry Store",
    "CAMRY": "Dry Store",
};
*/

const BrandsLayout = () => {
    const t = useTranslations('brandsPage');
    const locale = useLocale();
    const isArabic = locale === 'ar';
    const [activeCategory, setActiveCategory] = useState("All");
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const filterScrollRef = useRef<HTMLDivElement>(null);
    const [isDraggingFilter, setIsDraggingFilter] = useState(false);
    const [startXFilter, setStartXFilter] = useState(0);
    const [scrollLeftFilter, setScrollLeftFilter] = useState(0);

    const handleFilterMouseDown = (e: React.MouseEvent) => {
        if (!filterScrollRef.current) return;
        setIsDraggingFilter(true);
        setStartXFilter(e.pageX - filterScrollRef.current.offsetLeft);
        setScrollLeftFilter(filterScrollRef.current.scrollLeft);
        e.preventDefault();
    };

    const handleFilterMouseLeave = () => setIsDraggingFilter(false);
    const handleFilterMouseUp = () => setIsDraggingFilter(false);
    const handleFilterMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingFilter || !filterScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - filterScrollRef.current.offsetLeft;
        const walk = (x - startXFilter) * 1.1;
        filterScrollRef.current.scrollLeft = scrollLeftFilter - walk;
    };

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/brands`, { credentials: "include" });
                const data = await res.json();
                if (data.success) {
                    setBrands(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch brands:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBrands();
    }, []);

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('localhost:5000')) {
            return url.replace('http://localhost:5000', BASE_URL);
        }
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;
        return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const getLogo = (brand: any) => {
        return resolveUrl(brand.image_url || brand.logo);
    };

    const activeBrands = brands.filter(b => b.is_active === 1 || b.is_active === true || String(b.is_active) === '1');

    const filteredBrands = activeCategory === "All"
        ? activeBrands
        : activeBrands.filter((brand) => {
            if (!brand.brand_type) return false;
            const categories = brand.brand_type.split(',').map((c: string) => c.trim());
            return categories.includes(activeCategory);
        });

    return (
        <div className={styles.brandsPage}>
            <div className={styles.fullWidthContainer}>
                <div
                    className={styles.categoryFilters}
                    ref={filterScrollRef}
                    onMouseDown={handleFilterMouseDown}
                    onMouseLeave={handleFilterMouseLeave}
                    onMouseUp={handleFilterMouseUp}
                    onMouseMove={handleFilterMouseMove}
                    style={{ cursor: isDraggingFilter ? 'grabbing' : 'grab' }}
                >
                    {categories.map((category) => (
                        <button
                            key={category}
                            className={`${styles.filterBtn} ${activeCategory === category ? styles.active : ''}`}
                            onClick={() => setActiveCategory(category)}
                        >
                            {t(`categories.${category}`)}
                        </button>
                    ))}
                </div>

                <div className={styles.brandsGrid}>
                    {loading ? (
                        Array.from({ length: 14 }).map((_, i) => (
                            <div key={i} className={styles.skeletonCard} />
                        ))
                    ) : filteredBrands.map((brand, index) => {
                        const logoUrl = getLogo(brand);
                        return (
                            <Link
                                key={index}
                                href={`/shop?brand=${encodeURIComponent(brand.slug || brand.name.toLowerCase().replace(/ /g, '-'))}`}
                                className={styles.brandCard}
                            >
                                <div className={styles.brandLogo}>
                                    {logoUrl ? (
                                        <img src={logoUrl} alt={isArabic && brand.name_ar ? brand.name_ar : brand.name} className={styles.logoImg} />
                                    ) : (
                                        <span className={styles.brandName}>{isArabic && brand.name_ar ? brand.name_ar : brand.name}</span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className={styles.container}>
                <div className={styles.aboutSection}>
                    <div className={styles.aboutHeader}>
                        <div className={styles.aboutText}>
                            <h1 className={styles.aboutTitle}>{t('aboutTitle')}</h1>
                            <p>
                                {t('desc1')}
                            </p>
                            <p>
                                {t('desc2')}
                            </p>
                            <p>
                                {t('desc3')}
                            </p>

                            <div className={styles.boldCallout}>
                                <p>
                                    <strong>{t('callout1')}</strong>
                                </p>
                                <p>
                                    <strong>{t('callout2')}</strong>
                                </p>
                            </div>
                        </div>
                        <div className={styles.aboutImageContainer}>
                            <div className={styles.aboutImageBg}>
                                <img src="/assets/mariot-logo.webp" alt="Mariot Official" className={styles.aboutLogo} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.badgesWrapper}>
                        <div className={styles.badge}>
                            <span>{t('freeShipping')}</span>
                            <Truck size={20} />
                        </div>
                        <div className={styles.badge}>
                            <span>{t('safeShopping')}</span>
                            <ShieldCheck size={20} />
                        </div>
                        <div className={styles.badge}>
                            <span>{t('warranty')}</span>
                            <Award size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

};

export default BrandsLayout;
