import { useState, useEffect, useCallback } from 'react';

export interface Consultant {
  id: string;
  projectId: string;
  companyName: string;
  contactPerson: string | null;
  discipline: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  abn: string | null;
  notes: string | null;
  shortlisted: boolean;
  awarded: boolean;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultantFormData {
  companyName: string;
  contactPerson?: string;
  discipline: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  abn?: string;
  notes?: string;
  shortlisted?: boolean;
  awarded?: boolean;
  companyId?: string | null;
}

export function useConsultants(projectId: string, discipline?: string) {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsultants = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const url = discipline
        ? `/api/consultants/firms?projectId=${projectId}&discipline=${encodeURIComponent(discipline)}`
        : `/api/consultants/firms?projectId=${projectId}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch consultants');

      const data = await response.json();
      setConsultants(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, discipline]);

  useEffect(() => {
    fetchConsultants();
  }, [fetchConsultants]);

  const addConsultant = async (data: ConsultantFormData) => {
    try {
      const response = await fetch('/api/consultants/firms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Duplicate found
          throw new Error(errorData.error || 'Duplicate consultant found');
        }
        throw new Error(errorData.error || 'Failed to create consultant');
      }

      const newConsultant = await response.json();
      setConsultants(prev => [...prev, newConsultant]);
      return newConsultant;
    } catch (err) {
      throw err;
    }
  };

  const updateConsultant = async (id: string, data: ConsultantFormData) => {
    // Optimistic update
    const oldConsultant = consultants.find(c => c.id === id);
    setConsultants(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));

    try {
      const response = await fetch(`/api/consultants/firms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        // Revert on error
        if (oldConsultant) {
          setConsultants(prev => prev.map(c =>
            c.id === id ? oldConsultant : c
          ));
        }

        const errorData = await response.json();
        if (response.status === 409) {
          throw new Error(errorData.error || 'Duplicate consultant found');
        }
        throw new Error(errorData.error || 'Failed to update consultant');
      }

      const updatedConsultant = await response.json();
      setConsultants(prev => prev.map(c =>
        c.id === id ? updatedConsultant : c
      ));
      return updatedConsultant;
    } catch (err) {
      throw err;
    }
  };

  const deleteConsultant = async (id: string) => {
    // Optimistic update
    const oldConsultants = [...consultants];
    setConsultants(prev => prev.filter(c => c.id !== id));

    try {
      const response = await fetch(`/api/consultants/firms/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on error
        setConsultants(oldConsultants);
        throw new Error('Failed to delete consultant');
      }
    } catch (err) {
      throw err;
    }
  };

  const toggleShortlist = async (id: string, shortlisted: boolean) => {
    const consultant = consultants.find(c => c.id === id);
    if (!consultant) return;

    try {
      await updateConsultant(id, {
        companyName: consultant.companyName,
        contactPerson: consultant.contactPerson || undefined,
        discipline: consultant.discipline,
        email: consultant.email,
        phone: consultant.phone || undefined,
        mobile: consultant.mobile || undefined,
        address: consultant.address || undefined,
        abn: consultant.abn || undefined,
        notes: consultant.notes || undefined,
        shortlisted,
      });
    } catch (err) {
      throw err;
    }
  };

  const toggleAward = async (id: string, awarded: boolean, stakeholderId?: string) => {
    const consultant = consultants.find(c => c.id === id);
    if (!consultant) return;

    // stakeholderId is required for the new award API
    if (!stakeholderId) {
      throw new Error('stakeholderId is required for award toggle');
    }

    try {
      const response = await fetch('/api/firms/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          firmId: id,
          firmType: 'consultant',
          stakeholderId,
          awarded,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update award status');
      }

      const result = await response.json();

      // Update local state
      setConsultants(prev => prev.map(c => {
        if (c.id === id) {
          // Update the awarded firm
          return { ...c, awarded, companyId: result.companyId };
        }
        if (result.deawardedFirmIds?.includes(c.id)) {
          // De-award previously awarded firms
          return { ...c, awarded: false };
        }
        return c;
      }));

      return result;
    } catch (err) {
      throw err;
    }
  };

  return {
    consultants,
    isLoading,
    error,
    addConsultant,
    updateConsultant,
    deleteConsultant,
    toggleShortlist,
    toggleAward,
    refetch: fetchConsultants,
  };
}
