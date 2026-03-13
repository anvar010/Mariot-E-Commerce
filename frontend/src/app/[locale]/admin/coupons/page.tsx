'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminCoupons from '@/components/Admin/AdminCoupons';

export default function AdminCouponsPage() {
    return (
        <AdminLayout>
            <AdminCoupons />
        </AdminLayout>
    );
}
