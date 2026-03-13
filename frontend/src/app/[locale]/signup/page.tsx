import AuthForm from '@/components/Auth/AuthForm';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';

export default function SignUpPage() {
    return (
        <main>
            <Header />
            <AuthForm type="signup" />
            <Footer />
        </main>
    );
}
