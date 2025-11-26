import { useState, useEffect, useCallback } from 'react';

export interface Contractor {
  id: string;
  projectId: string;
  companyName: string;
  contactPerson: string | null;
  trade: string;
  email: string;
  phone: string | null;
  address: string | null;
  abn: string | null;
  notes: string | null;
  shortlisted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorFormData {
  companyName: string;
  contactPerson?: string;
  trade: string;
  email: string;
  phone?: string;
  address?: string;
  abn?: string;
  notes?: string;
  shortlisted?: boolean;
}

export function useContractors(projectId: string, trade?: string) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractors = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const url = trade
        ? `/api/contractors/firms?projectId=${projectId}&trade=${encodeURIComponent(trade)}`
        : `/api/contractors/firms?projectId=${projectId}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch contractors');

      const data = await response.json();
      setContractors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, trade]);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  const addContractor = async (data: ContractorFormData) => {
    try {
      const response = await fetch('/api/contractors/firms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Duplicate found
          throw new Error(errorData.error || 'Duplicate contractor found');
        }
        throw new Error(errorData.error || 'Failed to create contractor');
      }

      const newContractor = await response.json();
      setContractors(prev => [...prev, newContractor]);
      return newContractor;
    } catch (err) {
      throw err;
    }
  };

  const updateContractor = async (id: string, data: ContractorFormData) => {
    // Optimistic update
    const oldContractor = contractors.find(c => c.id === id);
    setContractors(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));

    try {
      const response = await fetch(`/api/contractors/firms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        // Revert on error
        if (oldContractor) {
          setContractors(prev => prev.map(c =>
            c.id === id ? oldContractor : c
          ));
        }

        const errorData = await response.json();
        if (response.status === 409) {
          throw new Error(errorData.error || 'Duplicate contractor found');
        }
        throw new Error(errorData.error || 'Failed to update contractor');
      }

      const updatedContractor = await response.json();
      setContractors(prev => prev.map(c =>
        c.id === id ? updatedContractor : c
      ));
      return updatedContractor;
    } catch (err) {
      throw err;
    }
  };

  const deleteContractor = async (id: string) => {
    // Optimistic update
    const oldContractors = [...contractors];
    setContractors(prev => prev.filter(c => c.id !== id));

    try {
      const response = await fetch(`/api/contractors/firms/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on error
        setContractors(oldContractors);
        throw new Error('Failed to delete contractor');
      }
    } catch (err) {
      throw err;
    }
  };

  const toggleShortlist = async (id: string, shortlisted: boolean) => {
    const contractor = contractors.find(c => c.id === id);
    if (!contractor) return;

    try {
      await updateContractor(id, {
        companyName: contractor.companyName,
        contactPerson: contractor.contactPerson || undefined,
        trade: contractor.trade,
        email: contractor.email,
        phone: contractor.phone || undefined,
        address: contractor.address || undefined,
        abn: contractor.abn || undefined,
        notes: contractor.notes || undefined,
        shortlisted,
      });
    } catch (err) {
      throw err;
    }
  };

  return {
    contractors,
    isLoading,
    error,
    addContractor,
    updateContractor,
    deleteContractor,
    toggleShortlist,
    refetch: fetchContractors,
  };
}
