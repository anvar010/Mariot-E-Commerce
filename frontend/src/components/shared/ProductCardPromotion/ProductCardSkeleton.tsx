import React from 'react';
import styles from './ProductCardSkeleton.module.css';

const ProductCardSkeleton = () => {
    return (
        <div className={styles.skeletonCard}>
            <div className={styles.imagePlaceholder}></div>
            <div className={styles.infoPlaceholder}>
                <div className={styles.metaLine}></div>
                <div className={styles.titleLine}></div>
                <div className={styles.modelLine}></div>
                <div className={styles.brandLine}></div>
                <div className={styles.priceLine}></div>
            </div>
            <div className={styles.actionPlaceholder}>
                <div className={styles.btnLong}></div>
                <div className={styles.btnSquare}></div>
            </div>
        </div>
    );
};

export default ProductCardSkeleton;
