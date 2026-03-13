import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import CategoriesLayout from '@/components/Categories/CategoriesLayout';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Browse High-Quality Kitchen Equipment Categories | Mariot Store',
    description: 'Explore our comprehensive selection of commercial kitchen equipment, coffee machines, refrigeration, and more. Find the perfect solutions for your hospitality business at Mariot Store.',
};

export default function CategoriesPage() {
    return (
        <main>
            <Header />
            <CategoriesLayout />
            <Footer />
            <FloatingActions />
        </main>
    );
}
