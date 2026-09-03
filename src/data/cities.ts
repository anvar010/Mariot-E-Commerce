/**
 * Where the shop delivers, as Country -> State/Emirate -> City/Area.
 *
 * Free-text address fields are a delivery risk: "Dubay", "DXB", "Al Barsha 1" and a blank
 * all reach the warehouse looking like an address, and the courier is the one who finds
 * out. Picking down a hierarchy keeps what is stored consistent with what can be shipped
 * to, and gives operations a state to sort by rather than a dozen spellings of a town.
 *
 * Values are stored in English whatever language the shopper used, so an order reads the
 * same for the warehouse either way; the Arabic strings are for display only.
 *
 * SHIPPING_COUNTRIES is derived from this list rather than written out again, so a country
 * can never appear in a picker with nothing behind it.
 */
export interface Area {
    value: string;
    ar: string;
}

export interface State {
    value: string;
    ar: string;
    areas: Area[];
}

export interface Country {
    value: string;
    ar: string;
    states: State[];
}

export const COUNTRIES: Country[] = [
    {
        value: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة',
        states: [
            {
                value: 'Dubai', ar: 'دبي', areas: [
                    { value: 'Deira', ar: 'ديرة' },
                    { value: 'Bur Dubai', ar: 'بر دبي' },
                    { value: 'Al Karama', ar: 'الكرامة' },
                    { value: 'Al Satwa', ar: 'السطوة' },
                    { value: 'Jumeirah', ar: 'جميرا' },
                    { value: 'Al Barsha', ar: 'البرشاء' },
                    { value: 'Business Bay', ar: 'الخليج التجاري' },
                    { value: 'Downtown Dubai', ar: 'وسط مدينة دبي' },
                    { value: 'Dubai Marina', ar: 'دبي مارينا' },
                    { value: 'Jumeirah Lakes Towers', ar: 'أبراج بحيرات جميرا' },
                    { value: 'Al Quoz', ar: 'القوز' },
                    { value: 'Al Qusais', ar: 'القصيص' },
                    { value: 'Mirdif', ar: 'مردف' },
                    { value: 'Muhaisnah', ar: 'محيصنة' },
                    { value: 'Al Nahda', ar: 'النهدة' },
                    { value: 'Oud Metha', ar: 'عود ميثاء' },
                    { value: 'Al Garhoud', ar: 'القرهود' },
                    { value: 'Dubai Silicon Oasis', ar: 'واحة دبي للسيليكون' },
                    { value: 'International City', ar: 'المدينة العالمية' },
                    { value: 'Discovery Gardens', ar: 'ديسكفري جاردنز' },
                    { value: 'Jebel Ali', ar: 'جبل علي' },
                    { value: 'Dubai Investment Park', ar: 'مجمع دبي للاستثمار' },
                    { value: 'Al Warqa', ar: 'الورقاء' },
                    { value: 'Ras Al Khor', ar: 'رأس الخور' },
                    { value: 'Nad Al Sheba', ar: 'ند الشبا' },
                    { value: 'Motor City', ar: 'موتور سيتي' },
                    { value: 'Dubai Sports City', ar: 'مدينة دبي الرياضية' },
                    { value: 'Al Aweer', ar: 'العوير' },
                    { value: 'Hor Al Anz', ar: 'هور العنز' },
                ],
            },
            {
                value: 'Abu Dhabi', ar: 'أبو ظبي', areas: [
                    { value: 'Abu Dhabi City', ar: 'مدينة أبو ظبي' },
                    { value: 'Al Ain', ar: 'العين' },
                    { value: 'Musaffah', ar: 'مصفح' },
                    { value: 'Musaffah Industrial', ar: 'مصفح الصناعية' },
                    { value: 'Khalifa City', ar: 'مدينة خليفة' },
                    { value: 'Mohammed Bin Zayed City', ar: 'مدينة محمد بن زايد' },
                    { value: 'Shakhbout City', ar: 'مدينة شخبوط' },
                    { value: 'Baniyas', ar: 'بني ياس' },
                    { value: 'Al Shahama', ar: 'الشهامة' },
                    { value: 'Yas Island', ar: 'جزيرة ياس' },
                    { value: 'Saadiyat Island', ar: 'جزيرة السعديات' },
                    { value: 'Al Reem Island', ar: 'جزيرة الريم' },
                    { value: 'Al Wathba', ar: 'الوثبة' },
                    { value: 'Al Shamkha', ar: 'الشامخة' },
                    { value: 'Al Rahba', ar: 'الرحبة' },
                    // Al Dhafra, the emirate's western region. Named as its own entry as well
                    // as by town: it starts around 150km from the capital, so an order out
                    // here is a different delivery proposition from one to Musaffah, and the
                    // warehouse needs to see that before it books a courier.
                    { value: 'Al Dhafra', ar: 'الظفرة' },
                    { value: 'Madinat Zayed', ar: 'مدينة زايد' },
                    { value: 'Al Ruwais', ar: 'الرويس' },
                    { value: 'Ghayathi', ar: 'غياثي' },
                    { value: 'Liwa', ar: 'ليوا' },
                    { value: 'Mirfa', ar: 'المرفأ' },
                    { value: 'Sila', ar: 'السلع' },
                    { value: 'Delma Island', ar: 'جزيرة دلما' },
                ],
            },
            {
                value: 'Sharjah', ar: 'الشارقة', areas: [
                    { value: 'Sharjah City', ar: 'مدينة الشارقة' },
                    { value: 'Al Nahda', ar: 'النهدة' },
                    { value: 'Al Majaz', ar: 'المجاز' },
                    { value: 'Al Qasimia', ar: 'القاسمية' },
                    { value: 'Al Taawun', ar: 'التعاون' },
                    { value: 'Al Khan', ar: 'الخان' },
                    { value: 'Rolla', ar: 'الرولة' },
                    { value: 'Muweilah', ar: 'مويلح' },
                    { value: 'Industrial Area', ar: 'المنطقة الصناعية' },
                    { value: 'Al Layyah', ar: 'اللية' },
                    { value: 'Al Dhaid', ar: 'الذيد' },
                    { value: 'Khor Fakkan', ar: 'خورفكان' },
                    { value: 'Kalba', ar: 'كلباء' },
                ],
            },
            {
                value: 'Ajman', ar: 'عجمان', areas: [
                    { value: 'Ajman City', ar: 'مدينة عجمان' },
                    { value: 'Al Nuaimiya', ar: 'النعيمية' },
                    { value: 'Al Rashidiya', ar: 'الراشدية' },
                    { value: 'Al Jurf', ar: 'الجرف' },
                    { value: 'Al Mowaihat', ar: 'المويهات' },
                    { value: 'Masfout', ar: 'مصفوت' },
                    { value: 'Manama', ar: 'المنامة' },
                ],
            },
            {
                value: 'Umm Al Quwain', ar: 'أم القيوين', areas: [
                    { value: 'Umm Al Quwain City', ar: 'مدينة أم القيوين' },
                    { value: 'Al Salamah', ar: 'السلمة' },
                    { value: 'Falaj Al Mualla', ar: 'فلج المعلا' },
                ],
            },
            {
                value: 'Ras Al Khaimah', ar: 'رأس الخيمة', areas: [
                    { value: 'Ras Al Khaimah City', ar: 'مدينة رأس الخيمة' },
                    { value: 'Al Nakheel', ar: 'النخيل' },
                    { value: 'Al Hamra', ar: 'الحمراء' },
                    { value: 'Al Jazirah Al Hamra', ar: 'الجزيرة الحمراء' },
                    { value: 'Digdaga', ar: 'دقداقة' },
                    { value: 'Rams', ar: 'الرمس' },
                ],
            },
            {
                value: 'Fujairah', ar: 'الفجيرة', areas: [
                    { value: 'Fujairah City', ar: 'مدينة الفجيرة' },
                    { value: 'Dibba Al Fujairah', ar: 'دبا الفجيرة' },
                    { value: 'Masafi', ar: 'مسافي' },
                    { value: 'Qidfa', ar: 'قدفع' },
                ],
            },
        ],
    },
    {
        value: 'Saudi Arabia', ar: 'المملكة العربية السعودية',
        states: [
            {
                value: 'Riyadh Region', ar: 'منطقة الرياض', areas: [
                    { value: 'Riyadh', ar: 'الرياض' },
                    { value: 'Al Kharj', ar: 'الخرج' },
                    { value: 'Al Diriyah', ar: 'الدرعية' },
                    { value: 'Al Majmaah', ar: 'المجمعة' },
                    { value: 'Al Zulfi', ar: 'الزلفي' },
                    { value: 'Wadi Ad Dawasir', ar: 'وادي الدواسر' },
                ],
            },
            {
                value: 'Makkah Region', ar: 'منطقة مكة المكرمة', areas: [
                    { value: 'Jeddah', ar: 'جدة' },
                    { value: 'Mecca', ar: 'مكة المكرمة' },
                    { value: 'Taif', ar: 'الطائف' },
                    { value: 'Rabigh', ar: 'رابغ' },
                ],
            },
            {
                value: 'Madinah Region', ar: 'منطقة المدينة المنورة', areas: [
                    { value: 'Medina', ar: 'المدينة المنورة' },
                    { value: 'Yanbu', ar: 'ينبع' },
                    { value: 'Badr', ar: 'بدر' },
                ],
            },
            {
                value: 'Eastern Province', ar: 'المنطقة الشرقية', areas: [
                    { value: 'Dammam', ar: 'الدمام' },
                    { value: 'Al Khobar', ar: 'الخبر' },
                    { value: 'Dhahran', ar: 'الظهران' },
                    { value: 'Jubail', ar: 'الجبيل' },
                    { value: 'Al Ahsa', ar: 'الأحساء' },
                    { value: 'Qatif', ar: 'القطيف' },
                    { value: 'Ras Tanura', ar: 'رأس تنورة' },
                    { value: 'Hafar Al Batin', ar: 'حفر الباطن' },
                ],
            },
            {
                value: 'Asir Region', ar: 'منطقة عسير', areas: [
                    { value: 'Abha', ar: 'أبها' },
                    { value: 'Khamis Mushait', ar: 'خميس مشيط' },
                    { value: 'Bisha', ar: 'بيشة' },
                ],
            },
            {
                value: 'Qassim Region', ar: 'منطقة القصيم', areas: [
                    { value: 'Buraidah', ar: 'بريدة' },
                    { value: 'Unaizah', ar: 'عنيزة' },
                    { value: 'Al Rass', ar: 'الرس' },
                ],
            },
            {
                value: 'Tabuk Region', ar: 'منطقة تبوك', areas: [
                    { value: 'Tabuk', ar: 'تبوك' },
                    { value: 'Duba', ar: 'ضباء' },
                ],
            },
            { value: 'Hail Region', ar: 'منطقة حائل', areas: [{ value: 'Hail', ar: 'حائل' }] },
            { value: 'Najran Region', ar: 'منطقة نجران', areas: [{ value: 'Najran', ar: 'نجران' }] },
            { value: 'Jazan Region', ar: 'منطقة جازان', areas: [{ value: 'Jazan', ar: 'جازان' }] },
            { value: 'Al Bahah Region', ar: 'منطقة الباحة', areas: [{ value: 'Al Bahah', ar: 'الباحة' }] },
            { value: 'Northern Borders', ar: 'الحدود الشمالية', areas: [{ value: 'Arar', ar: 'عرعر' }] },
            { value: 'Al Jouf Region', ar: 'منطقة الجوف', areas: [{ value: 'Sakaka', ar: 'سكاكا' }] },
        ],
    },
    {
        value: 'Oman', ar: 'عُمان',
        states: [
            {
                value: 'Muscat', ar: 'مسقط', areas: [
                    { value: 'Muscat', ar: 'مسقط' },
                    { value: 'Seeb', ar: 'السيب' },
                    { value: 'Bawshar', ar: 'بوشر' },
                    { value: 'Mutrah', ar: 'مطرح' },
                    { value: 'Al Amerat', ar: 'العامرات' },
                    { value: 'Qurayyat', ar: 'قريات' },
                ],
            },
            {
                value: 'Dhofar', ar: 'ظفار', areas: [
                    { value: 'Salalah', ar: 'صلالة' },
                    { value: 'Mirbat', ar: 'مرباط' },
                ],
            },
            {
                value: 'Al Batinah North', ar: 'شمال الباطنة', areas: [
                    { value: 'Sohar', ar: 'صحار' },
                    { value: 'Shinas', ar: 'شناص' },
                    { value: 'Saham', ar: 'صحم' },
                ],
            },
            {
                value: 'Al Batinah South', ar: 'جنوب الباطنة', areas: [
                    { value: 'Barka', ar: 'بركاء' },
                    { value: 'Rustaq', ar: 'الرستاق' },
                ],
            },
            {
                value: 'Ad Dakhiliyah', ar: 'الداخلية', areas: [
                    { value: 'Nizwa', ar: 'نزوى' },
                    { value: 'Bahla', ar: 'بهلاء' },
                    { value: 'Izki', ar: 'إزكي' },
                ],
            },
            { value: 'Ash Sharqiyah North', ar: 'شمال الشرقية', areas: [{ value: 'Ibra', ar: 'إبراء' }] },
            { value: 'Ash Sharqiyah South', ar: 'جنوب الشرقية', areas: [{ value: 'Sur', ar: 'صور' }] },
            { value: 'Ad Dhahirah', ar: 'الظاهرة', areas: [{ value: 'Ibri', ar: 'عبري' }] },
            { value: 'Al Buraimi', ar: 'البريمي', areas: [{ value: 'Al Buraimi', ar: 'البريمي' }] },
            { value: 'Musandam', ar: 'مسندم', areas: [{ value: 'Khasab', ar: 'خصب' }] },
        ],
    },
    {
        value: 'Bahrain', ar: 'البحرين',
        states: [
            {
                value: 'Capital Governorate', ar: 'محافظة العاصمة', areas: [
                    { value: 'Manama', ar: 'المنامة' },
                    { value: 'Juffair', ar: 'الجفير' },
                    { value: 'Adliya', ar: 'العدلية' },
                    { value: 'Seef', ar: 'السيف' },
                    { value: 'Hoora', ar: 'الحورة' },
                ],
            },
            {
                value: 'Muharraq Governorate', ar: 'محافظة المحرق', areas: [
                    { value: 'Muharraq', ar: 'المحرق' },
                    { value: 'Hidd', ar: 'الحد' },
                    { value: 'Arad', ar: 'عراد' },
                    { value: 'Busaiteen', ar: 'البسيتين' },
                ],
            },
            {
                value: 'Northern Governorate', ar: 'المحافظة الشمالية', areas: [
                    { value: 'Budaiya', ar: 'البديع' },
                    { value: 'Hamad Town', ar: 'مدينة حمد' },
                    { value: 'Saar', ar: 'سار' },
                    { value: 'Janabiyah', ar: 'الجنبية' },
                    { value: 'Barbar', ar: 'باربار' },
                ],
            },
            {
                value: 'Southern Governorate', ar: 'المحافظة الجنوبية', areas: [
                    { value: 'Riffa', ar: 'الرفاع' },
                    { value: 'Isa Town', ar: 'مدينة عيسى' },
                    { value: 'Sitra', ar: 'سترة' },
                    { value: 'Zallaq', ar: 'الزلاق' },
                    { value: 'Awali', ar: 'عوالي' },
                ],
            },
        ],
    },
    {
        value: 'Kuwait', ar: 'الكويت',
        states: [
            {
                value: 'Al Asimah', ar: 'العاصمة', areas: [
                    { value: 'Kuwait City', ar: 'مدينة الكويت' },
                    { value: 'Sharq', ar: 'شرق' },
                    { value: 'Shuwaikh', ar: 'الشويخ' },
                    { value: 'Qibla', ar: 'قبلة' },
                    { value: 'Bneid Al Qar', ar: 'بنيد القار' },
                    { value: 'Adailiya', ar: 'العديلية' },
                    { value: 'Kaifan', ar: 'كيفان' },
                ],
            },
            {
                value: 'Hawalli', ar: 'حولي', areas: [
                    { value: 'Hawalli', ar: 'حولي' },
                    { value: 'Salmiya', ar: 'السالمية' },
                    { value: 'Jabriya', ar: 'الجابرية' },
                    { value: 'Bayan', ar: 'بيان' },
                    { value: 'Mishref', ar: 'مشرف' },
                    { value: 'Salwa', ar: 'سلوى' },
                    { value: 'Rumaithiya', ar: 'الرميثية' },
                ],
            },
            {
                value: 'Al Farwaniyah', ar: 'الفروانية', areas: [
                    { value: 'Farwaniya', ar: 'الفروانية' },
                    { value: 'Jleeb Al Shuyoukh', ar: 'جليب الشيوخ' },
                    { value: 'Khaitan', ar: 'خيطان' },
                    { value: 'Andalous', ar: 'الأندلس' },
                    { value: 'Riggae', ar: 'الرقعي' },
                ],
            },
            {
                value: 'Al Ahmadi', ar: 'الأحمدي', areas: [
                    { value: 'Ahmadi', ar: 'الأحمدي' },
                    { value: 'Fahaheel', ar: 'الفحيحيل' },
                    { value: 'Mangaf', ar: 'المنقف' },
                    { value: 'Abu Halifa', ar: 'أبو حليفة' },
                    { value: 'Mahboula', ar: 'المهبولة' },
                    { value: 'Fintas', ar: 'الفنطاس' },
                    { value: 'Sabahiya', ar: 'الصباحية' },
                ],
            },
            {
                value: 'Al Jahra', ar: 'الجهراء', areas: [
                    { value: 'Jahra', ar: 'الجهراء' },
                    { value: 'Saad Al Abdullah', ar: 'سعد العبدالله' },
                    { value: 'Naeem', ar: 'النعيم' },
                    { value: 'Taima', ar: 'تيماء' },
                ],
            },
            {
                value: 'Mubarak Al Kabeer', ar: 'مبارك الكبير', areas: [
                    { value: 'Mubarak Al Kabeer', ar: 'مبارك الكبير' },
                    { value: 'Sabah Al Salem', ar: 'صباح السالم' },
                    { value: 'Messila', ar: 'المسيلة' },
                    { value: 'Adan', ar: 'العدان' },
                    { value: 'Qurain', ar: 'القرين' },
                ],
            },
        ],
    },
];

/** Country names, in the order the pickers offer them. */
export const SHIPPING_COUNTRIES: string[] = COUNTRIES.map(c => c.value);

export const findCountry = (country: string): Country | undefined =>
    COUNTRIES.find(c => c.value === country);

export const statesFor = (country: string): State[] => findCountry(country)?.states || [];

export const areasFor = (country: string, state: string): Area[] =>
    statesFor(country).find(s => s.value === state)?.areas || [];

/**
 * Display label for a stored value, in the shopper's language.
 *
 * An unknown value comes back unchanged rather than blank: addresses saved before these
 * lists existed hold free text, and a shopper editing one should see what they wrote
 * instead of an empty field.
 */
export const countryLabel = (country: string, locale: string): string =>
    (locale === 'ar' ? findCountry(country)?.ar : country) || country;

export const stateLabel = (country: string, state: string, locale: string): string =>
    (locale === 'ar' ? statesFor(country).find(s => s.value === state)?.ar : state) || state;

export const areaLabel = (country: string, state: string, area: string, locale: string): string =>
    (locale === 'ar' ? areasFor(country, state).find(a => a.value === area)?.ar : area) || area;

/** Every area in a country, ignoring which state it sits in. */
export const citiesFor = (country: string): Area[] =>
    statesFor(country).flatMap(s => s.areas);
