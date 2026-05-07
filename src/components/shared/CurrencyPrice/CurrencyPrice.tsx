'use client';

import { DirhamPrice } from 'dirham/react';
import { useLocale } from 'next-intl';

interface CurrencyPriceProps {
    amount: number;
    notation?: 'standard' | 'compact';
    weight?: 'thin' | 'extralight' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
    className?: string;
}

export default function CurrencyPrice({ amount, notation, weight, className }: CurrencyPriceProps) {
    const locale = useLocale();

    if (locale === 'ar') {
        const formatted = amount.toLocaleString('ar-AE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...(notation === 'compact' ? { notation: 'compact' } : {}),
        });
        return <span className={className}>{formatted} درهم</span>;
    }

    return <DirhamPrice amount={amount} notation={notation} weight={weight} className={className} />;
}
