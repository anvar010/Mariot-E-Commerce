import ResetPasswordForm from '@/components/Auth/ResetPasswordForm';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
    return (
        <main>
            <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </main>
    );
}
