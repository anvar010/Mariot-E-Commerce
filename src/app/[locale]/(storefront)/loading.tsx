import styles from './loading.module.css';

/**
 * The home page's shape, drawn immediately on click.
 *
 * Without a loading boundary here, the home route had none of its own: `page.tsx` is an
 * async server component that awaits the CMS, products, categories and brands -- several
 * requests, each allowed up to 8 seconds -- before it returns any markup at all. Next
 * cannot commit a navigation until the new segment produces something, so clicking the
 * header logo left the browser sitting on the previous page with nothing visibly
 * happening. That reads as a dead link, which is exactly what it was reported as.
 *
 * The neighbouring routes already had this: shop, product and category each ship a
 * loading.tsx and so navigate instantly. Home was the one that did not, because when the
 * pages moved under the "(storefront)" group the home page kept sitting at the group
 * root where no sibling loading file covered it.
 *
 * A loading.tsx is a Suspense boundary. With one present the navigation commits on the
 * first frame and this skeleton paints while the fetches finish.
 *
 * Deliberately here at the group root rather than at [locale]: the locale-level
 * loading.tsx stays as the generic fallback for routes without their own, and this one
 * traces the real home layout -- hero, brand and category strips, then product rows --
 * so sections land into a frame that is already on screen.
 *
 * Server-rendered with no client JS, so it paints on the very first frame.
 */
export default function HomeLoading() {
    return (
        <div className={styles.wrap} aria-busy="true" aria-label="Loading">
            <div className={`${styles.block} ${styles.hero}`} />

            {/* Brands strip */}
            <section className={styles.section}>
                <div className={`${styles.block} ${styles.sectionTitle}`} />
                <div className={styles.chipRow}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`${styles.block} ${styles.chip}`} />
                    ))}
                </div>
            </section>

            {/* Categories strip */}
            <section className={styles.section}>
                <div className={`${styles.block} ${styles.sectionTitle}`} />
                <div className={styles.chipRow}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`${styles.block} ${styles.chip}`} />
                    ))}
                </div>
            </section>

            {/* Product rows: new arrivals and limited offers, the two that sit closest to
                the fold. Anything below them is off screen while this is up. */}
            {Array.from({ length: 2 }).map((_, row) => (
                <section key={row} className={styles.section}>
                    <div className={`${styles.block} ${styles.sectionTitle}`} />
                    <div className={styles.cardRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={styles.card}>
                                <div className={`${styles.block} ${styles.cardImage}`} />
                                <div className={`${styles.block} ${styles.cardLine}`} />
                                <div className={`${styles.block} ${styles.cardLineShort}`} />
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
