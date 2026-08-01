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
    const brandDescription = isArabic && activeBrandInfo?.description_ar ? activeBrandInfo.description_ar : activeBrandInfo?.description;

    if (!activeBrandInfo || (!brandDescription && !brandLogo)) {
        return null;
    }

    return (
        <div className={styles.aboutBrandSection}>
            <div className={styles.brandBio}>
                {brandLogo && (
                    <div className={styles.brandBioLogoBox}>
                        <img
                            src={resolveUrl(brandLogo)}
                            alt={isArabic && activeBrandInfo.name_ar ? activeBrandInfo.name_ar : activeBrandInfo.name}
                            className={styles.brandBioLogoImg}
                        />
                    </div>
                )}
                <div className={styles.brandBioContent}>
                    <h2 className={styles.brandBioTitle}>
                        {isArabic && activeBrandInfo.name_ar ? activeBrandInfo.name_ar : activeBrandInfo.name}
                    </h2>
                    {brandDescription && (
                        <div 
                            className={styles.brandBioDescription}
                            dangerouslySetInnerHTML={{ __html: brandDescription }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrandBio;
