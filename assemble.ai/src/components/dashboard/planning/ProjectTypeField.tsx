'use client';

/**
 * Project Type Field
 * Clickable field in DetailsSection that opens the Project Initiator wizard
 * Feature: 018-project-initiator
 */

import { useState, useEffect } from 'react';
import { Edit2, Loader2 } from 'lucide-react';
import { ProjectInitiatorModal } from '@/components/project-wizard/ProjectInitiatorModal';
import type { ProjectTypeId } from '@/lib/types/project-initiator';

interface ProjectTypeFieldProps {
  projectId: string;
  projectType?: ProjectTypeId | null;
  onUpdate?: () => void;
}

export function ProjectTypeField({ projectId, projectType, onUpdate }: ProjectTypeFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectTypeName, setProjectTypeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectType) {
      setProjectTypeName(null);
      return;
    }

    async function loadProjectTypeName() {
      try {
        setLoading(true);
        const data = await import('@/lib/data/project-types.json');
        const type = data.projectTypes.types.find((t) => t.id === projectType);
        setProjectTypeName(type?.name || projectType);
      } catch (error) {
        console.error('Failed to load project type name:', error);
        setProjectTypeName(projectType);
      } finally {
        setLoading(false);
      }
    }

    loadProjectTypeName();
  }, [projectType]);

  const handleComplete = () => {
    setIsModalOpen(false);
    onUpdate?.();
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="group w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary transition-colors text-left"
      >
        <div className="flex-1">
          <div className="text-sm text-muted-foreground mb-1">Project Type</div>
          <div className="font-medium">
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : projectTypeName ? (
              projectTypeName
            ) : (
              <span className="text-muted-foreground">Not Set</span>
            )}
          </div>
        </div>
        <Edit2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>

      <ProjectInitiatorModal
        projectId={projectId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleComplete}
      />
    </>
  );
}
