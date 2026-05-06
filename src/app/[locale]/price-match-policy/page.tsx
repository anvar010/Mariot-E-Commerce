import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { Tag } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Price Match Policy | Mariot Kitchen Equipment',
    description: 'Learn about the Price Match Policy at Mariot Kitchen Equipment. We ensure you get the best value.',
};

export default function PriceMatchPolicyPage() {
    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.mainTitle}>Price Match Policy</h1>

                    <div className={styles.statusCard}>
                        <div className={styles.statusIcon}>
                            <Tag size={32} />
                        </div>
                        <p className={styles.statusMessage}>
                            Our Price Match guarantee is currently being finalized.
                        </p>
                        <p className={styles.subMessage}>
                            We are committed to providing you with the best prices. Stay tuned for full details.
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}
