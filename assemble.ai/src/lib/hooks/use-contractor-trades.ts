import { useState, useEffect } from 'react';

export interface ContractorStatus {
    id: string;
    tradeId: string;
    statusType: 'brief' | 'tender' | 'rec' | 'award';
    isActive: boolean;
    completedAt: string | null;
}

export interface ContractorTrade {
    id: string;
    projectId: string;
    tradeName: string;
    isEnabled: boolean;
    order: number;
    statuses: ContractorStatus[];
}

export function useContractorTrades(projectId: string) {
    const [trades, setTrades] = useState<ContractorTrade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;

        const fetchTrades = async () => {
            try {
                const response = await fetch(`/api/contractors/trades?projectId=${projectId}`);
                if (!response.ok) throw new Error('Failed to fetch trades');
                const data = await response.json();
                setTrades(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrades();
    }, [projectId]);

    const toggleTrade = async (id: string, isEnabled: boolean) => {
        // Optimistic update
        setTrades(prev => prev.map(t =>
            t.id === id ? { ...t, isEnabled } : t
        ));

        try {
            const response = await fetch(`/api/contractors/trades/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isEnabled }),
            });

            if (!response.ok) {
                // Revert on error
                setTrades(prev => prev.map(t =>
                    t.id === id ? { ...t, isEnabled: !isEnabled } : t
                ));
                throw new Error('Failed to update trade');
            }
        } catch (err) {
            console.error(err);
            // Revert on error
            setTrades(prev => prev.map(t =>
                t.id === id ? { ...t, isEnabled: !isEnabled } : t
            ));
        }
    };

    const updateStatus = async (tradeId: string, statusType: string, isActive: boolean) => {
        // Optimistic update
        setTrades(prev => prev.map(t => {
            if (t.id !== tradeId) return t;

            const existingStatusIndex = t.statuses.findIndex(s => s.statusType === statusType);
            const newStatuses = [...t.statuses];

            if (existingStatusIndex >= 0) {
                newStatuses[existingStatusIndex] = { ...newStatuses[existingStatusIndex], isActive };
            } else {
                newStatuses.push({
                    id: 'temp-' + Date.now(),
                    tradeId,
                    statusType: statusType as ContractorStatus['statusType'],
                    isActive,
                    completedAt: isActive ? new Date().toISOString() : null
                });
            }

            return { ...t, statuses: newStatuses };
        }));

        try {
            const response = await fetch(`/api/contractors/trades/${tradeId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statusType, isActive }),
            });

            if (!response.ok) throw new Error('Failed to update status');

            // Refresh data
            const refreshResponse = await fetch(`/api/contractors/trades?projectId=${projectId}`);
            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                setTrades(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return {
        trades,
        isLoading,
        error,
        toggleTrade,
        updateStatus
    };
}
