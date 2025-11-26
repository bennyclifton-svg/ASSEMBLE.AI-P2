import { useState, useCallback } from 'react';

export function useTreeSelection(initialSelected: Set<string> = new Set()) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelected);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    const selectSingle = useCallback((id: string) => {
        setSelectedIds(new Set([id]));
        setLastSelectedId(id);
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
        setLastSelectedId(id);
    }, []);

    const selectRange = useCallback((id: string, allIds: string[]) => {
        if (!lastSelectedId) {
            selectSingle(id);
            return;
        }

        const startIdx = allIds.indexOf(lastSelectedId);
        const endIdx = allIds.indexOf(id);

        if (startIdx === -1 || endIdx === -1) {
            selectSingle(id);
            return;
        }

        const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = allIds.slice(start, end + 1);

        setSelectedIds(new Set(rangeIds));
        setLastSelectedId(id);
    }, [lastSelectedId, selectSingle]);

    const handleSelect = useCallback((id: string, event: React.MouseEvent, allIds: string[]) => {
        if (event.ctrlKey || event.metaKey) {
            toggleSelection(id);
        } else if (event.shiftKey) {
            selectRange(id, allIds);
        } else {
            selectSingle(id);
        }
    }, [toggleSelection, selectRange, selectSingle]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setLastSelectedId(null);
    }, []);

    return {
        selectedIds,
        handleSelect,
        clearSelection,
        selectSingle,
        toggleSelection,
        selectRange
    };
}
