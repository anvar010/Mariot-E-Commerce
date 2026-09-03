/**
 * Cities offered per shipping country at checkout.
 *
 * A free-text city field is a delivery risk: "Dubay", "DXB" and a blank all reach the
 * warehouse looking like an address, and the courier finds out later. Picking from a list
 * keeps what the shop stores consistent with what it can actually ship to.
 *
 * Keyed by the exact country strings used by the checkout country select, so the two
 * cannot drift apart silently. Add a country there and it must be added here too, or the
 * field falls back to free text for it -- see CheckoutCityField.
 */
export interface City {
    /** Stored and sent to the backend. English, so orders read the same for the warehouse
     *  whichever language the customer shopped in. */
    value: string;
    ar: string;
}

export const CITIES_BY_COUNTRY: Record<string, City[]> = {
    'United Arab Emirates': [
        { value: 'Dubai', ar: 'دبي' },
        { value: 'Abu Dhabi', ar: 'أبو ظبي' },
        { value: 'Sharjah', ar: 'الشارقة' },
        { value: 'Ajman', ar: 'عجمان' },
        { value: 'Umm Al Quwain', ar: 'أم القيوين' },
        { value: 'Ras Al Khaimah', ar: 'رأس الخيمة' },
        { value: 'Fujairah', ar: 'الفجيرة' },
        { value: 'Al Ain', ar: 'العين' },
    ],
    'Saudi Arabia': [
        { value: 'Riyadh', ar: 'الرياض' },
        { value: 'Jeddah', ar: 'جدة' },
        { value: 'Mecca', ar: 'مكة المكرمة' },
        { value: 'Medina', ar: 'المدينة المنورة' },
        { value: 'Dammam', ar: 'الدمام' },
        { value: 'Al Khobar', ar: 'الخبر' },
        { value: 'Dhahran', ar: 'الظهران' },
        { value: 'Jubail', ar: 'الجبيل' },
        { value: 'Taif', ar: 'الطائف' },
        { value: 'Tabuk', ar: 'تبوك' },
        { value: 'Buraidah', ar: 'بريدة' },
        { value: 'Khamis Mushait', ar: 'خميس مشيط' },
        { value: 'Abha', ar: 'أبها' },
        { value: 'Hail', ar: 'حائل' },
        { value: 'Najran', ar: 'نجران' },
        { value: 'Yanbu', ar: 'ينبع' },
    ],
    'Oman': [
        { value: 'Muscat', ar: 'مسقط' },
        { value: 'Salalah', ar: 'صلالة' },
        { value: 'Sohar', ar: 'صحار' },
        { value: 'Nizwa', ar: 'نزوى' },
        { value: 'Sur', ar: 'صور' },
        { value: 'Ibri', ar: 'عبري' },
        { value: 'Barka', ar: 'بركاء' },
        { value: 'Rustaq', ar: 'الرستاق' },
        { value: 'Seeb', ar: 'السيب' },
    ],
    'Bahrain': [
        { value: 'Manama', ar: 'المنامة' },
        { value: 'Muharraq', ar: 'المحرق' },
        { value: 'Riffa', ar: 'الرفاع' },
        { value: 'Hamad Town', ar: 'مدينة حمد' },
        { value: 'Isa Town', ar: 'مدينة عيسى' },
        { value: 'Sitra', ar: 'سترة' },
        { value: 'Budaiya', ar: 'البديع' },
    ],
    'Kuwait': [
        { value: 'Kuwait City', ar: 'مدينة الكويت' },
        { value: 'Hawalli', ar: 'حولي' },
        { value: 'Salmiya', ar: 'السالمية' },
        { value: 'Al Farwaniyah', ar: 'الفروانية' },
        { value: 'Al Jahra', ar: 'الجهراء' },
        { value: 'Al Ahmadi', ar: 'الأحمدي' },
        { value: 'Fahaheel', ar: 'الفحيحيل' },
        { value: 'Mangaf', ar: 'المنقف' },
    ],
};

/**
 * The countries the shop ships to, in the order they are offered.
 *
 * Derived from the data above rather than typed out again, so a country can never appear
 * in a picker without a city list behind it -- which is how the checkout form and this
 * sheet came to disagree in the first place.
 */
export const SHIPPING_COUNTRIES: string[] = Object.keys(CITIES_BY_COUNTRY);

export const citiesFor = (country: string): City[] => CITIES_BY_COUNTRY[country] || [];

/** The label to show for a stored city value, in the shopper's language. */
export const cityLabel = (country: string, value: string, locale: string): string => {
    const match = citiesFor(country).find(c => c.value === value);
    if (!match) return value;
    return locale === 'ar' ? match.ar : match.value;
};
