'use client';

import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type {
  BuildingClass,
  ProjectType,
  BuildingClassConfig,
  Region,
} from '@/types/profiler';

interface ProfileSectionProps {
  projectId: string;
  data: any;
  onUpdate: () => void;
  onProfileChange?: (buildingClass: BuildingClass | null, projectType: ProjectType | null, region?: Region) => void;
  onShowProfiler?: () => void;
  isActive?: boolean;
}

export function ProfileSection({ projectId, data, onUpdate, onProfileChange, onShowProfiler, isActive = false }: ProfileSectionProps) {
  // Form state - Class, Type, and Region
  const [buildingClass, setBuildingClass] = useState<BuildingClass | null>(data?.buildingClass || null);
  const [projectType, setProjectType] = useState<ProjectType | null>(data?.projectType || null);
  const [region, setRegion] = useState<Region>(data?.region || 'AU');

  // Sync with external data
  useEffect(() => {
    if (data) {
      setBuildingClass(data.buildingClass || null);
      setProjectType(data.projectType || null);
      setRegion(data.region || 'AU');
    }
  }, [data]);

  // Notify parent of changes
  useEffect(() => {
    onProfileChange?.(buildingClass, projectType, region);
  }, [buildingClass, projectType, region, onProfileChange]);

  const isClassTypeComplete = buildingClass && projectType;

  return (
    <div
      className={`nav-panel-section py-3 ${isActive ? 'nav-panel-active' : ''} cursor-pointer`}
      onClick={onShowProfiler}
    >
      <div className="nav-panel-header w-full mb-2">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
            Building
          </h3>
        </div>
      </div>

    </div>
  );
}
