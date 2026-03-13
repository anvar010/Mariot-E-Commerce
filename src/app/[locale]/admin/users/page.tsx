'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminUsers from '@/components/Admin/AdminUsers';

export default function AdminUsersPage() {
    return (
        <AdminLayout>
            <AdminUsers />
        </AdminLayout>
    );
}
