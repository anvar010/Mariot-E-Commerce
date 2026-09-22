import styles from './loading.module.css';

/**
 * The product page's shape, drawn immediately on click.
 *
 * The locale-level loading.tsx is a fixed, full-screen white overlay at z-index 10000 --
 * it covers the header and the whole viewport, so every product click blanks the screen
 * and reads as a stall even when the page arrives quickly. This one replaces it for this
 * route: it occupies the page body only, leaving the persistent header and footer alone,
 * and traces the real layout (gallery left, details right) so the content lands into a
 * frame that is already there rather than replacing a spinner.
 *
 * Deliberately server-rendered with no client JS: it must paint on the very first frame,
 * before any bundle has loaded. That is the whole point of it.
 */
export default function ProductLoading() {
    return (
        <div className={styles.wrap} aria-busy="true" aria-label="Loading product">
            <div className={styles.grid}>
                <div className={styles.galleryCol}>
                    <div className={`${styles.block} ${styles.mainImage}`} />
                    <div className={styles.thumbRow}>
                        {/* Fixed count: a skeleton stands in for the layout, not for the data,
                            so it must not wait to learn how many photographs there are. */}
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className={`${styles.block} ${styles.thumb}`} />
                        ))}
                    </div>
                </div>

                <div className={styles.detailCol}>
                    <div className={`${styles.block} ${styles.brand}`} />
                    <div className={`${styles.block} ${styles.title}`} />
                    <div className={`${styles.block} ${styles.titleShort}`} />
                    <div className={`${styles.block} ${styles.price}`} />
                    <div className={`${styles.block} ${styles.delivery}`} />
                    <div className={styles.actionRow}>
                        <div className={`${styles.block} ${styles.qty}`} />
                        <div className={`${styles.block} ${styles.cta}`} />
                    </div>
                    <div className={`${styles.block} ${styles.line}`} />
                    <div className={`${styles.block} ${styles.line}`} />
                    <div className={`${styles.block} ${styles.lineShort}`} />
                </div>
            </div>
        </div>
    );
}
