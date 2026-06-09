'use client';

import React from 'react';
import styles from './ShopLayout.module.css';

interface BrandBioProps {
    activeBrandInfo: any;
    isArabic: boolean;
    resolveUrl: (url?: string) => string;
}

const BrandBio: React.FC<BrandBioProps> = ({ activeBrandInfo, isArabic, resolveUrl }) => {
    const brandLogo = isArabic && activeBrandInfo?.image_url_ar ? activeBrandInfo.image_url_ar : activeBrandInfo?.image_url;

    if (!activeBrandInfo || (!activeBrandInfo.description && !brandLogo)) {
        return null;
    }

    return (
        <div className={styles.aboutBrandSection}>
            <div className={styles.brandBio}>
                {brandLogo && (
                    <div className={styles.brandBioLogoBox}>
                        <img
                            src={resolveUrl(brandLogo)}
                            alt={activeBrandInfo.name}
                            className={styles.brandBioLogoImg}
                        />
                    </div>
                )}
                <div className={styles.brandBioContent}>
                    <h2 className={styles.brandBioTitle}>
                        {isArabic && activeBrandInfo.name_ar ? activeBrandInfo.name_ar : activeBrandInfo.name}
                    </h2>
                    <div className={styles.brandBioDescription}>
                        {isArabic && activeBrandInfo.description_ar ? activeBrandInfo.description_ar : activeBrandInfo.description}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandBio;
