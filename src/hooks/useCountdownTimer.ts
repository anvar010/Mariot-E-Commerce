import { useState, useEffect } from 'react';

export type TimeLeft = { hours: number; minutes: number; seconds: number };

export function useCountdownTimer(endDate: string | number | null | undefined): TimeLeft | null {
    const [countdown, setCountdown] = useState<TimeLeft | null>(null);

    useEffect(() => {
        if (!endDate) {
            setCountdown(null);
            return;
        }

        const end = typeof endDate === 'string' ? new Date(endDate).getTime() : endDate;

        const tick = () => {
            const diff = end - Date.now();
            if (diff <= 0) {
                setCountdown(null);
                return;
            }
            setCountdown({
                hours: Math.floor(diff / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endDate]);

    return countdown;
}
