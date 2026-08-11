/**
 * Ready-made "Perfect For" tags, with the Arabic wording paired to each one so picking a
 * preset in the admin fills both languages at once.
 *
 * These are venue types rather than equipment types: the catalogue is already organised by
 * equipment (Combi Ovens, Bone Saw Cutters, Crepe Makers), so what a tag adds is *who buys it*.
 * The list is drawn from the segments the catalogue actually serves. Anything missing can still
 * be typed by hand in either box.
 */
export interface PerfectForPreset {
    en: string;
    ar: string;
}

export const PERFECT_FOR_PRESETS: PerfectForPreset[] = [
    { en: 'Restaurants', ar: 'مطاعم' },
    { en: 'Hotels', ar: 'فنادق' },
    { en: 'Cafés', ar: 'مقاهي' },
    { en: 'Cloud Kitchens', ar: 'مطابخ سحابية' },
    { en: 'Bakeries', ar: 'مخابز' },
    { en: 'Supermarkets', ar: 'سوبر ماركت' },
    { en: 'Catering', ar: 'تموين وضيافة' },
    { en: 'Hospitals', ar: 'مستشفيات' },
    { en: 'Pizzerias', ar: 'مطاعم بيتزا' },
    { en: 'Ice Cream Shops', ar: 'محلات آيس كريم' },
    { en: 'Juice Bars', ar: 'بارات عصائر' },
    { en: 'Butcheries', ar: 'محلات لحوم' },
    { en: 'Dessert Shops', ar: 'محلات حلويات' },
    { en: 'Coffee Roasters', ar: 'محامص قهوة' },
    { en: 'Schools & Canteens', ar: 'مدارس ومقاصف' },
    { en: 'Food Trucks', ar: 'عربات طعام' },
    { en: 'Banquet Halls', ar: 'قاعات مناسبات' },
    { en: 'Cafeterias', ar: 'كافيتيريا' },
];

const byEnglish = new Map(PERFECT_FOR_PRESETS.map(p => [p.en.toLowerCase(), p]));
const byArabic = new Map(PERFECT_FOR_PRESETS.map(p => [p.ar, p]));

/** The Arabic wording for a preset, or null when the tag was typed by hand. */
export const arabicForPreset = (english: string): string | null =>
    byEnglish.get(english.trim().toLowerCase())?.ar ?? null;

/** The English wording for an Arabic preset, used to keep the two boxes in step. */
export const englishForPreset = (arabic: string): string | null =>
    byArabic.get(arabic.trim())?.en ?? null;

/** Split a stored comma-separated tag string. Arabic lists often use the Arabic comma. */
export const splitTags = (value?: string | null): string[] =>
    String(value || '').split(/[,،]/).map(t => t.trim()).filter(Boolean);

export const joinTags = (tags: string[]): string => tags.join(', ');
