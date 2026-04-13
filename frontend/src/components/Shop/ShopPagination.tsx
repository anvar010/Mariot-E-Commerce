'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ShopLayout.module.css';

interface ShopPaginationProps {
    currentPage: number;
    totalProducts: number;
    productsPerPage: number;
    onPageChange: (page: number) => void;
}

const ShopPagination: React.FC<ShopPaginationProps> = ({
    currentPage,
    totalProducts,
    productsPerPage,
    onPageChange
}) => {
    const totalPages = Math.ceil(totalProducts / productsPerPage);

    if (totalProducts <= productsPerPage) return null;

    const handlePageClick = (page: number | string) => {
        if (typeof page === 'number') {
            onPageChange(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const renderPageNumbers = () => {
        const pages = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            if (!pages.includes(totalPages)) pages.push(totalPages);
        }

        return pages.map((num, idx) => (
            num === '...' ? (
                <span key={`dots-${idx}`} className={styles.paginationDots}>...</span>
            ) : (
                <button
                    key={num}
                    onClick={() => handlePageClick(num)}
                    className={`${styles.numBtn} ${currentPage === num ? styles.activePage : ''}`}
                >
                    {num}
                </button>
            )
        ));
    };

    return (
        <div className={styles.pagination}>
            <button
                onClick={() => handlePageClick(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={styles.arrowBtn}
                aria-label="Previous page"
            >
                <ChevronLeft size={20} />
            </button>

            {renderPageNumbers()}

            <button
                onClick={() => handlePageClick(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || totalProducts === 0}
                className={styles.arrowBtn}
                aria-label="Next page"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default ShopPagination;
