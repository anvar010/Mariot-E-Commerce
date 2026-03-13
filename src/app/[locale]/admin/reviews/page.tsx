'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminReviews from '@/components/Admin/AdminReviews';

export default function AdminReviewsPage() {
    return (
        <AdminLayout>
            <AdminReviews />
        </AdminLayout>
    );
}
