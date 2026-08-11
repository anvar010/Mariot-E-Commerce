'use client';

import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import styles from './ProductTags.module.css';

interface ProductTagsProps {
    /** Comma-separated tags as stored on the product. */
    tags?: string | null;
    tagsAr?: string | null;
    isArabic?: boolean;
}

/**
 * Icon per audience, matched on either language so an Arabic tag gets the same picture as its
 * English twin. First match wins, so keep the more specific patterns above the general ones.
 * An admin who types their own emoji in front of a tag overrides all of this.
 */
const TAG_ICONS: { match: RegExp; icon: string }[] = [
    { match: /cloud kitchen|ghost kitchen|مطبخ سحابي|مطابخ سحابية/i, icon: '🌐' },
    { match: /ice ?cream|gelato|آيس ?كريم|مثلجات/i, icon: '🍦' },
    { match: /restaurant|مطعم|مطاعم/i, icon: '🍽️' },
    { match: /hotel|فندق|فنادق/i, icon: '🏨' },
    { match: /caf[eé]|coffee|مقهى|مقاهي|كافيه/i, icon: '☕' },
    { match: /bakery|bakeries|pastry|مخبز|مخابز|حلويات/i, icon: '🥐' },
    { match: /supermarket|grocery|hypermarket|سوبر ?ماركت|بقالة|تموين غذائي/i, icon: '🛒' },
    { match: /catering|banquet|تموين|ضيافة|حفلات/i, icon: '🍱' },
    { match: /hospital|clinic|health ?care|مستشفى|مستشفيات|عيادة|رعاية صحية/i, icon: '🏥' },
    { match: /school|university|campus|canteen|مدرسة|مدارس|جامعة|مقصف/i, icon: '🎓' },
    { match: /butcher|meat shop|لحوم|جزارة/i, icon: '🥩' },
    { match: /pizza|بيتزا/i, icon: '🍕' },
    { match: /juice|smoothie|عصير|عصائر/i, icon: '🧃' },
    { match: /bar\b|pub|lounge|بار|صالة/i, icon: '🍸' },
    { match: /laundry|مغسلة|غسيل/i, icon: '🧺' },
    { match: /office|corporate|مكتب|مكاتب|شركات/i, icon: '🏢' },
];

const LEADING_EMOJI = /^(\p{Extended_Pictographic}️?‍?\p{Extended_Pictographic}?️?)\s*/u;

const splitTag = (raw: string): { icon: string; label: string } => {
    // An emoji the admin typed themselves takes priority over anything we'd guess.
    const authored = raw.match(LEADING_EMOJI);
    if (authored) return { icon: authored[1], label: raw.slice(authored[0].length).trim() };

    const known = TAG_ICONS.find(entry => entry.match.test(raw));
    return { icon: known ? known.icon : '✅', label: raw };
};

export default function ProductTags({ tags, tagsAr, isArabic = false }: ProductTagsProps) {
    const t = useTranslations('product');

    // Fall back to the English tags when a product has no Arabic ones, so the Arabic site
    // still shows the audience rather than an empty gap.
    const source = (isArabic && tagsAr && tagsAr.trim()) ? tagsAr : (tags || '');
    // Arabic lists are commonly written with the Arabic comma.
    const list = source.split(/[,،]/).map(s => s.trim()).filter(Boolean);

    if (list.length === 0) return null;

    return (
        <section className={styles.tagsBlock} dir={isArabic ? 'rtl' : 'ltr'} aria-label={t('perfectFor')}>
            <h3 className={styles.tagsHeading}>
                <Users size={15} className={styles.tagsHeadingIcon} aria-hidden="true" />
                {t('perfectFor')}
            </h3>
            <ul className={styles.tagsList}>
                {list.map(raw => {
                    const { icon, label } = splitTag(raw);
                    return (
                        <li key={raw} className={styles.tagChip}>
                            <span className={styles.tagIcon} aria-hidden="true">{icon}</span>
                            <span className={styles.tagLabel}>{label}</span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
