'use client';

import AdminLayout from '@/components/Admin/AdminLayout';
import AdminOrders from '@/components/Admin/AdminOrders';

export default function AdminOrdersPage() {
    return (
        <AdminLayout>
            <AdminOrders />
        </AdminLayout>
    );
}
