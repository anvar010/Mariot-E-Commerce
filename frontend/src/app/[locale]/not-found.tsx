'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import { Home, Percent, Tag, Search } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <main style={{ backgroundColor: '#ffffff' }}>
            <Header />

            <div className={styles.pageWrapper}>
                <div className={styles.content}>
                    <div className={styles.staticIcon}>
                        <Search size={80} strokeWidth={1} />
                    </div>
                    <p className={styles.sorryText}>Sorry, this page can not be found</p>
                    <h1 className={styles.promptText}>Please type below what are you looking for.</h1>

                    <form className={styles.searchContainer} onSubmit={handleSearch}>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Product name or category"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className={styles.searchButton}>
                            Search
                        </button>
                    </form>

                    <div className={styles.shortcuts}>
                        <p className={styles.shortcutsTitle}>Shortcuts</p>
                        <div className={styles.shortcutsGrid}>
                            <Link href="/" className={styles.shortcutBtn}>
                                <Home size={18} className={styles.icon} />
                                Homepage
                            </Link>
                            <Link href="/today-offers" className={styles.shortcutBtn}>
                                <Percent size={18} className={styles.icon} />
                                Deals
                            </Link>
                            <Link href="/shop-by-brands" className={styles.shortcutBtn}>
                                <Tag size={18} className={styles.icon} />
                                Shop by Brand
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
            <FloatingActions />
        </main>
    );
}
