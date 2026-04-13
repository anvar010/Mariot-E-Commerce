import React from 'react';
import styles from './AdminLoader.module.css';

interface AdminLoaderProps {
    message?: string;
    fullPage?: boolean;
}

const AdminLoader: React.FC<AdminLoaderProps> = ({ message = 'Initializing Admin Data...', fullPage = false }) => {
    return (
        <div className={`${styles.loaderContainer} ${fullPage ? styles.fullPage : ''}`}>
            <div className={styles.loaderContent}>
                <div className={styles.geometryWrapper}>
                    <div className={styles.outerRing}></div>
                    <div className={styles.innerRing}></div>
                    <div className={styles.logoGhost}>
                        <img src="/assets/mariot-logo.webp" alt="Mariot" />
                    </div>
                </div>
                <div className={styles.textStack}>
                    <span className={styles.loadingText}>{message}</span>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoader;
