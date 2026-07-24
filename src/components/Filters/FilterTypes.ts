export interface FilterProps {
    // State
    inStockOnly: boolean;
    setInStockOnly: (value: boolean) => void;
    brands: any[];
    selectedBrands: string[];
    handleBrandToggle: (brandSlug: string) => void;
    allCategories: any[];
    brandCategories?: any[];
    subCategories?: any[];
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

    // Narrows the current listing by a child category without navigating away
    // (kept separate from onCategoryChange, which switches the active category).
    selectedSubCategories?: string[];
    onSubCategoryToggle?: (slug: string) => void;

    // In-place category filtering (multi-select toggle without navigation).
    // Used on the shop page (/shop, /shop?sort=newest, etc.) so selecting a
    // category acts like a filter, not a page change.
    selectedCategories?: string[];
    onCategoryToggle?: (slug: string) => void;

    // Optional customization
    title?: string;
    enableBrandFilter?: boolean;
    enableCategoryFilter?: boolean;

    // Optional extra checkbox group (e.g. Work Tables type, matched on product
    // title/description rather than category). Rendered only when options exist.
    extraFilterTitle?: string;
    extraFilterOptions?: { key: string; label: string }[];
    selectedExtraFilters?: string[];
    onExtraFilterToggle?: (key: string) => void;
}
