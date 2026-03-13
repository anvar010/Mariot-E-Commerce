'use client';

import React from 'react';
import { ShoppingCart, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import styles from '../LimitedOffers.module.css';

export interface Product {
    id: number | string;
    slug?: string;
    badge?: string;
    badgeType?: 'points' | 'seller' | string;
    discount?: string;
    image: string;
    timer?: string;
    sku: string;
    title: string;
    price: string;
    originalPrice?: string;
    discountPercent?: string;
    brandLogo?: string;
}

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    return (
        <div className={styles.productCard}>
            <div className={styles.cardHeader}>
                {product.badge && (
                    <span className={`${styles.badge} ${styles[product.badgeType || 'seller']}`}>
                        {product.badgeType === 'points' && <span className={styles.star}>✦</span>}
                        {product.badge}
                    </span>
                )}
                {product.discount && <span className={styles.discountBadge}>{product.discount}</span>}
            </div>

            <Link href={`/product/${product.slug || product.id}`}>
                <div className={styles.imageBox}>
                    <img src={product.image} alt={product.title} />
                </div>
            </Link>

            <div className={styles.cardBody}>
                {product.timer && <div className={styles.productTimer}>{product.timer}</div>}
                <div className={styles.stockStatus}>
                    <CheckCircle2 size={14} className={styles.checkIcon} />
                    IN STOCK
                </div>
                <h3 className={styles.sku}>{product.sku}</h3>
                <p className={styles.description}>{product.title}</p>

                <div className={styles.brandBox}>
                    <img
                        src={product.brandLogo || "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Rational_AG_logo.svg/1200px-Rational_AG_logo.svg.png"}
                        alt="Brand"
                    />
                </div>

                <div className={styles.priceBox}>
                    <div className={styles.currentPrice}>AED {product.price}</div>
                    <div className={styles.priceFooter}>
                        {product.originalPrice && <span className={styles.oldPrice}>AED {product.originalPrice}</span>}
                        {product.discountPercent && <span className={styles.discountText}>{product.discountPercent}</span>}
                    </div>
                </div>

                <div className={styles.actionButtons}>
                    <button className={styles.whatsappBtn}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.031 6.062c-3.411 0-6.185 2.774-6.185 6.185 0 1.25.372 2.414 1.014 3.393L6 19.313l3.856-.993c.915.547 1.983.864 3.125.864 3.411 0 6.185-2.774 6.185-6.185 0-3.411-2.774-6.185-6.185-6.185zm4.27 8.35c-.067.117-.394.225-.56.242-.166.017-.37.025-1.144-.225-.774-.25-1.574-.753-2.224-1.403-.65-.65-1.153-1.45-1.403-2.224-.25-.774-.242-.978-.225-1.144.017-.166.125-.493.242-.56.117-.067.15-.084.225-.084s.15 0 .225.1c.075.1.25.617.275.675.025.058.042.125.008.192-.034.067-.075.108-.125.167s-.108.092-.15.142c-.042.05-.092.1-.042.183.05.083.217.358.467.583.325.292.6.383.684.425.083.042.133.033.183-.025.05-.058.217-.25.275-.333.058-.083.117-.067.183-.042.067.025.433.208.508.242s.125.058.142.083c.017.025.017.142-.05.258z" />
                            <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.108.547 4.086 1.506 5.813L0 24l6.328-1.445c1.727.844 3.659 1.334 5.703 1.334 6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 21.062c-1.896 0-3.664-.525-5.176-1.432l-.372-.225-3.856.88.906-3.712-.25-.398c-.991-1.583-1.566-3.468-1.566-5.485 0-5.353 4.354-9.707 9.707-9.707 5.353 0 9.707 4.354 9.707 9.707 0 5.353-4.354 9.707-9.707 9.707z" />
                        </svg>
                        WHATSAPP
                    </button>
                    <button className={styles.cartBtn}>
                        <ShoppingCart size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
