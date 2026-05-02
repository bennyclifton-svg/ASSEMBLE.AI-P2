'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { PlanningCard } from '@/components/dashboard/PlanningCard';
import { ProcurementCard } from '@/components/dashboard/ProcurementCard';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { StakeholderRefreshProvider } from '@/lib/contexts/stakeholder-refresh-context';
import { KnowledgeSubcategoryRefreshProvider } from '@/lib/contexts/knowledge-subcategory-refresh-context';
import { useChatViewContextPatch } from '@/lib/contexts/chat-view-context';
import { useProjectEvents } from '@/lib/hooks/use-project-events';
import {
  DOCUMENT_SELECTION_CHANGED_EVENT,
  type DocumentSelectionChangedDetail,
} from '@/lib/chat/document-selection-events';
import { Loader2 } from 'lucide-react';
import type { BuildingClass, ProjectType, Region } from '@/types/profiler';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface PlanningData {
  details?: unknown;
  [key: string]: unknown;
}

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { setViewContextPatch } = useChatViewContextPatch();

  // Planning data state for details panel
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);

  // Profiler state - shared between left nav and middle panel
  const [profileBuildingClass, setProfileBuildingClass] = useState<BuildingClass | null>(null);
  const [profileProjectType, setProfileProjectType] = useState<ProjectType | null>(null);
  const [profileRegion, setProfileRegion] = useState<Region>('AU');

  // Center panel tab state - persisted in URL so refresh keeps the user on the same tab.
  // This is pure client UI, so use native history instead of an App Router navigation
  // to avoid re-rendering the whole project route on every tab switch.
  const [centerActiveTab, setCenterActiveTabState] = useState(searchParams.get('tab') ?? 'brief');

  // Sub-tab state (only meaningful when centerActiveTab === 'brief'). URL is the source of truth.
  const VALID_BRIEF_SUBS = ['lot', 'building', 'objectives'] as const;
  const rawSub = searchParams.get('sub');
  const centerActiveSubTab = (VALID_BRIEF_SUBS as readonly string[]).includes(rawSub ?? '')
    ? (rawSub as string)
    : 'lot';

  useEffect(() => {
    setViewContextPatch({
      tab: centerActiveTab,
      sub: centerActiveTab === 'brief' ? centerActiveSubTab : undefined,
      selectedEntityIds: {
        document: Array.from(selectedDocumentIds),
      },
    });
  }, [centerActiveSubTab, centerActiveTab, selectedDocumentIds, setViewContextPatch]);

  // Legacy URL redirect: map old tab values to brief + matching sub.
  // Runs once when an old value is detected; guarded so it never loops.
  useEffect(() => {
    const LEGACY_TO_SUB: Record<string, string> = {
      profiler: 'building',
      objectives: 'objectives',
      'project-details': 'lot',
    };
    const tabParam = searchParams.get('tab');
    if (tabParam && LEGACY_TO_SUB[tabParam]) {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', 'brief');
      next.set('sub', LEGACY_TO_SUB[tabParam]);
      window.history.replaceState(null, '', `/projects/${projectId}?${next.toString()}`);
      setCenterActiveTabState('brief');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const nextTab = searchParams.get('tab') ?? 'brief';
    setCenterActiveTabState((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  const setCenterActiveTab = useCallback(
    (tab: string) => {
      setCenterActiveTabState(tab);
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', tab);
      window.history.replaceState(
        null,
        '',
        `/projects/${projectId}?${next.toString()}`
      );
    },
    [projectId, searchParams]
  );

  const setCenterActiveSubTab = useCallback(
    (sub: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', 'brief');
      next.set('sub', sub);
      window.history.replaceState(
        null,
        '',
        `/projects/${projectId}?${next.toString()}`
      );
      setCenterActiveTabState('brief');
    },
    [projectId, searchParams]
  );

  // Handler to set selected document IDs from an array (for transmittal load)
  const handleSetSelectedDocumentIds = useCallback((ids: string[]) => {
    setSelectedDocumentIds(new Set(ids));
  }, []);

  const applyDocumentSelection = useCallback(
    (event: { mode: 'replace' | 'add' | 'remove' | 'clear'; documentIds: string[] }) => {
      setSelectedDocumentIds((current) => {
        if (event.mode === 'clear') return new Set();
        const next = event.mode === 'replace' ? new Set<string>() : new Set(current);
        for (const id of event.documentIds) {
          if (event.mode === 'remove') {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        return next;
      });
    },
    []
  );

  useProjectEvents(projectId, (event) => {
    if (event.type !== 'document_selection_changed') return;
    applyDocumentSelection(event);
  });

  useEffect(() => {
    const handleChatSelection = (event: Event) => {
      const detail = (event as CustomEvent<DocumentSelectionChangedDetail>).detail;
      if (!detail || detail.projectId !== projectId) return;
      applyDocumentSelection(detail);
    };

    window.addEventListener(DOCUMENT_SELECTION_CHANGED_EVENT, handleChatSelection);
    return () => {
      window.removeEventListener(DOCUMENT_SELECTION_CHANGED_EVENT, handleChatSelection);
    };
  }, [applyDocumentSelection, projectId]);

  // Handler for project name changes - triggers refresh of project switcher
  const handleProjectNameChange = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Handler for building class change from middle panel
  const handleClassChange = useCallback((cls: BuildingClass) => {
    setProfileBuildingClass(cls);
  }, []);

  // Handler for project type change from middle panel
  const handleTypeChange = useCallback((type: ProjectType) => {
    setProfileProjectType(type);
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
  }, [setCenterActiveTab]);

  // Handler for knowledge navigation - switches center panel to Knowledge tab
  const handleKnowledgeNavigate = useCallback(() => {
    setCenterActiveTab('knowledge');
  }, [setCenterActiveTab]);

  // Handler for Brief navigation - switches center panel to Brief tab
  const handleShowBrief = useCallback(() => {
    setCenterActiveTab('brief');
  }, [setCenterActiveTab]);

  // Fetch planning data
  const fetchPlanningData = useCallback(async () => {
    try {
      const response = await fetch(`/api/planning/${projectId}`);
      const data = await response.json() as PlanningData;
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
        setProject(newProject);
        if (newProject.id !== projectId) {
          router.push(`/projects/${newProject.id}`);
        }
      } else {
        router.push('/');
      }
    },
    [router, projectId]
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
    <KnowledgeSubcategoryRefreshProvider>
      <div className="h-screen w-full bg-background">
        {/* Full-height resizable layout - columns extend to top */}
        <ResizableLayout
          leftContent={
            <PlanningCard
              projectId={project.id}
              onStakeholderNavigate={handleStakeholderNavigate}
              onKnowledgeNavigate={handleKnowledgeNavigate}
              onShowBrief={handleShowBrief}
              activeMainTab={centerActiveTab}
              refreshKey={refreshTrigger}
              selectedProject={project}
              onSelectProject={handleSelectProject}
            />
          }
          centerContent={
            <ProcurementCard
              projectId={project.id}
              selectedDocumentIds={Array.from(selectedDocumentIds)}
              onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
              buildingClass={profileBuildingClass}
              projectType={profileProjectType}
              onClassChange={handleClassChange}
              onTypeChange={handleTypeChange}
              region={profileRegion}
              onRegionChange={setProfileRegion}
              onProfileComplete={handleProfileComplete}
              onProfileLoad={handleProfileLoad}
              activeMainTab={centerActiveTab}
              onMainTabChange={setCenterActiveTab}
              activeSubTab={centerActiveSubTab}
              onSubTabChange={setCenterActiveSubTab}
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
    </KnowledgeSubcategoryRefreshProvider>
    </StakeholderRefreshProvider>
  );
}
