'use client';

import React from 'react';
import styles from './Newsletter.module.css';

const Newsletter = () => {
    return (
        <section className={styles.newsletterSection}>
            <div className={styles.container}>
                <h2 className={styles.title}>Stay in the Loop</h2>
                <p className={styles.subtitle}>
                    Subscribe to our newsletter for exclusive offers, new product launches,
                    and expert kitchen tips delivered to your inbox.
                </p>
                <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="email"
                        placeholder="Enter your email address"
                        className={styles.input}
                        required
                    />
                    <button type="submit" className={styles.subscribeBtn}>
                        Subscribe
                    </button>
                </form>
            </div>
        </section>
    );
};

export default Newsletter;
