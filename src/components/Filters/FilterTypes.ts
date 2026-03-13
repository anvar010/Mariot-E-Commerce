export interface FilterProps {
    // State
    inStockOnly: boolean;
    setInStockOnly: (value: boolean) => void;
    brands: any[];
    selectedBrands: string[];
    handleBrandToggle: (brandSlug: string) => void;
    allCategories: any[];
    activeCategory: string | null;
    minPrice: number;
    setMinPrice: (value: number) => void;
    maxPrice: number;
    setMaxPrice: (value: number) => void;

    // Actions
    resetFilters: () => void;
    toggleSection: (section: string) => void;
    expandedSections: string[];
    onCategoryChange: (slug: string) => void;

    // Optional customization
    title?: string;
    enableBrandFilter?: boolean;
    enableCategoryFilter?: boolean;
}
