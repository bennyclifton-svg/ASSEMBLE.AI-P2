import { useState, useEffect, useCallback } from 'react';
import type { Invoice, InvoiceWithRelations, CreateInvoiceInput, UpdateInvoiceInput } from '@/types/invoice';

export function useInvoices(projectId: string, filters?: {
  costLineId?: string;
  periodYear?: number;
  periodMonth?: number;
}) {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters?.costLineId) params.set('costLineId', filters.costLineId);
      if (filters?.periodYear) params.set('periodYear', String(filters.periodYear));
      if (filters?.periodMonth) params.set('periodMonth', String(filters.periodMonth));

      const url = `/api/projects/${projectId}/invoices${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data = await response.json();
      setInvoices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filters?.costLineId, filters?.periodYear, filters?.periodMonth]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    isLoading,
    error,
    refetch: fetchInvoices,
  };
}

export function useInvoiceMutations(projectId: string, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInvoice = useCallback(async (data: Omit<CreateInvoiceInput, 'projectId'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      const created = await response.json();
      onSuccess?.();
      return created as Invoice;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  const updateInvoice = useCallback(async (id: string, data: UpdateInvoiceInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update invoice');
      }

      const updated = await response.json();
      onSuccess?.();
      return updated as Invoice;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  const deleteInvoice = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/invoices/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete invoice');
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    isSubmitting,
    error,
  };
}
