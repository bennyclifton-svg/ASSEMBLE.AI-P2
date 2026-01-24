'use client';

import { useState, useEffect } from 'react';
import { Building2, Home, Factory, Landmark, Layers, Route, Tractor, Shield, Globe } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type {
  BuildingClass,
  ProjectType,
  BuildingClassConfig,
  Region,
} from '@/types/profiler';
import { REGIONS } from '@/types/profiler';

interface ProfileSectionProps {
  projectId: string;
  data: any;
  onUpdate: () => void;
  onProfileChange?: (buildingClass: BuildingClass | null, projectType: ProjectType | null, region?: Region) => void;
  onShowProfiler?: () => void;
  isActive?: boolean;
}

const BUILDING_CLASS_ICONS: Record<string, React.ReactNode> = {
  residential: <Home className="w-4 h-4" />,
  commercial: <Building2 className="w-4 h-4" />,
  industrial: <Factory className="w-4 h-4" />,
  institution: <Landmark className="w-4 h-4" />,
  mixed: <Layers className="w-4 h-4" />,
  infrastructure: <Route className="w-4 h-4" />,
  agricultural: <Tractor className="w-4 h-4" />,
  defense_secure: <Shield className="w-4 h-4" />,
};

const TriangleRight = () => (
  <svg
    className="w-3 h-3 text-[var(--color-text-muted)]"
    viewBox="0 0 12 12"
    fill="currentColor"
  >
    <polygon points="2,0 12,6 2,12" />
  </svg>
);

// Region configuration from templates
const regionConfig = (profileTemplates as any).regionConfig as Record<Region, {
  code: Region;
  name: string;
  buildingCodeAbbrev: string;
  currencySymbol: string;
}>;

export function ProfileSection({ projectId, data, onUpdate, onProfileChange, onShowProfiler, isActive = false }: ProfileSectionProps) {
  // Form state - Class, Type, and Region
  const [buildingClass, setBuildingClass] = useState<BuildingClass | null>(data?.buildingClass || null);
  const [projectType, setProjectType] = useState<ProjectType | null>(data?.projectType || null);
  const [region, setRegion] = useState<Region>(data?.region || 'AU');

  // Check if profile has subclass/scale/complexity (already configured)
  const hasFullProfile = data?.subclass?.length > 0 && Object.keys(data?.scaleData || {}).length > 0;

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

  // Handle class selection
  const handleClassSelect = (cls: BuildingClass) => {
    setBuildingClass(cls);
    onShowProfiler?.();
  };

  // Handle project type selection
  const handleTypeSelect = (type: ProjectType) => {
    setProjectType(type);
    onShowProfiler?.();
  };

  // Handle region selection
  const handleRegionSelect = (newRegion: Region) => {
    setRegion(newRegion);
  };

  const classConfig = buildingClass
    ? (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[buildingClass]
    : null;

  const isClassTypeComplete = buildingClass && projectType;

  return (
    <div
      className={`nav-panel py-3 pl-2 pr-3 relative overflow-hidden ${isActive ? 'nav-panel-active' : ''} ${isClassTypeComplete ? 'cursor-pointer hover:bg-[var(--color-bg-tertiary)]/50' : ''}`}
      onClick={isClassTypeComplete ? onShowProfiler : undefined}
    >
      <div className="nav-panel-header w-full mb-2">
        <h3 className="nav-panel-title text-sm font-semibold text-[var(--color-text-primary)] transition-colors">
          Project Profile
        </h3>
        <TriangleRight />
      </div>

      {/* Building Class and Project Type side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Building Class selection */}
        <div>
          <div className="space-y-1">
            {Object.entries(profileTemplates.buildingClasses).map(([key, config]) => (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); handleClassSelect(key as BuildingClass); }}
                className={`
                  w-full flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-all
                  ${
                    buildingClass === key
                      ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
                  }
                `}
              >
                {BUILDING_CLASS_ICONS[key]}
                <span className="truncate">{(config as BuildingClassConfig).label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Project Type selection */}
        <div>
          <div className="space-y-1">
            {profileTemplates.projectTypes.map((type) => (
              <button
                key={type.value}
                onClick={(e) => { e.stopPropagation(); handleTypeSelect(type.value as ProjectType); }}
                className={`
                  w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left
                  ${
                    projectType === type.value
                      ? 'bg-[var(--color-accent-copper)] text-[var(--color-text-inverse)]'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-copper-tint)]'
                  }
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Region Selector - compact horizontal layout at bottom */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--color-border)]" onClick={(e) => e.stopPropagation()}>
        <Globe className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        <div className="flex gap-1 flex-1">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleRegionSelect(r)}
              className={`
                flex-1 px-2 py-1 rounded text-xs font-medium transition-all
                ${
                  region === r
                    ? 'bg-[var(--color-text-muted)] text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-text-muted)]/20'
                }
              `}
              title={regionConfig[r]?.name || r}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
