'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminCategories from '@/components/Admin/AdminCategories';

export default function AdminCategoriesPage() {
    return (
        <AdminLayout>
            <AdminCategories />
        </AdminLayout>
    );
}
