import AdminTrendingProducts from '@/components/Admin/AdminTrendingProducts';

export const metadata = {
    title: 'Trending Products | MARIOT Admin',
    description: 'Curate the trending products shown in the header search dropdown',
};

export default function TrendingProductsPage() {
    return <AdminTrendingProducts />;
}
