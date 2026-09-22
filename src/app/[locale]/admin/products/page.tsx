'use client';

import React, { Suspense } from 'react';
import AdminProducts from '@/components/Admin/AdminProducts';
import Loader from '@/components/shared/Loader/Loader';

export default function AdminProductsPage() {
    return (
        <Suspense fallback={<Loader />}>
            <AdminProducts />
        </Suspense>
    );
}
