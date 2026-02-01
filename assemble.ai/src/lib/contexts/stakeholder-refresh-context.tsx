'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface StakeholderRefreshContextValue {
  /**
   * Version number that increments when stakeholders change.
   * Components can use this as a dependency to trigger refetches.
   */
  version: number;

  /**
   * Call this function to notify all dependent components that
   * stakeholder data has changed and they should refetch.
   */
  triggerRefresh: () => void;
}

const StakeholderRefreshContext = createContext<StakeholderRefreshContextValue | null>(null);

interface StakeholderRefreshProviderProps {
  children: ReactNode;
}

/**
 * Provider that enables global stakeholder cache invalidation.
 *
 * When stakeholders are generated/modified, call `triggerRefresh()` to notify
 * all dependent components (StakeholderNav, DocumentRepository categories, etc.)
 * to refetch their data.
 */
export function StakeholderRefreshProvider({ children }: StakeholderRefreshProviderProps) {
  const [version, setVersion] = useState(0);

  const triggerRefresh = useCallback(() => {
    setVersion(prev => prev + 1);
  }, []);

  return (
    <StakeholderRefreshContext.Provider value={{ version, triggerRefresh }}>
      {children}
    </StakeholderRefreshContext.Provider>
  );
}

/**
 * Hook to access the stakeholder refresh context.
 * Returns the current version and triggerRefresh function.
 *
 * Use `version` as a useEffect dependency to refetch when stakeholders change.
 */
export function useStakeholderRefresh() {
  const context = useContext(StakeholderRefreshContext);

  // If used outside provider, return a no-op version
  // This allows hooks to work even if provider isn't present
  if (!context) {
    return {
      version: 0,
      triggerRefresh: () => {},
    };
  }

  return context;
}
