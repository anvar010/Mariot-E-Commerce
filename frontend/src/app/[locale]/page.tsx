import Header from '@/components/Layout/Header/Header';
import Hero from '@/components/Home/Hero/Hero';
import HeroPosters from '@/components/Home/HeroPosters/HeroPosters';
import CategoryBrowse from '@/components/Home/CategoryBrowse/CategoryBrowse';
import LimitedOffers from '@/components/Home/LimitedOffers/LimitedOffers';
import WeeklyDeals from '@/components/Home/WeeklyDeals/WeeklyDeals';
import IceMakers from '@/components/Home/IceMakers/IceMakers';
import CoffeeMakers from '@/components/Home/CoffeeMakers/CoffeeMakers';
import CookingEquipment from '@/components/Home/CookingEquipment/CookingEquipment';
import AboutSection from '@/components/Home/AboutSection/AboutSection';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import Footer from '@/components/Layout/Footer/Footer';
import Reveal from '@/components/shared/Reveal/Reveal';

const API_BASE_URL_SERVER = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

async function getHomeData(locale: string) {
    const isRtl = locale === 'ar';
    try {
        const [cmsRes, limitedRes, weeklyRes, iceRes, coffeeRes, cookingRes] = await Promise.all([
            fetch(`${API_BASE_URL_SERVER}/cms/homepage`, { next: { revalidate: 0 } }),
            fetch(`${API_BASE_URL_SERVER}/products?is_limited_offer=true&limit=8`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE_URL_SERVER}/products?is_weekly_deal=true`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE_URL_SERVER}/products?search=ice%20makers`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE_URL_SERVER}/products?search=coffee%20makers`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE_URL_SERVER}/products?search=cooking%20equipment`, { next: { revalidate: 60 } })
        ]);

        const cmsData = await cmsRes.json();
        const limitedData = await limitedRes.json();
        const weeklyData = await weeklyRes.json();
        const iceData = await iceRes.json();
        const coffeeData = await coffeeRes.json();
        const cookingData = await cookingRes.json();

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
                    image: slide.image,
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

        return {
            heroSlides,
            heroPosters,
            limitedProducts: limitedData.success ? limitedData.data : [],
            weeklyProducts: weeklyData.success ? weeklyData.data : [],
            iceProducts: iceData.success ? iceData.data : [],
            coffeeProducts: coffeeData.success ? coffeeData.data : [],
            cookingProducts: cookingData.success ? cookingData.data : []
        };
    } catch (e) {
        console.error("Home server fetch failed", e);
        return { heroSlides: [], heroPosters: [], limitedProducts: [], weeklyProducts: [], iceProducts: [], coffeeProducts: [], cookingProducts: [] };
    }
}

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
    const data = await getHomeData(locale);

    const localBusinessJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: 'Mariot Kitchen Equipment',
        image: 'https://mariotstore.com/assets/mariot-logo.webp',
        url: 'https://mariotstore.com',
        logo: 'https://mariotstore.com/assets/mariot-logo.webp',
        description: 'Best Kitchen Equipment Supplier in Dubai, UAE. Premium quality kitchen equipment, coffee makers, and ice makers.',
        telephone: '+971-4-288-2777',
        priceRange: 'AED',
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
                closes: '18:00'
            }
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+971-4-288-2777',
            contactType: 'customer service',
            areaServed: 'AE',
            availableLanguage: ['en', 'ar']
        }
    };

    return (
        <main>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
            <Header />
            <Hero initialSlides={data.heroSlides} />
            <Reveal key="reveal-hero-posters"><HeroPosters initialPosters={data.heroPosters} /></Reveal>
            <Reveal key="reveal-categories"><CategoryBrowse /></Reveal>
            <Reveal key="reveal-limited"><LimitedOffers initialProducts={data.limitedProducts} /></Reveal>
            <Reveal key="reveal-weekly"><WeeklyDeals initialProducts={data.weeklyProducts} /></Reveal>
            <Reveal key="reveal-ice"><IceMakers initialProducts={data.iceProducts} /></Reveal>
            <Reveal key="reveal-coffee"><CoffeeMakers initialProducts={data.coffeeProducts} /></Reveal>
            <Reveal key="reveal-cooking"><CookingEquipment initialProducts={data.cookingProducts} /></Reveal>
            <Reveal key="reveal-about"><AboutSection /></Reveal>
            <Footer />
            <FloatingActions />
        </main>
    );
}
