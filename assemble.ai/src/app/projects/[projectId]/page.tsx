'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { PlanningCard } from '@/components/dashboard/PlanningCard';
import { ProcurementCard } from '@/components/dashboard/ProcurementCard';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { StakeholderRefreshProvider } from '@/lib/contexts/stakeholder-refresh-context';
import { Loader2 } from 'lucide-react';
import type { BuildingClass, ProjectType, Region } from '@/types/profiler';

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

  // Planning data state for details panel
  const [planningData, setPlanningData] = useState<any>(null);

  // Profiler state - shared between left nav and middle panel
  const [profileBuildingClass, setProfileBuildingClass] = useState<BuildingClass | null>(null);
  const [profileProjectType, setProfileProjectType] = useState<ProjectType | null>(null);
  const [profileRegion, setProfileRegion] = useState<Region>('AU');

  // Center panel tab state - for cross-panel navigation (default to profiler)
  const [centerActiveTab, setCenterActiveTab] = useState<string>('profiler');

  // Handler to set selected document IDs from an array (for transmittal load)
  const handleSetSelectedDocumentIds = useCallback((ids: string[]) => {
    setSelectedDocumentIds(new Set(ids));
  }, []);

  // Handler for project name changes - triggers refresh of project switcher
  const handleProjectNameChange = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Handler for profile class/type changes from left nav
  const handleProfileChange = useCallback((buildingClass: string | null, projectType: string | null, region?: Region) => {
    setProfileBuildingClass(buildingClass as BuildingClass | null);
    setProfileProjectType(projectType as ProjectType | null);
    if (region) setProfileRegion(region);
  }, []);

  // Handler for profile completion - refresh planning data
  const handleProfileComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Handler for profile load - update shared state and refresh PlanningCard
  const handleProfileLoad = useCallback((buildingClass: string, projectType: string) => {
    setProfileBuildingClass(buildingClass as BuildingClass);
    setProfileProjectType(projectType as ProjectType);
    setRefreshTrigger((prev) => prev + 1); // Trigger PlanningCard re-fetch
  }, []);

  // Handler for stakeholder navigation - switches center panel to Stakeholders tab
  const handleStakeholderNavigate = useCallback(() => {
    setCenterActiveTab('stakeholders');
  }, []);

  // Handler for profiler navigation - switches center panel to Profiler tab
  const handleShowProfiler = useCallback(() => {
    setCenterActiveTab('profiler');
  }, []);

  // Handler for objectives navigation - switches center panel to Objectives tab
  const handleShowObjectives = useCallback(() => {
    setCenterActiveTab('objectives');
  }, []);

  // Handler for project details navigation - switches center panel to Project Details tab
  const handleShowProjectDetails = useCallback(() => {
    setCenterActiveTab('project-details');
  }, []);

  // Fetch planning data
  const fetchPlanningData = useCallback(async () => {
    try {
      const response = await fetch(`/api/planning/${projectId}`);
      const data = await response.json();
      setPlanningData(data);
    } catch (error) {
      console.error('Error fetching planning data:', error);
    }
  }, [projectId]);

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

  // Fetch planning data on mount and when refreshTrigger changes
  useEffect(() => {
    if (projectId) {
      fetchPlanningData();
    }
  }, [projectId, refreshTrigger, fetchPlanningData]);

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
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Project not found</div>
      </div>
    );
  }

  return (
    <StakeholderRefreshProvider>
      <div className="h-screen w-full bg-background">
        {/* Full-height resizable layout - columns extend to top */}
        <ResizableLayout
          leftContent={
            <PlanningCard
              projectId={project.id}
              selectedProject={project}
              onSelectProject={handleSelectProject}
              selectedDocumentIds={Array.from(selectedDocumentIds)}
              onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
              onProjectNameChange={handleProjectNameChange}
              onProfileChange={handleProfileChange}
              onStakeholderNavigate={handleStakeholderNavigate}
              onShowProfiler={handleShowProfiler}
              onShowObjectives={handleShowObjectives}
              onShowProjectDetails={handleShowProjectDetails}
              activeMainTab={centerActiveTab}
              refreshKey={refreshTrigger}
            />
          }
          centerContent={
            <ProcurementCard
              projectId={project.id}
              selectedDocumentIds={Array.from(selectedDocumentIds)}
              onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
              buildingClass={profileBuildingClass}
              projectType={profileProjectType}
              region={profileRegion}
              onRegionChange={setProfileRegion}
              onProfileComplete={handleProfileComplete}
              onProfileLoad={handleProfileLoad}
              activeMainTab={centerActiveTab}
              onMainTabChange={setCenterActiveTab}
              detailsData={planningData?.details}
              onDetailsUpdate={fetchPlanningData}
              onProjectNameChange={handleProjectNameChange}
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
    </StakeholderRefreshProvider>
  );
}
