'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminShippingQuotes from '@/components/Admin/AdminShippingQuotes';

export default function AdminShippingQuotesPage() {
    return (
        <AdminLayout>
            <AdminShippingQuotes />
        </AdminLayout>
    );
}
