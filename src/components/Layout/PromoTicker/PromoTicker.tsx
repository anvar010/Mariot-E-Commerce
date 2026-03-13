import { useTranslations } from 'next-intl';
import styles from './PromoTicker.module.css';

const PromoTicker = () => {
    const t = useTranslations('todayOffers');

    return (
        <div className={styles.tickerWrapper}>
            <div className={styles.tickerContent}>
                <span>{t('limitedTimeMessage')}</span>
                <span>{t('hurryMessage')}</span>
                <span>{t('limitedTimeMessage')}</span>
                <span>{t('hurryMessage')}</span>
                <span>{t('limitedTimeMessage')}</span>
                <span>{t('hurryMessage')}</span>
            </div>
        </div>
    );
};

export default PromoTicker;
