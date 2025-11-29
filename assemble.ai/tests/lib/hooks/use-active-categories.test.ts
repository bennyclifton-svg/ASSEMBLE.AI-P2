import { renderHook, waitFor } from '@testing-library/react';
import { useActiveCategories } from '@/lib/hooks/use-active-categories';

// Mock fetch
global.fetch = jest.fn();

describe('useActiveCategories', () => {
  const mockProjectId = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  test('returns loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading
    );

    const { result } = renderHook(() => useActiveCategories(mockProjectId));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  test('fetches and returns active categories', async () => {
    const mockCategories = [
      {
        id: 'planning',
        name: 'Planning',
        color: '#007ACC',
        row: 1,
        hasSubcategories: false,
      },
      {
        id: 'consultants',
        name: 'Consultants',
        color: '#00BCD4',
        row: 2,
        hasSubcategories: true,
        subcategorySource: 'consultants',
        subcategories: [
          { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
          { id: 'mep', name: 'MEP', parentCategoryId: 'consultants' },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCategories,
    });

    const { result } = renderHook(() => useActiveCategories(mockProjectId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/categories/active?projectId=${mockProjectId}`
    );
  });

  test('filters categories based on active disciplines and trades', async () => {
    const mockCategories = [
      {
        id: 'consultants',
        name: 'Consultants',
        color: '#00BCD4',
        row: 2,
        hasSubcategories: true,
        subcategorySource: 'consultants',
        subcategories: [
          { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
        ], // Only structural is active
      },
      {
        id: 'contractors',
        name: 'Contractors',
        color: '#FF9800',
        row: 2,
        hasSubcategories: true,
        subcategorySource: 'contractors',
        subcategories: [], // No active trades
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCategories,
    });

    const { result } = renderHook(() => useActiveCategories(mockProjectId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const consultants = result.current.categories.find(c => c.id === 'consultants');
    expect(consultants?.subcategories).toHaveLength(1);
    expect(consultants?.subcategories?.[0].name).toBe('Structural');

    const contractors = result.current.categories.find(c => c.id === 'contractors');
    expect(contractors?.subcategories).toHaveLength(0);
  });

  test('handles fetch errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useActiveCategories(mockProjectId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  test('handles non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useActiveCategories(mockProjectId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe('Failed to fetch categories');
  });

  test('does not fetch when projectId is empty', () => {
    const { result } = renderHook(() => useActiveCategories(''));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.categories).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('refetches when projectId changes', async () => {
    const mockCategories1 = [
      { id: 'planning', name: 'Planning', row: 1, hasSubcategories: false },
    ];
    const mockCategories2 = [
      { id: 'scheme-design', name: 'Scheme Design', row: 1, hasSubcategories: false },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories2,
      });

    const { result, rerender } = renderHook(
      ({ projectId }) => useActiveCategories(projectId),
      {
        initialProps: { projectId: 'project1' },
      }
    );

    await waitFor(() => {
      expect(result.current.categories).toEqual(mockCategories1);
    });

    rerender({ projectId: 'project2' });

    await waitFor(() => {
      expect(result.current.categories).toEqual(mockCategories2);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith('/api/categories/active?projectId=project1');
    expect(global.fetch).toHaveBeenCalledWith('/api/categories/active?projectId=project2');
  });
});