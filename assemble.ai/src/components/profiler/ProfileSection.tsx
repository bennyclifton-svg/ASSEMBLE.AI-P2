'use client';

import { useState, useEffect } from 'react';
import { Building2, Home, Factory, Landmark, Layers, Route, Tractor, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
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

// Primary classes shown by default, secondary classes hidden behind "Others"
const PRIMARY_CLASSES: BuildingClass[] = ['residential', 'commercial', 'industrial', 'institution'];
const SECONDARY_CLASSES: BuildingClass[] = ['mixed', 'infrastructure', 'agricultural', 'defense_secure'];

export function ProfileSection({ projectId, data, onUpdate, onProfileChange, onShowProfiler, isActive = false }: ProfileSectionProps) {
  // Form state - Class, Type, and Region
  const [buildingClass, setBuildingClass] = useState<BuildingClass | null>(data?.buildingClass || null);
  const [projectType, setProjectType] = useState<ProjectType | null>(data?.projectType || null);
  const [region, setRegion] = useState<Region>(data?.region || 'AU');
  const [showOtherClasses, setShowOtherClasses] = useState<boolean>(false);

  // Sync with external data
  useEffect(() => {
    if (data) {
      setBuildingClass(data.buildingClass || null);
      setProjectType(data.projectType || null);
      setRegion(data.region || 'AU');
      // Auto-expand "Others" if a secondary class is selected
      if (data.buildingClass && SECONDARY_CLASSES.includes(data.buildingClass)) {
        setShowOtherClasses(true);
      }
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

  const isClassTypeComplete = buildingClass && projectType;

  return (
    <div
      className={`nav-panel-section py-3 pl-2 pr-3 ${isActive ? 'nav-panel-active' : ''} ${isClassTypeComplete ? 'cursor-pointer' : ''}`}
      onClick={isClassTypeComplete ? onShowProfiler : undefined}
    >
      <div className="nav-panel-header w-full mb-2">
        <h3 className="nav-panel-title text-sm font-semibold text-[var(--color-text-primary)] transition-colors">
          Profile
        </h3>
        <CornerBracketIcon
          direction={isActive ? 'right' : 'left'}
          gradient={isActive}
          className={`nav-panel-chevron w-3.5 h-3.5 ${!isActive ? 'text-[var(--color-text-muted)]' : ''} transition-colors`}
        />
      </div>

      {/* Building Class and Project Type side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Building Class selection */}
        <div>
          <div className="space-y-1">
            {/* Primary classes - always visible */}
            {PRIMARY_CLASSES.map((key) => {
              const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[key];
              return (
                <button
                  key={key}
                  onClick={(e) => { e.stopPropagation(); handleClassSelect(key); }}
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
                  <span className="truncate">{config.label}</span>
                </button>
              );
            })}

            {/* Others toggle button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowOtherClasses(!showOtherClasses); }}
              className="w-full flex items-center justify-between gap-1.5 p-2 rounded-lg border text-xs transition-all border-[var(--color-border)] hover:border-[var(--color-text-muted)]/50 text-[var(--color-text-muted)]"
            >
              <span>Others</span>
              {showOtherClasses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Secondary classes - shown when expanded */}
            {showOtherClasses && SECONDARY_CLASSES.map((key) => {
              const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[key];
              return (
                <button
                  key={key}
                  onClick={(e) => { e.stopPropagation(); handleClassSelect(key); }}
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
                  <span className="truncate">{config.label}</span>
                </button>
              );
            })}
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
                  w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left border
                  ${
                    projectType === type.value
                      ? 'bg-[var(--color-accent-copper)] text-[var(--color-text-inverse)] border-[var(--color-accent-copper)]'
                      : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-copper-tint)] hover:border-[var(--color-accent-copper)]/50'
                  }
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
