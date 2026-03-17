import ResetPasswordForm from '@/components/Auth/ResetPasswordForm';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
    return (
        <main>
            <Header />
            <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
            <Footer />
        </main>
    );
}
