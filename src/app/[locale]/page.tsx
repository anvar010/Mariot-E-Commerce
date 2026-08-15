import dynamic from 'next/dynamic';
import Header from '@/components/Layout/Header/Header';
import Hero from '@/components/Home/Hero/Hero';

// Above-fold sections — SSR but CSS is code-split (not render-blocking)
const BrandsBrowse = dynamic(() => import('@/components/Home/BrandsBrowse/BrandsBrowse'), { ssr: true });
const CategoryBrowse = dynamic(() => import('@/components/Home/CategoryBrowse/CategoryBrowse'), { ssr: true });
const Reveal = dynamic(() => import('@/components/shared/Reveal/Reveal'), { ssr: true });
import { sortByOrderIndex } from '@/utils/sortByOrderIndex';

// Below-fold sections — deferred to keep initial CSS bundle small
const NewArrivals = dynamic(() => import('@/components/Home/NewArrivals/NewArrivals'));
const LimitedOffers = dynamic(() => import('@/components/Home/LimitedOffers/LimitedOffers'));
const WeeklyDeals = dynamic(() => import('@/components/Home/WeeklyDeals/WeeklyDeals'));
const CategoryHomeSection = dynamic(() => import('@/components/Home/CategoryHomeSection/CategoryHomeSection'));
const AboutSection = dynamic(() => import('@/components/Home/AboutSection/AboutSection'));
const Footer = dynamic(() => import('@/components/Layout/Footer/Footer'));

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

async function getHomeData(locale: string) {
    const isRtl = locale === 'ar';
    try {
        const [cmsRes, limitedRes, weeklyRes, newArrivalsRes, categoriesRes, brandsRes] = await Promise.all([
            fetch(`${API_BASE_URL_SERVER}/cms/homepage`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(8000) }),
            fetch(`${API_BASE_URL_SERVER}/products?is_limited_offer=true&limit=8`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) }),
            fetch(`${API_BASE_URL_SERVER}/products?is_weekly_deal=true`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) }),
            fetch(`${API_BASE_URL_SERVER}/products?sort=newest&limit=12`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) }),
            fetch(`${API_BASE_URL_SERVER}/categories`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) }),
            fetch(`${API_BASE_URL_SERVER}/brands?all=1`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) })
        ]);

        const cmsData = await cmsRes.json();
        const limitedData = await limitedRes.json();
        const weeklyData = await weeklyRes.json();
        const newArrivalsData = await newArrivalsRes.json();
        const categoriesData = await categoriesRes.json();
        const brandsData = await brandsRes.json();

        let heroSlides = [];
        let heroPosters = [];
        if (cmsData.success) {
            if (cmsData.data.hero) {
                const heroData = Array.isArray(cmsData.data.hero) ? cmsData.data.hero : [];
                heroSlides = heroData.map((slide: any) => ({
                    tagline: isRtl && slide.tagline_ar ? slide.tagline_ar : (slide.tagline || "SPECIAL OFFER"),
                    title: isRtl && slide.title_ar ? slide.title_ar : slide.title,
                    subtitle: "",
                    description: isRtl && slide.description_ar ? slide.description_ar : slide.description,
                    image: isRtl && slide.image_ar ? slide.image_ar : slide.image,
                    imageMobile: isRtl
                        ? (slide.image_mobile_ar || slide.image_mobile || '')
                        : (slide.image_mobile || ''),
                    accent: slide.accent || "#4c6ef5",
                    link: slide.link || "/shopnow",
                    btnText: isRtl && slide.btnText_ar ? slide.btnText_ar : (slide.btnText || "Shop Now")
                }));
            }
            if (cmsData.data.hero_posters) {
                heroPosters = Array.isArray(cmsData.data.hero_posters)
                    ? cmsData.data.hero_posters.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                    : [];
            }
        }

        const mainCategories = categoriesData?.success
            ? sortByOrderIndex(categoriesData.data.filter((c: any) => c.type === 'main_category' && c.is_active))
            : [];

        const allBrands = brandsData?.success ? brandsData.data : [];

        // Dynamic home sections: main categories flagged "Show on Home Page" (with a poster).
        // Each renders a poster card + a slider of that category's products.
        const flaggedSections = mainCategories.filter((c: any) => c.show_on_home);
        const homeSections = await Promise.all(
            flaggedSections.map(async (c: any) => {
                let products = [];
                try {
                    const res = await fetch(`${API_BASE_URL_SERVER}/products?category=${encodeURIComponent(c.slug)}&limit=12`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
                    const data = await res.json();
                    products = data.success ? data.data : [];
                } catch {
                    products = [];
                }
                return {
                    id: c.id,
                    slug: c.slug,
                    title: isRtl && c.name_ar ? c.name_ar : c.name,
                    posterUrl: c.home_poster_url || null,
                    posterUrlAr: c.home_poster_url_ar || null,
                    products
                };
            })
        );

        return {
            heroSlides,
            heroPosters,
            limitedProducts: limitedData.success ? limitedData.data : [],
            weeklyProducts: weeklyData.success ? weeklyData.data : [],
            newArrivals: newArrivalsData.success ? newArrivalsData.data : [],
            homeSections,
            categories: mainCategories,
            brands: allBrands
        };
    } catch (e) {
        console.error("Home server fetch failed", e);
        return { heroSlides: [], heroPosters: [], limitedProducts: [], weeklyProducts: [], newArrivals: [], homeSections: [], categories: [], brands: [] };
    }
}

export default async function Home(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;

    const {
        locale
    } = params;

    const data = await getHomeData(locale);

    const localBusinessJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: 'Mariot Kitchen Equipment',
        image: 'https://mariotstore.com/assets/mariot-logo.webp',
        url: 'https://mariotstore.com',
        logo: 'https://mariotstore.com/assets/mariot-logo.webp',
        description: 'Commercial kitchen equipment supplier in Dubai, UAE. Coffee machines, refrigeration, bakery ovens and cooking ranges, delivered across the GCC and worldwide.',
        telephone: '+971-4-288-2777',
        priceRange: 'AED',
        // Delivery coverage. Search engines use areaServed to decide which regional
        // queries this business can answer, so the GCC markets are listed explicitly
        // rather than left implied by the Dubai address.
        areaServed: [
            { '@type': 'Country', name: 'United Arab Emirates' },
            { '@type': 'Country', name: 'Saudi Arabia' },
            { '@type': 'Country', name: 'Kuwait' },
            { '@type': 'Country', name: 'Oman' },
            { '@type': 'Country', name: 'Qatar' },
            { '@type': 'Country', name: 'Bahrain' },
        ],
        address: {
            '@type': 'PostalAddress',
            addressLocality: 'Dubai',
            addressRegion: 'Dubai',
            addressCountry: 'AE'
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: '25.2048',
            longitude: '55.2708'
        },
        openingHoursSpecification: [
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '09:00',
                closes: '20:00'
            }
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+971-4-288-2777',
            contactType: 'customer service',
            areaServed: ['AE', 'SA', 'KW', 'OM', 'QA', 'BH'],
            availableLanguage: ['en', 'ar']
        }
    };

    return (
        <main>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
            <Header />
            <Hero initialSlides={data.heroSlides} />
            <Reveal key="reveal-brands"><BrandsBrowse initialBrands={data.brands} /></Reveal>
            <Reveal key="reveal-categories"><CategoryBrowse initialCategories={data.categories} /></Reveal>
            <Reveal key="reveal-new-arrivals"><NewArrivals initialProducts={data.newArrivals} /></Reveal>
            <Reveal key="reveal-limited"><LimitedOffers initialProducts={data.limitedProducts} /></Reveal>
            <Reveal key="reveal-weekly"><WeeklyDeals initialProducts={data.weeklyProducts} /></Reveal>
            {data.homeSections.map((section: any) => (
                <Reveal key={`reveal-cat-${section.id}`}>
                    <CategoryHomeSection
                        title={section.title}
                        slug={section.slug}
                        posterUrl={section.posterUrl}
                        posterUrlAr={section.posterUrlAr}
                        initialProducts={section.products}
                    />
                </Reveal>
            ))}
            <Reveal key="reveal-about"><AboutSection /></Reveal>
            <Footer />
        </main>
    );
}
