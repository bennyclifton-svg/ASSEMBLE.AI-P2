'use client';

import { useState, useCallback } from 'react';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { PlanningCard } from '@/components/dashboard/PlanningCard';
import { ConsultantCard } from '@/components/dashboard/ConsultantCard';
import { DocumentCard } from '@/components/dashboard/DocumentCard';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());

  // Handler to set selected document IDs from an array (for transmittal load)
  const handleSetSelectedDocumentIds = useCallback((ids: string[]) => {
    setSelectedDocumentIds(new Set(ids));
  }, []);

  return (
    <div className="h-screen w-full bg-[#1e1e1e]">
      {/* Full-height resizable layout - columns extend to top */}
      <ResizableLayout
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        leftContent={
          selectedProject ? (
            <PlanningCard
              projectId={selectedProject.id}
              selectedDocumentIds={Array.from(selectedDocumentIds)}
              onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
              <div className="text-[#858585]">Select a project to view planning data</div>
            </div>
          )
        }
        centerContent={
          selectedProject ? (
            <ConsultantCard
              projectId={selectedProject.id}
              selectedDocumentIds={Array.from(selectedDocumentIds)}
              onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
              <div className="text-[#858585]">Select a project to view consultants</div>
            </div>
          )
        }
        rightContent={
          selectedProject ? (
            <DocumentCard
              projectId={selectedProject.id}
              selectedDocumentIds={selectedDocumentIds}
              onSelectionChange={setSelectedDocumentIds}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
              <div className="text-[#858585]">Select a project to view documents</div>
            </div>
          )
        }
      />
    </div>
  );
}
