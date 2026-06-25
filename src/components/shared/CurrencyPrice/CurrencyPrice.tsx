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

    // Guard against undefined/NaN so a missing price never renders as "NaN درهم"
    // or an empty value (e.g. a cart/email item whose price field didn't load).
    const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;

    if (locale === 'ar') {
        const formatted = safeAmount.toLocaleString('ar-AE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...(notation === 'compact' ? { notation: 'compact' } : {}),
        });
        return <span className={className}>{formatted} درهم</span>;
    }

    return <DirhamPrice amount={safeAmount} notation={notation} weight={weight} className={className} />;
}
