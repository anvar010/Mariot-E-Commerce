'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminInvoices from '@/components/Admin/AdminInvoices';

export default function AdminInvoicesPage() {
    return (
        <AdminLayout>
            <AdminInvoices />
        </AdminLayout>
    );
}
