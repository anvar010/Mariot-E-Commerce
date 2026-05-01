import { useState, useEffect, useRef } from 'react';

export type TimeLeft = { hours: number; minutes: number; seconds: number };

export function useCountdownTimer(endDate: string | number | null | undefined): TimeLeft | null {
    const [, setTick] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (!endDate) return;

        const end = typeof endDate === 'string' ? new Date(endDate).getTime() : endDate;

        intervalRef.current = setInterval(() => {
            if (Date.now() >= end) {
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
            }
            setTick(n => n + 1);
        }, 1000);

        setTick(n => n + 1);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [endDate]);

    if (!endDate) return null;
    const end = typeof endDate === 'string' ? new Date(endDate).getTime() : endDate;
    const diff = end - Date.now();
    if (diff <= 0) return null;

    return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
    };
}
