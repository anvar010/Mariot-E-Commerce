import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import ShopLayout from '@/components/Shop/ShopLayout';
import Loader from '@/components/shared/Loader/Loader';

export const metadata: Metadata = {
    title: 'Commercial Laundry Equipment | Mariot Store',
    description: 'Professional laundry solutions for businesses. Find washers, dryers, and industrial laundry equipment at Mariot Store.',
};

export default function LaundryPage() {
    return (
        <main>
            <Header />
            <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>}>
                <ShopLayout defaultCategory="laundry" categoryNameOverride="Laundry" hideCategoryGrid={true} />
            </Suspense>
            <Footer />
        </main>
    );
}
