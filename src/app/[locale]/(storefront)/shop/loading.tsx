import styles from './loading.module.css';

/**
 * The shop grid's shape, drawn immediately on click.
 *
 * Replaces the locale-level full-screen overlay for this route: that one is fixed at
 * z-index 10000 and blanks the header along with everything else, which reads as a stall.
 * This occupies the page body only and traces the real layout -- filter rail, then a card
 * grid -- so results land into a frame that is already on screen.
 *
 * Server-rendered with no client JS, so it paints on the first frame.
 */
export default function ShopLoading() {
    return (
        <div className={styles.wrap} aria-busy="true" aria-label="Loading products">
            <div className={`${styles.block} ${styles.crumb}`} />

            <div className={styles.layout}>
                <aside className={styles.filters}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={styles.filterGroup}>
                            <div className={`${styles.block} ${styles.filterTitle}`} />
                            <div className={`${styles.block} ${styles.filterRow}`} />
                            <div className={`${styles.block} ${styles.filterRow}`} />
                            <div className={`${styles.block} ${styles.filterRow}`} />
                        </div>
                    ))}
                </aside>

                <div className={styles.results}>
                    <div className={styles.toolbar}>
                        <div className={`${styles.block} ${styles.count}`} />
                        <div className={`${styles.block} ${styles.sort}`} />
                    </div>
                    {/* A full first page of cards: enough to fill the viewport, so the grid
                        does not visibly grow as the real results arrive. */}
                    <div className={styles.grid}>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className={styles.card}>
                                <div className={`${styles.block} ${styles.cardImage}`} />
                                <div className={`${styles.block} ${styles.cardLine}`} />
                                <div className={`${styles.block} ${styles.cardLineShort}`} />
                                <div className={`${styles.block} ${styles.cardPrice}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
