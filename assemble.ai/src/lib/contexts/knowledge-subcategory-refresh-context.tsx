'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface KnowledgeSubcategoryRefreshContextValue {
  version: number;
  triggerRefresh: () => void;
}

const KnowledgeSubcategoryRefreshContext = createContext<KnowledgeSubcategoryRefreshContextValue | null>(null);

interface KnowledgeSubcategoryRefreshProviderProps {
  children: ReactNode;
}

export function KnowledgeSubcategoryRefreshProvider({ children }: KnowledgeSubcategoryRefreshProviderProps) {
  const [version, setVersion] = useState(0);

  const triggerRefresh = useCallback(() => {
    setVersion(prev => prev + 1);
  }, []);

  return (
    <KnowledgeSubcategoryRefreshContext.Provider value={{ version, triggerRefresh }}>
      {children}
    </KnowledgeSubcategoryRefreshContext.Provider>
  );
}

export function useKnowledgeSubcategoryRefresh() {
  const context = useContext(KnowledgeSubcategoryRefreshContext);

  if (!context) {
    return {
      version: 0,
      triggerRefresh: () => {},
    };
  }

  return context;
}
