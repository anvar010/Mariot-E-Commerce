'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import styles from './ShopLayout.module.css';

interface ShopBreadcrumbsProps {
    parentSlug: string | null;
    brandParam: string | null;
    activeCategory: string | null;
    formattedCategoryName: string;
    t: any;
    tc: any;
}

const ShopBreadcrumbs: React.FC<ShopBreadcrumbsProps> = ({
    parentSlug,
    brandParam,
    activeCategory,
    formattedCategoryName,
    t,
    tc
}) => {
    return (
        <div className={styles.breadcrumbs}>
            <Link href="/">{tc("home")}</Link>
            {parentSlug && (
                <>
                    <span className={styles.separator}>/</span>
                    <span>
                        {t.has(parentSlug)
                            ? t(parentSlug)
                            : (tc.has(parentSlug)
                                ? tc(parentSlug)
                                : parentSlug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
                        }
                    </span>
                </>
            )}
            {brandParam && (
                <>
                    <span className={styles.separator}>/</span>
                    <Link href="/shop-by-brands">{tc("shop-by-brand")}</Link>
                </>
            )}
            <span className={styles.separator}>/</span>
            <span className={styles.activeBreadcrumb}>{formattedCategoryName}</span>
        </div>
    );
};

export default ShopBreadcrumbs;
