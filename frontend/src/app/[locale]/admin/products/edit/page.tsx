'use client';

import React, { Suspense } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminProducts from '@/components/Admin/AdminProducts';
import Loader from '@/components/shared/Loader/Loader';

export default function AdminProductsEditPage() {
    return (
        <AdminLayout>
            <Suspense fallback={<Loader />}>
                <AdminProducts />
            </Suspense>
        </AdminLayout>
    );
}
