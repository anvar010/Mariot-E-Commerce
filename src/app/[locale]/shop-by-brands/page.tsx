import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import BrandsLayout from '@/components/Brands/BrandsLayout';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';

export const metadata: Metadata = {
    title: 'Top Kitchen Equipment Brands | Mariot Store',
    description: 'Shop by brand and find industry-leading equipment from La Marzocco, Rational, Hoshizaki, and more. We only partner with the best global manufacturers.',
};

const BrandsPage = () => {
    return (
        <main>
            <Header />
            <Suspense fallback={<div>Loading brands...</div>}>
                <BrandsLayout />
            </Suspense>
            <FloatingActions />
            <Footer />
        </main>
    );
};

export default BrandsPage;
