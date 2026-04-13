import React from 'react';
import styles from './CategoryMenuSkeleton.module.css';

interface CategoryMenuSkeletonProps {
    isPopup?: boolean;
}

const CategoryMenuSkeleton: React.FC<CategoryMenuSkeletonProps> = ({ isPopup }) => {
    return (
        <div className={`${styles.skeletonContainer} ${isPopup ? styles.popupMode : ''}`}>
            <div className={styles.wrapper}>
                <div className={styles.sidebar}>
                    {Array(12).fill(0).map((_, i) => (
                        <div key={i} className={`${styles.sidebarItem} ${i === 0 ? styles.activeItem : ''}`}>
                            <div className={styles.circle}></div>
                            <div className={styles.line}></div>
                        </div>
                    ))}
                </div>
                <div className={styles.mainContent}>
                    <div className={styles.contentGrid}>
                        <div className={styles.contentColumn}>
                            <div className={styles.titleLine}></div>
                            <div className={styles.nestedGrid}>
                                <div className={styles.nestedColumn}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={styles.group}>
                                            <div className={styles.groupTitle}></div>
                                            <div className={styles.groupItem}></div>
                                            <div className={styles.groupItem}></div>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.nestedColumn}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={styles.group}>
                                            <div className={styles.groupTitle}></div>
                                            <div className={styles.groupItem}></div>
                                            <div className={styles.groupItem}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={styles.brandsColumn}>
                            <div className={styles.brandsTitle}></div>
                            <div className={styles.brandsGrid}>
                                {Array(6).fill(0).map((_, i) => (
                                    <div key={i} className={styles.brandBox}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryMenuSkeleton;
