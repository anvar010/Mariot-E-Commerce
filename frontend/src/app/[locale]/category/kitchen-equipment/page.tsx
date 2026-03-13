import React, { Suspense } from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import Loader from '@/components/shared/Loader/Loader';

export const metadata = {
    title: 'Professional Commercial Kitchen Equipment | Mariot Store',
    description: 'Find a complete range of professional kitchen equipment for restaurants, hotels, and cafes in the UAE. From cooking stations to refrigeration, we provide premium solutions.',
};

export default function KitchenEquipmentPage() {
    return (
        <>
            <Header />
            <main>
                <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>}>
                    <ShopLayout
                        defaultCategory="kitchen-equipment"
                        categoryNameOverride="Kitchen Equipment"
                        hideCategoryGrid={true}
                    />
                </Suspense>
            </main>
            <Footer />
        </>
    );
}
