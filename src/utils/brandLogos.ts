export const getBrandLogo = (brandName: string) => {
    if (!brandName) return null;
    const name = brandName.toLowerCase().trim();

    if (name.includes('rational')) {
        return '/assets/brands/rational.jpg.webp';
    }
    if (name.includes('robot coupe') || name.includes('robot-coupe') || name.includes('robotcoupe')) {
        return '/assets/brands/robotcoupe.jpg.webp';
    }
    if (name.includes('unox')) {
        return '/assets/brands/unox.jpg.webp';
    }
    if (name.includes('vitamix')) {
        return '/assets/brands/vitamix.jpg.webp';
    }
    if (name.includes('brema')) {
        return '/assets/brands/brema.jpg.webp';
    }
    if (name.includes('electrolux')) {
        return '/assets/brands/electrolux.jpg.webp';
    }
    if (name.includes('hoshizaki')) {
        return '/assets/brands/hoshizaki.webp';
    }
    if (name.includes('fimar')) {
        return '/assets/brands/fimar.jpg.webp';
    }
    if (name.includes('empero')) {
        return '/assets/brands/empero.jpg.webp';
    }
    return null;
};
