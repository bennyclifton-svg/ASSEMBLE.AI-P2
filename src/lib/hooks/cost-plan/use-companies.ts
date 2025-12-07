import { useState, useEffect, useCallback } from 'react';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '@/types/cost-plan';

export function useCompanies(search?: string) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = search
        ? `/api/cost-companies?search=${encodeURIComponent(search)}`
        : '/api/cost-companies';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch companies');

      const data = await response.json();
      setCompanies(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return {
    companies,
    isLoading,
    error,
    refetch: fetchCompanies,
  };
}

export function useCompanyMutations(onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCompany = useCallback(async (data: CreateCompanyInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/cost-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create company');
      }

      const created = await response.json();
      onSuccess?.();
      return created as Company;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);

  const updateCompany = useCallback(async (id: string, data: UpdateCompanyInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/cost-companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company');
      }

      const updated = await response.json();
      onSuccess?.();
      return updated as Company;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);

  const deleteCompany = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/cost-companies/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete company');
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);

  return {
    createCompany,
    updateCompany,
    deleteCompany,
    isSubmitting,
    error,
  };
}
