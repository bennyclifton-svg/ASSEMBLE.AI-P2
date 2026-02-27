'use client';

import { BookOpen } from 'lucide-react';

interface KnowledgeNavProps {
  projectId: string;
  onNavigate?: () => void;
  isActive?: boolean;
}

export function KnowledgeNav({ projectId, onNavigate, isActive = false }: KnowledgeNavProps) {
  return (
    <div className={`nav-panel-section ${isActive ? 'nav-panel-active' : ''}`}>
      <div
        className="nav-panel-header py-2"
        onClick={onNavigate}
      >
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
            Knowledge
          </h3>
        </div>
      </div>
    </div>
  );
}
