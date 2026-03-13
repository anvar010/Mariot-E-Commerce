'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminQuotations from '@/components/Admin/AdminQuotations';

export default function AdminQuotationsPage() {
    return (
        <AdminLayout>
            <AdminQuotations />
        </AdminLayout>
    );
}
