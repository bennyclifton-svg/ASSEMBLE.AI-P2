'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { ProjectSwitcher } from '@/components/dashboard/ProjectSwitcher';
import { Box, Loader2, MapPin, Building2, Target, Users } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function ProjectsIndexPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has projects — if so, redirect to the first one
  useEffect(() => {
    async function checkProjects() {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch projects');
        }
        const projects = await res.json();
        if (Array.isArray(projects) && projects.length > 0) {
          router.push(`/projects/${projects[0].id}`);
          return;
        }
      } catch (error) {
        console.error('Error checking projects:', error);
      }
      setIsLoading(false);
    }
    checkProjects();
  }, [router]);

  const handleSelectProject = useCallback(
    (project: Project | null) => {
      if (project) {
        router.push(`/projects/${project.id}`);
      }
    },
    [router]
  );

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // Tab styling matching ProcurementCard
  const tabClassName = `
    relative rounded-none px-4 py-4 text-[15px] font-medium bg-transparent
    tab-aurora-main
    transition-all duration-200 ease-out
    text-[var(--color-text-muted)] opacity-50 cursor-default
  `;

  return (
    <div className="h-screen w-full bg-background">
      <ResizableLayout
        leftContent={
          <div className="h-full overflow-y-auto section-planning">
            <div className="nav-panel-unified pt-[60px]">
              {/* Lot section - mirrors DetailsSection */}
              <div className="nav-panel-section py-3 opacity-40">
                <div className="nav-panel-header w-full">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
                      Lot
                    </h3>
                  </div>
                </div>
              </div>

              {/* Building section - mirrors ProfileSection */}
              <div className="nav-panel-section py-3 opacity-40">
                <div className="nav-panel-header w-full mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
                      Building
                    </h3>
                  </div>
                </div>
              </div>

              {/* Objectives section - mirrors ObjectivesNav */}
              <div className="nav-panel-section py-3 opacity-40">
                <div className="nav-panel-header w-full">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
                      Objectives
                    </h3>
                  </div>
                </div>
              </div>

              {/* Stakeholders section - mirrors StakeholderNav */}
              <div className="nav-panel-section py-3 opacity-40">
                <div className="nav-panel-header py-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
                      Stakeholders
                    </h3>
                  </div>
                </div>
              </div>

              {/* Project Switcher */}
              <div className="nav-panel-section py-3 overflow-hidden">
                <div className="nav-panel-header w-full overflow-hidden">
                  <ProjectSwitcher
                    selectedProject={null}
                    onSelectProject={handleSelectProject}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <Box className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0" />
                      <span className="text-base font-medium text-[var(--color-text-primary)] truncate">
                        Projects
                      </span>
                    </div>
                  </ProjectSwitcher>
                </div>
              </div>
            </div>
          </div>
        }
        centerContent={
          <div className="h-full flex flex-col overflow-hidden">
            {/* Tab bar - mirrors ProcurementCard tabs */}
            <div className="flex-shrink-0 px-6">
              <div className="w-full flex justify-start items-end border-b border-[var(--color-border)] h-auto p-0 gap-1.5 pl-[20%]">
                <div className={tabClassName}>Cost Planning</div>
                <div className={tabClassName}>Program</div>
                <div className={tabClassName}>Procurement</div>
                <div className={tabClassName}>Notes</div>
                <div className={`${tabClassName} text-center !px-2 !py-2`}>
                  <span className="flex flex-col leading-none gap-0.5">
                    <span>Meetings</span>
                    <span>Reports</span>
                  </span>
                </div>
              </div>
            </div>
            {/* Empty state message */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm mx-auto px-6">
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Create a new project using the project switcher in the left panel to get started.
                </p>
              </div>
            </div>
          </div>
        }
        rightContent={
          <div className="h-full" />
        }
      />
    </div>
  );
}
