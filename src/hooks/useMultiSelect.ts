import { useState, useCallback } from 'react';

export function useMultiSelect<T extends { id: string }>(items: T[]) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    const toggleSelection = useCallback((id: string, multiSelect: boolean = false, rangeSelect: boolean = false) => {
        setSelectedIds(prev => {
            const newSet = new Set(multiSelect ? prev : []);

            if (rangeSelect && lastSelectedId && items.some(i => i.id === lastSelectedId)) {
                const lastIndex = items.findIndex(i => i.id === lastSelectedId);
                const currentIndex = items.findIndex(i => i.id === id);
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);

                for (let i = start; i <= end; i++) {
                    newSet.add(items[i].id);
                }
            } else {
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
            }

            return newSet;
        });
        setLastSelectedId(id);
    }, [items, lastSelectedId]);

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(items.map(i => i.id)));
    }, [items]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setLastSelectedId(null);
    }, []);

    return {
        selectedIds,
        toggleSelection,
        selectAll,
        clearSelection,
        setSelectedIds
    };
}
