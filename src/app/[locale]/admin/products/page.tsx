'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminProducts from '@/components/Admin/AdminProducts';

export default function AdminProductsPage() {
    return (
        <AdminLayout>
            <AdminProducts />
        </AdminLayout>
    );
}
