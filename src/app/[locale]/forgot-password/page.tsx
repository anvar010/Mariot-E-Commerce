'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import styles from './forgot-password.module.css';

export default function ForgotPasswordPage() {
    return (
        <main>
            <Header />
            <div className={styles.pageContainer}>
                <div className={styles.authContainer}>
                    <Link href="/signin" className={styles.backLink}>
                        <ArrowLeft size={18} />
                        <span>Back to sign in</span>
                    </Link>

                    <h1 className={styles.authTitle}>Forgot Password?</h1>
                    <p className={styles.authSubtitle}>
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <form className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email Address</label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={18} />
                                <input
                                    type="email"
                                    className={styles.inputField}
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn}>
                            Send Reset Link
                        </button>
                    </form>

                    <div className={styles.note}>
                        <p>Don't have an account? <Link href="/signup">Sign up</Link></p>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
