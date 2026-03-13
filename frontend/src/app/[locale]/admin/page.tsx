'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminDashboard from '@/components/Admin/AdminDashboard';

export default function AdminPage() {
    return (
        <AdminLayout>
            <AdminDashboard />
        </AdminLayout>
    );
}
