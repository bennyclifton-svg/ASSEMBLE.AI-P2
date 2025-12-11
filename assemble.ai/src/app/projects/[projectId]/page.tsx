'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { PlanningCard } from '@/components/dashboard/PlanningCard';
import { ProcurementCard } from '@/components/dashboard/ProcurementCard';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handler to set selected document IDs from an array (for transmittal load)
  const handleSetSelectedDocumentIds = useCallback((ids: string[]) => {
    setSelectedDocumentIds(new Set(ids));
  }, []);

  // Handler for project name changes - triggers refresh of project switcher
  const handleProjectNameChange = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Fetch project details
  useEffect(() => {
    async function fetchProject() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/projects');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch projects');
        }

        const projects = await res.json();
        const foundProject = projects.find((p: Project) => p.id === projectId);

        if (foundProject) {
          setProject(foundProject);
        } else {
          // Project not found, redirect to landing
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    if (projectId) {
      fetchProject();
    }
  }, [projectId, router]);

  // Handle project selection from switcher
  const handleSelectProject = useCallback(
    (newProject: Project | null) => {
      if (newProject) {
        router.push(`/projects/${newProject.id}`);
      } else {
        router.push('/');
      }
    },
    [router]
  );

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#808080] animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-[#808080]">Project not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#1e1e1e]">
      {/* Full-height resizable layout - columns extend to top */}
      <ResizableLayout
        selectedProject={project}
        onSelectProject={handleSelectProject}
        refreshTrigger={refreshTrigger}
        leftContent={
          <PlanningCard
            projectId={project.id}
            selectedDocumentIds={Array.from(selectedDocumentIds)}
            onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
            onProjectNameChange={handleProjectNameChange}
          />
        }
        centerContent={
          <ProcurementCard
            projectId={project.id}
            selectedDocumentIds={Array.from(selectedDocumentIds)}
            onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
          />
        }
        rightContent={
          <DocumentCard
            projectId={project.id}
            selectedDocumentIds={selectedDocumentIds}
            onSelectionChange={setSelectedDocumentIds}
          />
        }
      />
    </div>
  );
}
