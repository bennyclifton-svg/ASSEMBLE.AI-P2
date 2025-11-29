import { useState, useEffect } from 'react';

export interface ConsultantStatus {
    id: string;
    disciplineId: string;
    statusType: 'brief' | 'tender' | 'rec' | 'award';
    isActive: boolean;
    completedAt: string | null;
}

export interface ConsultantDiscipline {
    id: string;
    projectId: string;
    disciplineName: string;
    isEnabled: boolean;
    order: number;
    statuses: ConsultantStatus[];
}

export function useConsultantDisciplines(projectId: string) {
    const [disciplines, setDisciplines] = useState<ConsultantDiscipline[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;

        const fetchDisciplines = async () => {
            try {
                const response = await fetch(`/api/consultants/disciplines?projectId=${projectId}`);
                if (!response.ok) throw new Error('Failed to fetch disciplines');
                const data = await response.json();
                setDisciplines(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDisciplines();
    }, [projectId]);

    const toggleDiscipline = async (id: string, isEnabled: boolean) => {
        // Optimistic update
        setDisciplines(prev => prev.map(d =>
            d.id === id ? { ...d, isEnabled } : d
        ));

        try {
            const response = await fetch(`/api/consultants/disciplines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isEnabled }),
            });

            if (!response.ok) {
                // Revert on error
                setDisciplines(prev => prev.map(d =>
                    d.id === id ? { ...d, isEnabled: !isEnabled } : d
                ));
                throw new Error('Failed to update discipline');
            }
        } catch (err) {
            console.error(err);
            // Revert on error
            setDisciplines(prev => prev.map(d =>
                d.id === id ? { ...d, isEnabled: !isEnabled } : d
            ));
        }
    };

    const updateStatus = async (disciplineId: string, statusType: string, isActive: boolean) => {
        // Optimistic update
        setDisciplines(prev => prev.map(d => {
            if (d.id !== disciplineId) return d;

            const existingStatusIndex = d.statuses.findIndex(s => s.statusType === statusType);
            const newStatuses = [...d.statuses];

            if (existingStatusIndex >= 0) {
                newStatuses[existingStatusIndex] = { ...newStatuses[existingStatusIndex], isActive };
            } else {
                // Temporary placeholder until server response
                newStatuses.push({
                    id: 'temp-' + Date.now(),
                    disciplineId,
                    statusType: statusType as ConsultantStatus['statusType'],
                    isActive,
                    completedAt: isActive ? new Date().toISOString() : null
                });
            }

            return { ...d, statuses: newStatuses };
        }));

        try {
            const response = await fetch(`/api/consultants/disciplines/${disciplineId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statusType, isActive }),
            });

            if (!response.ok) throw new Error('Failed to update status');

            // Refresh data to get correct IDs and timestamps
            const refreshResponse = await fetch(`/api/consultants/disciplines?projectId=${projectId}`);
            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                setDisciplines(data);
            }
        } catch (err) {
            console.error(err);
            // Revert logic could be complex here, simpler to just refresh or show error
        }
    };

    return {
        disciplines,
        isLoading,
        error,
        toggleDiscipline,
        updateStatus
    };
}
