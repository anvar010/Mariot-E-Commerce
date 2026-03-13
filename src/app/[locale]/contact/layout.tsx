import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us | Mariot Store - Hospitality Equipment Experts',
    description: 'Get in touch with Mariot Store for expert assistance, product inquiries, and wholesale support. Reach us in Dubai, Sharjah, Abu Dhabi, and Al Ain.',
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
