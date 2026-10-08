'use client';

import { useEffect, RefObject } from 'react';

/**
 * Lets every admin table restack into cards on a phone.
 *
 * The card layout (AdminLayout.module.css) shows each cell with its column name beside
 * it, which needs the name ON the cell. Rather than hand-writing data-label on every
 * <td> of every admin table, this copies each column's <th> text onto its cells and
 * marks the table with data-card-table, which is what the CSS keys on.
 *
 * Watches the page for changes, because tables render after their data loads and
 * re-render on every filter. Only childList changes are observed, so the attributes
 * written here never re-trigger it.
 *
 * A table opts out with data-no-cards -- for tables that already have their own
 * phone layout, or that make no sense as cards.
 */
export const useCardTables = (rootRef: RefObject<HTMLElement | null>, ready: boolean) => {
    useEffect(() => {
        // `ready` re-runs this once the page body exists: the layout shows a loader
        // first, so on the very first render the ref is still empty.
        const root = rootRef.current;
        if (!ready || !root) return;

        const label = () => {
            root.querySelectorAll('table').forEach(table => {
                if (table.hasAttribute('data-no-cards')) return;
                const headRow = table.querySelector('thead tr:last-child');
                if (!headRow) return;

                // Column names by position, expanding colSpan so later cells still line up.
                const names: string[] = [];
                headRow.querySelectorAll('th, td').forEach(th => {
                    const text = (th.textContent || '').replace(/\s+/g, ' ').trim();
                    const span = (th as HTMLTableCellElement).colSpan || 1;
                    for (let i = 0; i < span; i++) names.push(text);
                });
                if (!names.some(Boolean)) return;

                table.setAttribute('data-card-table', '');
                table.querySelectorAll('tbody tr').forEach(tr => {
                    let col = 0;
                    Array.from(tr.children).forEach(cell => {
                        const name = names[col] ?? '';
                        if (cell.getAttribute('data-label') !== name) cell.setAttribute('data-label', name);
                        col += (cell as HTMLTableCellElement).colSpan || 1;
                    });
                });
            });
        };

        let frame = 0;
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(label);
        };

        label();
        const observer = new MutationObserver(schedule);
        observer.observe(root, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [rootRef, ready]);
};
