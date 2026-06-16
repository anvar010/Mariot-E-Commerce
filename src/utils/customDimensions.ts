// Format a product's custom-dimension map into a localized label string.
// `dims` is the structured map stored on cart/order items, e.g. { width: 33, height: 100 }.
// `tDim` is a next-intl translator bound to the 'product' namespace (has width/depth/height/cm).
// Returns e.g. "العرض: 33سم / الارتفاع: 100سم" (ar) or "Width: 33cm / Height: 100cm" (en).
type DimMap = Record<string, number | string> | null | undefined;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function customDimParts(dims: DimMap, tDim: (key: any, values?: any) => string): string[] {
    if (!dims || typeof dims !== 'object') return [];
    const cm = tDim('cm', { defaultValue: 'cm' });
    return Object.entries(dims).map(([dim, val]) => {
        const label = tDim(dim as any, { defaultValue: cap(dim) });
        return `${label}: ${val}${cm}`;
    });
}

export function formatCustomDims(dims: DimMap, tDim: (key: any, values?: any) => string): string {
    return customDimParts(dims, tDim).join(' / ');
}
