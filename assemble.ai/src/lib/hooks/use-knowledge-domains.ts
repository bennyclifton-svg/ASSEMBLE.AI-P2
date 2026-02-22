import { useState, useEffect, useCallback } from 'react';
import type { KnowledgeDomainDTO } from '@/app/api/knowledge-domains/route';

export interface CreateDomainInput {
    name: string;
    description?: string;
    domainType?: string;
    domainTags?: string[];
    organizationId: string;
}

export interface UpdateDomainInput {
    name?: string;
    description?: string;
    domainTags?: string[];
    isActive?: boolean;
}

interface UseKnowledgeDomainsReturn {
    domains: KnowledgeDomainDTO[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createDomain: (data: CreateDomainInput) => Promise<KnowledgeDomainDTO | null>;
    updateDomain: (id: string, data: UpdateDomainInput) => Promise<KnowledgeDomainDTO | null>;
    deleteDomain: (id: string) => Promise<boolean>;
    toggleDomain: (id: string, isActive: boolean) => Promise<KnowledgeDomainDTO | null>;
}

export function useKnowledgeDomains(organizationId?: string): UseKnowledgeDomainsReturn {
    const [domains, setDomains] = useState<KnowledgeDomainDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDomains = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (organizationId) params.set('organizationId', organizationId);

            const url = `/api/knowledge-domains${params.toString() ? `?${params}` : ''}`;
            const response = await fetch(url);

            if (!response.ok) throw new Error('Failed to fetch knowledge domains');

            const data = await response.json();
            setDomains(data.domains);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchDomains();
    }, [fetchDomains]);

    const createDomain = useCallback(
        async (data: CreateDomainInput): Promise<KnowledgeDomainDTO | null> => {
            try {
                const response = await fetch('/api/knowledge-domains', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create domain');
                }

                const result = await response.json();
                await fetchDomains(false);
                return result.domain;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                return null;
            }
        },
        [fetchDomains]
    );

    const updateDomain = useCallback(
        async (id: string, data: UpdateDomainInput): Promise<KnowledgeDomainDTO | null> => {
            try {
                const response = await fetch(`/api/knowledge-domains/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update domain');
                }

                const result = await response.json();

                // Optimistically update local state
                setDomains((prev) =>
                    prev.map((d) => (d.id === id ? result.domain : d))
                );

                return result.domain;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                return null;
            }
        },
        []
    );

    const deleteDomain = useCallback(
        async (id: string): Promise<boolean> => {
            try {
                const response = await fetch(`/api/knowledge-domains/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete domain');
                }

                // Optimistically remove from local state
                setDomains((prev) => prev.filter((d) => d.id !== id));
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                return false;
            }
        },
        []
    );

    const toggleDomain = useCallback(
        async (id: string, isActive: boolean): Promise<KnowledgeDomainDTO | null> => {
            return updateDomain(id, { isActive });
        },
        [updateDomain]
    );

    return {
        domains,
        isLoading,
        error,
        refetch: fetchDomains,
        createDomain,
        updateDomain,
        deleteDomain,
        toggleDomain,
    };
}
