/**
 * Slot-based ordering: order_index treated as an ABSOLUTE position.
 * - If a category has order_index = N (>0), it goes to slot N.
 * - Unset (0/null) items fill remaining slots in their natural order (by name, then id).
 * - If two categories share the same order_index, the second one is treated as unset.
 *
 * Example: 5 items, only Coffee Makers has order_index=3.
 *   Result: [unset1, unset2, Coffee Makers, unset3, unset4]
 */
export function sortByOrderIndex<T extends { order_index?: number | string | null; name?: string; id?: number }>(items: T[]): T[] {
    const naturalSort = (a: T, b: T) => {
        const an = String(a.name || '').toLowerCase();
        const bn = String(b.name || '').toLowerCase();
        if (an !== bn) return an.localeCompare(bn);
        return Number(a.id ?? 0) - Number(b.id ?? 0);
    };

    const prioritized: T[] = [];
    const unprioritized: T[] = [];
    for (const item of items) {
        const n = Number(item.order_index);
        if (Number.isFinite(n) && n > 0) prioritized.push(item);
        else unprioritized.push(item);
    }

    unprioritized.sort(naturalSort);

    const slotMap = new Map<number, T>();
    for (const item of prioritized) {
        const slot = Number(item.order_index);
        if (!slotMap.has(slot)) slotMap.set(slot, item);
        else unprioritized.push(item);
    }

    unprioritized.sort(naturalSort);

    const result: T[] = [];
    const total = items.length;
    let unpIdx = 0;
    for (let slot = 1; slot <= total; slot++) {
        if (slotMap.has(slot)) {
            result.push(slotMap.get(slot)!);
        } else if (unpIdx < unprioritized.length) {
            result.push(unprioritized[unpIdx++]);
        }
    }
    while (unpIdx < unprioritized.length) result.push(unprioritized[unpIdx++]);

    return result;
}
