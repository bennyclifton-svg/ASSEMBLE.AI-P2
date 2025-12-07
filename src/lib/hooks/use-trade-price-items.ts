import { useState, useEffect, useCallback } from 'react';

export interface PriceItem {
    id: string;
    tradeId: string;
    description: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export function useTradePriceItems(tradeId: string | null) {
    const [items, setItems] = useState<PriceItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        if (!tradeId) {
            setItems([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/contractors/trades/${tradeId}/price-items`);
            if (!response.ok) throw new Error('Failed to fetch price items');
            const data = await response.json();
            setItems(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [tradeId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const addItem = async (description: string): Promise<PriceItem | null> => {
        if (!tradeId) return null;

        try {
            const response = await fetch(`/api/contractors/trades/${tradeId}/price-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });

            if (!response.ok) throw new Error('Failed to create price item');

            const newItem = await response.json();
            setItems(prev => [...prev, newItem]);
            return newItem;
        } catch (err) {
            console.error('Error adding price item:', err);
            setError(err instanceof Error ? err.message : 'Failed to add item');
            return null;
        }
    };

    const updateItem = async (itemId: string, description: string): Promise<boolean> => {
        if (!tradeId) return false;

        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, description } : item
        ));

        try {
            const response = await fetch(`/api/contractors/trades/${tradeId}/price-items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });

            if (!response.ok) {
                // Revert on error
                await fetchItems();
                throw new Error('Failed to update price item');
            }

            return true;
        } catch (err) {
            console.error('Error updating price item:', err);
            setError(err instanceof Error ? err.message : 'Failed to update item');
            return false;
        }
    };

    const deleteItem = async (itemId: string): Promise<boolean> => {
        if (!tradeId) return false;

        // Optimistic update
        const previousItems = [...items];
        setItems(prev => prev.filter(item => item.id !== itemId));

        try {
            const response = await fetch(`/api/contractors/trades/${tradeId}/price-items/${itemId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                // Revert on error
                setItems(previousItems);
                throw new Error('Failed to delete price item');
            }

            return true;
        } catch (err) {
            console.error('Error deleting price item:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete item');
            return false;
        }
    };

    const reorderItems = async (itemIds: string[]): Promise<boolean> => {
        if (!tradeId) return false;

        // Optimistic update
        const reorderedItems = itemIds
            .map((id, index) => {
                const item = items.find(i => i.id === id);
                return item ? { ...item, sortOrder: index } : null;
            })
            .filter((item): item is PriceItem => item !== null);

        setItems(reorderedItems);

        try {
            const response = await fetch(`/api/contractors/trades/${tradeId}/price-items`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds }),
            });

            if (!response.ok) {
                // Revert on error
                await fetchItems();
                throw new Error('Failed to reorder price items');
            }

            return true;
        } catch (err) {
            console.error('Error reordering price items:', err);
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
