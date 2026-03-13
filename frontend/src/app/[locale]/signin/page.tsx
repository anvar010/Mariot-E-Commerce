import AuthForm from '@/components/Auth/AuthForm';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';

export default function SignInPage() {
    return (
        <main>
            <Header />
            <AuthForm type="signin" />
            <Footer />
        </main>
    );
}
