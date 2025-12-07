import { useState, useEffect, useCallback } from 'react';

export interface FeeItem {
    id: string;
    disciplineId: string;
    description: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export function useDisciplineFeeItems(disciplineId: string | null) {
    const [items, setItems] = useState<FeeItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        if (!disciplineId) {
            setItems([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/consultants/disciplines/${disciplineId}/fee-items`);
            if (!response.ok) throw new Error('Failed to fetch fee items');
            const data = await response.json();
            setItems(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [disciplineId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const addItem = async (description: string): Promise<FeeItem | null> => {
        if (!disciplineId) return null;

        try {
            const response = await fetch(`/api/consultants/disciplines/${disciplineId}/fee-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });

            if (!response.ok) throw new Error('Failed to create fee item');

            const newItem = await response.json();
            setItems(prev => [...prev, newItem]);
            return newItem;
        } catch (err) {
            console.error('Error adding fee item:', err);
            setError(err instanceof Error ? err.message : 'Failed to add item');
            return null;
        }
    };

    const updateItem = async (itemId: string, description: string): Promise<boolean> => {
        if (!disciplineId) return false;

        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, description } : item
        ));

        try {
            const response = await fetch(`/api/consultants/disciplines/${disciplineId}/fee-items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });

            if (!response.ok) {
                // Revert on error
                await fetchItems();
                throw new Error('Failed to update fee item');
            }

            return true;
        } catch (err) {
            console.error('Error updating fee item:', err);
            setError(err instanceof Error ? err.message : 'Failed to update item');
            return false;
        }
    };

    const deleteItem = async (itemId: string): Promise<boolean> => {
        if (!disciplineId) return false;

        // Optimistic update
        const previousItems = [...items];
        setItems(prev => prev.filter(item => item.id !== itemId));

        try {
            const response = await fetch(`/api/consultants/disciplines/${disciplineId}/fee-items/${itemId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                // Revert on error
                setItems(previousItems);
                throw new Error('Failed to delete fee item');
            }

            return true;
        } catch (err) {
            console.error('Error deleting fee item:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete item');
            return false;
        }
    };

    const reorderItems = async (itemIds: string[]): Promise<boolean> => {
        if (!disciplineId) return false;

        // Optimistic update
        const reorderedItems = itemIds
            .map((id, index) => {
                const item = items.find(i => i.id === id);
                return item ? { ...item, sortOrder: index } : null;
            })
            .filter((item): item is FeeItem => item !== null);

        setItems(reorderedItems);

        try {
            const response = await fetch(`/api/consultants/disciplines/${disciplineId}/fee-items`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds }),
            });

            if (!response.ok) {
                // Revert on error
                await fetchItems();
                throw new Error('Failed to reorder fee items');
            }

            return true;
        } catch (err) {
            console.error('Error reordering fee items:', err);
            setError(err instanceof Error ? err.message : 'Failed to reorder items');
            return false;
        }
    };

    return {
        items,
        isLoading,
        error,
        addItem,
        updateItem,
        deleteItem,
        reorderItems,
        refetch: fetchItems,
    };
}
