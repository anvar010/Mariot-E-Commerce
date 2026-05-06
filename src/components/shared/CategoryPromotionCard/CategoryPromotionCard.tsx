'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import styles from './CategoryPromotionCard.module.css';

interface CategoryPromotionCardProps {
    title: string;
    image: string;
    link: string;
}

const CategoryPromotionCard = ({ title, image, link }: CategoryPromotionCardProps) => {
    return (
        <Link href={link} className={styles.cardContainer}>
            <div className={styles.imageWrapper}>
                <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 0px, (max-width: 1024px) 240px, 280px"
                    className={styles.promoImage}
                    priority
                />
            </div>
            <div className={styles.textOverlay}>
                <h3 className={styles.title}>{title}</h3>
            </div>
        </Link>
    );
};

export default CategoryPromotionCard;
