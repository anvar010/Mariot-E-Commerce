import type { Metadata } from 'next';
import React from 'react';

// Every /admin route is staff-only. None of them declared metadata, so they fell back
// to the root layout and were advertised to crawlers under the storefront title — with
// a canonical pointing at the public home page. One layout here covers the whole
// subtree (analytics, orders, products, users, …) so a new admin screen is noindex by
// default rather than by remembering to opt in.
//
// `follow: false` too: unlike sign-in, there is nothing behind these pages worth
// crawling, and the links they contain are all staff tooling.
export const metadata: Metadata = {
    title: 'Admin | Mariot Store',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
