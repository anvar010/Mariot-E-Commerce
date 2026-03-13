'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/components/Admin/AdminProducts.module.css';
import { Package, Plus, Search, Edit2, Trash2, X, Upload, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';
import Loader from '@/components/shared/Loader/Loader';
import { API_BASE_URL, BASE_URL } from '@/config';
import { CATEGORIES_STRUCTURE } from '@/data/categories';

// Searchable Select Component
const SearchableSelect = ({ label, name, options, value, onChange, placeholder = "Search..." }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter((opt: any) =>
        (opt.name || opt).toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find((opt: any) => String(opt.id || opt) === String(value));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.formGroup} ref={containerRef}>
            <label>{label}</label>
            <div className={styles.customSelectWrapper}>
                <div
                    className={styles.customSelectTrigger}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedOption ? (selectedOption.name || selectedOption) : placeholder}
                    <ChevronDown size={18} className={isOpen ? styles.rotate : ''} />
                </div>

                {isOpen && (
                    <div className={styles.customSelectDropdown}>
                        <div className={styles.selectSearchBox}>
                            <Search size={14} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className={styles.selectOptionsList}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt: any) => (
                                    <div
                                        key={opt.id || opt}
                                        className={`${styles.selectOption} ${String(opt.id || opt) === String(value) ? styles.selected : ''}`}
                                        onClick={() => {
                                            onChange({ target: { name: name, value: String(opt.id || opt) } });
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                    >
                                        {opt.name || opt}
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noOptions}>No results found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SellerProducts = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const { showNotification } = useNotification();

    const [categories, setCategories] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        brand: '',
        status: 'all',
        stockStatus: 'all'
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [paginationInfo, setPaginationInfo] = useState({
        total: 0,
        totalPages: 0,
        limit: 10
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        price: '',
        discount_percentage: '0',
        offer_price: '',
        stock_quantity: '',
        category_id: '1',
        brand_id: '1',
        product_group: '',
        sub_category: '',
        image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop',
        additional_images: ['', '', ''], // Support for 3 additional images
        is_weekly_deal: false,
        is_limited_offer: false,
        is_featured: false,
        is_daily_offer: false,
        status: 'active'
    });

    useEffect(() => {
        fetchProducts();
    }, [filters, currentPage]);

    useEffect(() => {
        fetchCategories();
        fetchBrands();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/categories`, { credentials: "include" });
            const data = await res.json();
            if (data.success) setCategories(data.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const fetchBrands = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/brands`, { credentials: "include" });
            const data = await res.json();
            if (data.success) setBrands(data.data);
        } catch (error) {
            console.error('Failed to fetch brands', error);
        }
    };

    const fetchProducts = async (page = currentPage) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.category) params.append('category', filters.category);
            if (filters.brand) params.append('brand', filters.brand);
            params.append('page', String(page));
            params.append('limit', String(paginationInfo.limit));
            params.append('status', filters.status); // User selected status
            params.append('stockStatus', filters.stockStatus); // User selected stock status
            params.append('t', String(Date.now()));

            const res = await fetch(`${API_BASE_URL}/seller/products?${params.toString()}`, { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
                if (data.pagination) {
                    setPaginationInfo(prev => ({
                        ...prev,
                        total: data.total,
                        totalPages: data.pagination.totalPages
                    }));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAdditionalImageChange = (index: number, value: string) => {
        setFormData(prev => {
            const newImages = [...prev.additional_images];
            newImages[index] = value;
            return { ...prev, additional_images: newImages };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        setUploading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/upload/image`, {
                credentials: "include",
                method: 'POST',
                headers: {
                    // Actually need to get token from storage
                },
                body: formDataUpload
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => {
                    const newUrl = data.data;
                    // If primary is empty, fill it
                    if (!prev.image_url) {
                        return { ...prev, image_url: newUrl };
                    }
                    // Else fill first empty additional image
                    const newAdditional = [...prev.additional_images];
                    const emptyIndex = newAdditional.findIndex(img => !img);
                    if (emptyIndex !== -1) {
                        newAdditional[emptyIndex] = newUrl;
                        return { ...prev, additional_images: newAdditional };
                    }
                    return prev;
                });
                showNotification('Image uploaded successfully');
            } else {
                showNotification(data.message || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Upload error', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleEditClick = (product: any) => {
        setEditingId(product.id);
        // Get additional images from product.images array (excluding primary)
        const additionalImgs = product.images?.filter((img: any) => !img.is_primary).map((img: any) => img.image_url) || [];
        const paddedImages = [...additionalImgs, '', '', ''].slice(0, 3);

        const isTrue = (val: any) => val === true || val === 1 || val === '1' || val === 'true';

        setFormData({
            name: product.name,
            name_ar: product.name_ar || '',
            description: product.description || '',
            description_ar: product.description_ar || '',
            price: product.price,
            discount_percentage: product.discount_percentage || '0',
            offer_price: product.offer_price || '',
            stock_quantity: product.stock_quantity,
            category_id: product.category_id || '',
            brand_id: product.brand_id || '',
            product_group: product.product_group || product.heading || '',
            sub_category: product.sub_category || '',
            image_url: product.primary_image || product.image_url || '',
            additional_images: paddedImages,
            is_weekly_deal: isTrue(product.is_weekly_deal),
            is_limited_offer: isTrue(product.is_limited_offer),
            is_featured: isTrue(product.is_featured),
            is_daily_offer: isTrue(product.is_daily_offer),
            status: product.status || 'active'
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
            name: '',
            name_ar: '',
            description: '',
            description_ar: '',
            price: '',
            discount_percentage: '0',
            offer_price: '',
            stock_quantity: '',
            category_id: categories.length > 0 ? String(categories[0].id) : '1',
            brand_id: brands.length > 0 ? String(brands[0].id) : '1',
            product_group: '',
            sub_category: '',
            image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop',
            additional_images: ['', '', ''],
            is_weekly_deal: false,
            is_limited_offer: false,
            is_featured: false,
            is_daily_offer: false,
            status: 'active'
        });
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `${API_BASE_URL}/seller/products/${editingId}`
                : `${API_BASE_URL}/seller/products`;

            const method = editingId ? 'PUT' : 'POST';

            // Combine main image and additional images into a single array for the backend
            const images = [formData.image_url, ...formData.additional_images].filter(img => img && img.trim() !== '');

            const payload = {
                ...formData,
                images,
                is_weekly_deal: Boolean(formData.is_weekly_deal),
                is_limited_offer: Boolean(formData.is_limited_offer),
                is_featured: Boolean(formData.is_featured),
                is_daily_offer: Boolean(formData.is_daily_offer)
            };

            const res = await fetch(url, {
                credentials: "include",
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showNotification(`Product ${editingId ? 'updated' : 'added'} successfully!`);
                handleCloseModal();
                fetchProducts();
            } else {
                showNotification(data.message || 'Operation failed', 'error');
            }
        } catch (error: any) {
            console.error('Update failed:', error);
            showNotification(`An error occurred: ${error.message || 'Unknown error'}`, 'error');
        }
    };

    const handleSyncBrands = async () => {
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

        setLoading(true);
        try {
            for (const brand of initialBrands) {
                await fetch(`${API_BASE_URL}/brands`, {
                    credentials: "include",
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: brand.name, image_url: brand.logo })
                });
            }
            showNotification('Brands synced to database successfully!');
            fetchBrands();
        } catch (error) {
            showNotification('Sync failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/seller/products/${id}`, {
                method: 'DELETE',
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                showNotification('Product deleted');
                fetchProducts();
            }
        } catch (error) {
            showNotification('Failed to delete product', 'error');
        }
    };

    return (
        <div className={styles.adminProducts}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.totalBadge}>
                            <Package size={14} />
                            <span><strong>{paginationInfo.total}</strong> products</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <p>Manage your inventory and add new products to the catalog.</p>
                        <button
                            className={styles.syncBtn}
                            onClick={handleSyncBrands}
                            title="Sync brand logos to database"
                        >
                            🔄 Sync Brands
                        </button>
                    </div>
                </div>
                <button className={styles.addBtn} onClick={() => {
                    setEditingId(null);
                    setFormData({
                        name: '',
                        name_ar: '',
                        description: '',
                        description_ar: '',
                        price: '',
                        discount_percentage: '0',
                        offer_price: '',
                        stock_quantity: '',
                        category_id: categories.length > 0 ? String(categories[0].id) : '1',
                        brand_id: brands.length > 0 ? String(brands[0].id) : '1',
                        product_group: '',
                        sub_category: '',
                        image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop',
                        additional_images: ['', '', ''],
                        is_weekly_deal: false,
                        is_limited_offer: false,
                        is_featured: false,
                        is_daily_offer: false,
                        status: 'active'
                    });
                    setIsModalOpen(true);
                }}>
                    <Plus size={20} />
                    <span>Add New Product</span>
                </button>
            </div>

            <div className={styles.filtersWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        name="search"
                        placeholder="Search products by model or brand..."
                        value={filters.search}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className={styles.filterBtns}>
                    <select
                        className={styles.filterSelect}
                        name="category"
                        value={filters.category}
                        onChange={handleFilterChange}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="brand"
                        value={filters.brand}
                        onChange={handleFilterChange}
                    >
                        <option value="">All Brands</option>
                        {brands.map(brand => (
                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                    </select>
                    <select
                        className={styles.filterSelect}
                        name="stockStatus"
                        value={filters.stockStatus}
                        onChange={handleFilterChange}
                    >
                        <option value="all">Stock Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                </div>
            </div>

            <div className={styles.productsTableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Brand</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Tags</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}><Loader /></td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>No products found.</td></tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.id}>
                                    <td className={styles.productCell}>
                                        <div className={styles.productImgWrapper}>
                                            <img src={product.primary_image || product.image_url || '/assets/placeholder-image.webp'} alt={product.name} />
                                        </div>
                                        <div className={styles.productInfo}>
                                            <span className={styles.productName}>
                                                {product.name}
                                            </span>
                                            <span className={styles.productSlug}>{product.slug}</span>
                                        </div>
                                    </td>
                                    <td>{product.brand_name || 'RATIONAL'}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: 500 }}>{product.category_name || 'Equipment'}</span>
                                            {product.product_group && (
                                                <span style={{ fontSize: '11px', color: '#868e96' }}>
                                                    › {product.product_group}
                                                </span>
                                            )}
                                            {product.sub_category && (
                                                <span style={{ fontSize: '10px', color: '#adb5bd' }}>
                                                    » {product.sub_category}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.price}>
                                        {product.discount_percentage > 0 ? (
                                            <div>
                                                <div style={{ textDecoration: 'line-through', color: '#868e96', fontSize: '12px' }}>
                                                    AED {Number(product.price).toLocaleString()}
                                                </div>
                                                <div style={{ color: '#fa5252', fontWeight: 'bold' }}>
                                                    AED {Number(Number(product.offer_price) > 0 ? product.offer_price : product.price).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#20c997' }}>
                                                    {product.discount_percentage}% OFF
                                                </div>
                                            </div>
                                        ) : (
                                            `AED ${Number(product.price).toLocaleString()}`
                                        )}
                                    </td>
                                    <td>
                                        <span className={`${styles.stockBadge} ${Number(product.stock_quantity) < 10 ? styles.lowStock : ''}`}>
                                            {product.stock_quantity || 0}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.tagsCell}>
                                            {(product.is_featured === 1 || product.is_featured === '1' || product.is_featured === true) && <span className={`${styles.tag} ${styles.tagFeatured}`}>Featured</span>}
                                            {(product.is_weekly_deal === 1 || product.is_weekly_deal === '1' || product.is_weekly_deal === true) && <span className={`${styles.tag} ${styles.tagWeekly}`}>Weekly Deal</span>}
                                            {(product.is_limited_offer === 1 || product.is_limited_offer === '1' || product.is_limited_offer === true) && <span className={`${styles.tag} ${styles.tagLimited}`}>Limited</span>}
                                            {(product.is_daily_offer === 1 || product.is_daily_offer === '1' || product.is_daily_offer === true) && <span className={`${styles.tag} ${styles.tagDaily}`}>Daily Deal</span>}
                                            {!product.is_featured && !product.is_weekly_deal && !product.is_limited_offer && !product.is_daily_offer && (
                                                <span style={{ color: '#adb5bd', fontSize: '11px' }}>-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={product.status === 'draft' ? styles.statusDraft : styles.statusActive}>
                                            {product.status ? product.status.charAt(0).toUpperCase() + product.status.slice(1) : 'Active'}
                                        </span>
                                    </td>
                                    <td className={styles.actions}>
                                        <button className={styles.editBtn} onClick={() => handleEditClick(product)}><Edit2 size={16} /></button>
                                        <button className={styles.deleteBtn} onClick={() => handleDeleteProduct(product.id)}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination UI */}
                {!loading && paginationInfo.totalPages > 1 && (
                    <div className={styles.paginationWrapper}>
                        <div className={styles.paginationInfo}>
                            <span className={styles.infoLabel}>Showing</span>
                            <div className={styles.infoBadge}>
                                <strong>{(currentPage - 1) * paginationInfo.limit + 1}</strong>
                                <span className={styles.separator}>–</span>
                                <strong>{Math.min(currentPage * paginationInfo.limit, paginationInfo.total)}</strong>
                            </div>
                            <span className={styles.infoLabel}>of</span>
                            <span className={styles.totalCount}>{paginationInfo.total}</span>
                            <span className={styles.infoLabel}>products</span>
                        </div>
                        <div className={styles.paginationBtns}>
                            <button
                                className={`${styles.pageBtn} ${styles.navBtn} ${styles.prevBtn}`}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>

                            {/* Render page numbers */}
                            {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    return page === 1 ||
                                        page === paginationInfo.totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1);
                                })
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className={styles.dots}>···</span>
                                        )}
                                        <button
                                            className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))}

                            <button
                                className={`${styles.pageBtn} ${styles.navBtn} ${styles.nextBtn}`}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationInfo.totalPages))}
                                disabled={currentPage === paginationInfo.totalPages}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form className={styles.form} onSubmit={handleSaveProduct}>
                            {/* General Information Section */}
                            <div className={styles.formSection}>
                                <div className={styles.sectionTitle}>General Information</div>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Product Name (English)</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            placeholder="Product Details"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>اسم المنتج (Arabic)</label>
                                        <input
                                            type="text"
                                            name="name_ar"
                                            placeholder="تفاصيل المنتج"
                                            dir="rtl"
                                            value={formData.name_ar}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                                <div className={`${styles.formGrid} ${styles.formGroupFull}`}>
                                    <div className={styles.formGroup}>
                                        <label>Description (English)</label>
                                        <textarea
                                            name="description"
                                            placeholder="Product Description..."
                                            value={formData.description}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>وصف المنتج (Arabic)</label>
                                        <textarea
                                            name="description_ar"
                                            placeholder="وصف المنتج..."
                                            dir="rtl"
                                            value={formData.description_ar}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing and Stock Section */}
                            <div className={styles.formSection}>
                                <div className={styles.sectionTitle}>Pricing And Stock</div>
                                <div className={styles.formGridThree}>
                                    <div className={styles.formGroup}>
                                        <label>Base Price (AED)</label>
                                        <input
                                            type="number"
                                            name="price"
                                            required
                                            step="0.01"
                                            placeholder="47.55"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Stock</label>
                                        <input
                                            type="number"
                                            name="stock_quantity"
                                            required
                                            placeholder="77"
                                            value={formData.stock_quantity}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Discount (%)</label>
                                        <input
                                            type="number"
                                            name="discount_percentage"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            placeholder="10"
                                            value={formData.discount_percentage}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                                {formData.discount_percentage && parseFloat(formData.discount_percentage) > 0 && (
                                    <div className={styles.formGroup}>
                                        <label>Offer Price (AED)</label>
                                        <input
                                            type="number"
                                            name="offer_price"
                                            step="0.01"
                                            placeholder="Auto-calculated from discount"
                                            value={formData.offer_price}
                                            onChange={handleInputChange}
                                        />
                                        {!formData.offer_price && formData.price && (
                                            <small style={{ color: '#51cf66', fontSize: '12px' }}>
                                                Auto: AED {(parseFloat(formData.price) * (1 - parseFloat(formData.discount_percentage) / 100)).toFixed(2)}
                                            </small>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Category Section */}
                            <div className={styles.formSection}>
                                <div className={styles.sectionTitle}>Category</div>
                                <div className={styles.formGrid}>
                                    <SearchableSelect
                                        label="Category Main"
                                        name="category_id"
                                        options={categories}
                                        value={formData.category_id}
                                        onChange={(e: any) => {
                                            handleInputChange(e);
                                            // Reset product_group and sub_category when category changes
                                            setFormData(prev => ({ ...prev, product_group: '', sub_category: '' }));
                                        }}
                                        placeholder="Select Category Main"
                                    />
                                    <SearchableSelect
                                        label="Brand"
                                        name="brand_id"
                                        options={brands}
                                        value={formData.brand_id}
                                        onChange={handleInputChange}
                                        placeholder="Select Brand"
                                    />
                                </div>

                                {formData.category_id && (
                                    <div className={styles.formGrid} style={{ marginTop: '15px' }}>
                                        {/* Group Selection */}
                                        {(() => {
                                            const selectedCat = categories.find(c => String(c.id) === String(formData.category_id));
                                            if (!selectedCat) return null;

                                            const structure = CATEGORIES_STRUCTURE[selectedCat.slug];
                                            if (!structure || Array.isArray(structure)) return null;

                                            const headingOptions = [...(structure.left || []).map(g => g.title), ...(structure.right || []).map(g => g.title)];
                                            if (headingOptions.length === 0) return null;

                                            return (
                                                <SearchableSelect
                                                    label="Group"
                                                    name="product_group"
                                                    options={headingOptions}
                                                    value={formData.product_group}
                                                    onChange={(e: any) => {
                                                        handleInputChange(e);
                                                        setFormData(prev => ({ ...prev, sub_category: '' }));
                                                    }}
                                                    placeholder="Select Group"
                                                />
                                            );
                                        })()}

                                        {/* Sub-category Selection */}
                                        {formData.product_group && (() => {
                                            const selectedCat = categories.find(c => String(c.id) === String(formData.category_id));
                                            if (!selectedCat) return null;

                                            const structure = CATEGORIES_STRUCTURE[selectedCat.slug];
                                            if (!structure || Array.isArray(structure)) return null;

                                            const allGroups = [...(structure.left || []), ...(structure.right || [])];
                                            const group = allGroups.find(g => g.title === formData.product_group);
                                            if (!group || !group.items) return null;

                                            return (
                                                <SearchableSelect
                                                    label="Sub-category (Optional)"
                                                    name="sub_category"
                                                    options={group.items}
                                                    value={formData.sub_category}
                                                    onChange={handleInputChange}
                                                    placeholder="Select Sub-category"
                                                />
                                            );
                                        })()}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="is_featured"
                                            checked={formData.is_featured}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                                        />
                                        Featured
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="is_weekly_deal"
                                            checked={formData.is_weekly_deal}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                console.log('Weekly Deal Changed:', checked);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    is_weekly_deal: checked,
                                                    is_limited_offer: checked ? false : prev.is_limited_offer
                                                }));
                                            }}
                                        />
                                        Weekly Deal
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="is_limited_offer"
                                            checked={formData.is_limited_offer}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                console.log('Limited Offer Changed:', checked);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    is_limited_offer: checked,
                                                    is_weekly_deal: checked ? false : prev.is_weekly_deal
                                                }));
                                            }}
                                        />
                                        Limited Offer
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="is_daily_offer"
                                            checked={formData.is_daily_offer}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_daily_offer: e.target.checked }))}
                                        />
                                        Daily Offer
                                    </label>
                                </div>
                                <div className={styles.formGroup} style={{ marginTop: '20px' }}>
                                    <label>Product Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="active">Active</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>

                            {/* Pictures Section */}
                            <div className={styles.formSection}>
                                <div className={styles.sectionTitle}>Pictures</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                                    {[formData.image_url, ...formData.additional_images].map((img, index) => (
                                        img && (
                                            <div key={index} style={{
                                                width: '100px',
                                                height: '100px',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                border: '1px solid #dee2e6'
                                            }}>
                                                <img src={img} alt={`Product ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Remove image logic with shifting
                                                        const currentImages = [formData.image_url, ...formData.additional_images];
                                                        currentImages.splice(index, 1);
                                                        currentImages.push(''); // Maintain length

                                                        setFormData(prev => ({
                                                            ...prev,
                                                            image_url: currentImages[0] || '',
                                                            additional_images: [currentImages[1] || '', currentImages[2] || '', currentImages[3] || '']
                                                        }));
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '4px',
                                                        insetInlineEnd: '4px',
                                                        background: 'rgba(255, 255, 255, 0.9)',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '24px',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: '#fa5252',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                                {index === 0 && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '0',
                                                        insetInlineStart: '0',
                                                        insetInlineEnd: '0',
                                                        background: 'rgba(0,0,0,0.5)',
                                                        color: 'white',
                                                        fontSize: '10px',
                                                        textAlign: 'center',
                                                        padding: '2px'
                                                    }}>Main</div>
                                                )}
                                            </div>
                                        )
                                    ))}

                                    {/* Add Button - Shows if there's space (< 4 images total, effectively) */}
                                    {(!formData.image_url || formData.additional_images.some(img => !img)) && (
                                        <div style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '12px',
                                            border: '2px dashed #dee2e6',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: uploading ? 'default' : 'pointer',
                                            backgroundColor: '#f8f9fa',
                                            position: 'relative'
                                        }}
                                            onClick={() => !uploading && document.getElementById('image-upload-input')?.click()}
                                        >
                                            <input
                                                id="image-upload-input"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <div style={{ fontSize: '12px', color: '#adb5bd' }}>...</div>
                                            ) : (
                                                <>
                                                    <Upload size={24} color="#adb5bd" />
                                                    <span style={{ fontSize: '11px', color: '#868e96', marginTop: '4px' }}>Add Photo</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#adb5bd', marginTop: '8px' }}>
                                    First image is the main product image.
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    {editingId ? 'Update Product' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerProducts;
