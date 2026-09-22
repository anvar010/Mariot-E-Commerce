import React from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';

/**
 * Shared chrome for the public storefront.
 *
 * Every page under this group used to render its own <Header /> and <Footer />. Because a
 * page is the part of the tree Next swaps on navigation, React saw a brand new header on
 * each click and unmounted the old one -- taking its search box, mega-menu, sticky state
 * and fetched categories with it, then fetching them again. That teardown is what read as
 * the header "reloading" when moving between, say, home and shop-by-brands.
 *
 * A layout is preserved across navigations within its subtree, so the header now mounts
 * once and only {children} changes.
 *
 * This is a route group: the "(storefront)" segment shapes the tree without appearing in
 * any URL, so /shop, /product/... and the rest are untouched. Routes that must NOT have
 * this chrome -- admin, sellerDashboard, cart, download-invoice -- deliberately sit
 * outside the group rather than opting out from within it.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    );
}
