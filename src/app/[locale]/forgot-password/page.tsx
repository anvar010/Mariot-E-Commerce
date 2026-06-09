import ForgotPasswordForm from '@/components/Auth/ForgotPasswordForm';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';

export default function ForgotPasswordPage() {
    return (
        <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <ForgotPasswordForm />
            <Footer />
        </main>
    );
}
