'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import StaffQuotationCustomer from '@/components/Admin/StaffQuotationCustomer';

/**
 * A customer's full quotation history, on its own page.
 *
 * Nested under staff-quotations rather than sitting at the admin root so it inherits the
 * same permission gate as the list it is reached from: the sidebar entry and the API both
 * key off the staff_quotations permission, and a customer page outside that subtree would
 * be a second door into the same records.
 */
export default function StaffQuotationCustomerPage() {
    const params = useParams();
    const raw = params?.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    return <StaffQuotationCustomer customerId={Number(id)} />;
}
