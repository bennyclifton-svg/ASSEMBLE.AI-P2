'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Check, HelpCircle, Globe } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import {
  ContextChips,
  ComplexityScore,
  RiskFlags,
  ConsultantPreview,
  MarketContext,
} from './PowerFeatures';
import { NumberInput } from '@/components/ui/number-input';
import { WorkScopeSelector } from './WorkScopeSelector';
import type {
  BuildingClass,
  ProjectType,
  BuildingClassConfig,
  SubclassOption,
  ScaleField,
  ComplexityOption,
  Region,
} from '@/types/profiler';
import { REGIONS } from '@/types/profiler';


// Region configuration from templates
const regionConfig = (profileTemplates as any).regionConfig as Record<Region, {
  code: Region;
  name: string;
  buildingCodeAbbrev: string;
  currencySymbol: string;
}>;

interface ProfilerMiddlePanelProps {
  projectId: string;
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  initialData?: {
    subclass?: string[];
    subclassOther?: string[];
    scaleData?: Record<string, number>;
    complexity?: Record<string, string>;
    workScope?: string[];
  };
  onProfileComplete?: () => void;
  onProfileLoad?: (buildingClass: BuildingClass, projectType: ProjectType) => void;
}

export function ProfilerMiddlePanel({
  projectId,
  buildingClass,
  projectType,
  region = 'AU',
  onRegionChange,
  initialData,
  onProfileComplete,
  onProfileLoad,
}: ProfilerMiddlePanelProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging for props
  useEffect(() => {
    console.log('[ProfilerMiddlePanel] Props received - buildingClass:', buildingClass, 'projectType:', projectType, 'initialData:', initialData);
  }, [buildingClass, projectType, initialData]);

  // Form state
  const [selectedSubclasses, setSelectedSubclasses] = useState<string[]>(initialData?.subclass || []);
  const [subclassOther, setSubclassOther] = useState<string[]>(initialData?.subclassOther || []);
  const [scaleData, setScaleData] = useState<Record<string, number>>(initialData?.scaleData || {});
  const [complexity, setComplexity] = useState<Record<string, string>>(initialData?.complexity || {});
  const [workScope, setWorkScope] = useState<string[]>(initialData?.workScope || []);

  // Track previous building class to detect actual changes
  const prevBuildingClassRef = useRef<BuildingClass | null>(buildingClass);

  // Reset when building class ACTUALLY changes to a different value (not just re-renders)
  // Skip reset during load operations to preserve loaded data
  useEffect(() => {
    const prevClass = prevBuildingClassRef.current;
    // Only reset if buildingClass changed to a DIFFERENT value (not null -> value or same value)
    // and not during loading/saving (which sets state then updates props)
    if (prevClass !== null && buildingClass !== null && prevClass !== buildingClass && !initialData && !isLoading && !isSaving) {
      setSelectedSubclasses([]);
      setSubclassOther([]);
      setScaleData({});
      setComplexity({});
      setWorkScope([]);
    }
    prevBuildingClassRef.current = buildingClass;
  }, [buildingClass, initialData, isLoading, isSaving]);

  // Sync with initial data
  useEffect(() => {
    console.log('[ProfilerMiddlePanel] initialData changed:', initialData);
    if (initialData) {
      console.log('[ProfilerMiddlePanel] Syncing state from initialData');
      setSelectedSubclasses(initialData.subclass || []);
      setSubclassOther(initialData.subclassOther || []);
      setScaleData(initialData.scaleData || {});
      setComplexity(initialData.complexity || {});
      setWorkScope(initialData.workScope || []);
    }
  }, [initialData]);

  // Get configuration for current class
  const getClassConfig = useCallback((): BuildingClassConfig | null => {
    if (!buildingClass) return null;
    return (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[buildingClass];
  }, [buildingClass]);

  // Get scale fields for current subclass
  const getScaleFields = useCallback((): ScaleField[] => {
    const config = getClassConfig();
    if (!config) return [];
    const primarySubclass = selectedSubclasses[0];
    if (primarySubclass && config.scaleFields[primarySubclass]) {
      return config.scaleFields[primarySubclass];
    }
    return config.scaleFields.default;
  }, [getClassConfig, selectedSubclasses]);

  // Get complexity options for current subclass
  const getComplexityOptions = useCallback((): Record<string, ComplexityOption[]> => {
    const config = getClassConfig();
    if (!config) return {};
    const primarySubclass = selectedSubclasses[0];
    let options = config.complexityOptions.default;
    if (primarySubclass && config.complexityOptions[primarySubclass]) {
      options = config.complexityOptions[primarySubclass];
    }
    if (Array.isArray(options)) {
      return { default: options };
    }
    return options as Record<string, ComplexityOption[]>;
  }, [getClassConfig, selectedSubclasses]);

  // Handle subclass selection
  const handleSubclassToggle = (subclass: string) => {
    const maxSubclasses = buildingClass === 'mixed' ? 4 : 1;

    setSelectedSubclasses((prev) => {
      if (prev.includes(subclass)) {
        return prev.filter((s) => s !== subclass);
      }
      if (prev.length >= maxSubclasses) {
        return [...prev.slice(1), subclass];
      }
      return [...prev, subclass];
    });

    // Clear scale and complexity when subclass changes
    setScaleData({});
    setComplexity({});
  };

  // Handle scale value change
  const handleScaleChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setScaleData((prev) => ({ ...prev, [key]: numValue }));
    } else if (value === '') {
      setScaleData((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Handle complexity selection (toggle on/off)
  const handleComplexitySelect = (dimension: string, value: string) => {
    setComplexity((prev) => {
      // If clicking the same value, deselect it
      if (prev[dimension] === value) {
        const next = { ...prev };
        delete next[dimension];
        return next;
      }
      // Otherwise select the new value
      return { ...prev, [dimension]: value };
    });
  };

  // Save profile
  const handleSave = async () => {
    // Only require building class and project type - allow partial saves
    if (!buildingClass || !projectType) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please select building class and project type',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        buildingClass,
        projectType,
        subclass: selectedSubclasses,
        subclassOther: subclassOther.length > 0 ? subclassOther : null,
        scaleData,
        complexity,
        workScope: workScope.length > 0 ? workScope : null,
      };

      const response = await fetch(`/api/projects/${projectId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save profile');
      }

      toast({
        title: 'Profile Saved',
        description: 'Project profile has been updated',
      });

      onProfileComplete?.();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Load profile
  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/profile`);
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }
      const result = await response.json();
      const data = result.data;

      if (!data) {
        throw new Error('No saved profile found');
      }

      // Always set all state values (not conditionally) to ensure UI reflects loaded data
      // Use nullish coalescing to provide defaults for missing data
      const loadedSubclasses = data.subclass ?? [];
      const loadedSubclassOther = data.subclassOther ?? [];
      const loadedScaleData = data.scaleData ?? {};
      const loadedComplexity = data.complexity ?? {};
      const loadedWorkScope = data.workScope ?? [];

      // Batch state updates - set all at once to ensure consistent render
      setSelectedSubclasses(loadedSubclasses);
      setSubclassOther(loadedSubclassOther);
      setScaleData(loadedScaleData);
      setComplexity(loadedComplexity);
      setWorkScope(loadedWorkScope);

      // Notify parent of loaded buildingClass and projectType so left panel can sync
      if (data.buildingClass && data.projectType) {
        onProfileLoad?.(data.buildingClass as BuildingClass, data.projectType as ProjectType);
      }

      toast({
        title: 'Profile Loaded',
        description: 'Previously saved profile has been restored',
      });
    } catch (error) {
      toast({
        title: 'Load Failed',
        description: error instanceof Error ? error.message : 'No saved profile found',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const classConfig = getClassConfig();
  const scaleFields = getScaleFields();
  const complexityOptions = getComplexityOptions();

  // Check if profile has minimum required fields (class and type selected)
  // User should always be able to save regardless of completeness
  const canSave = buildingClass && projectType;


  // Show waiting state only if no building class selected
  // Panel can display with just class selected (type not required to view subclass/complexity/scale)
  if (!buildingClass) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-accent-copper-tint)] flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-[var(--color-accent-copper)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
            Select a Building Class
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Choose a building class from the left panel to configure your project profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with Save Button */}
      <div className="flex items-center justify-end px-6 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-copper)] hover:text-[var(--color-accent-copper)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Load Profile'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !canSave}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                canSave && !isSaving
                  ? 'btn-copper'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
              }
            `}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-6 min-h-0">
          {/* Column 1: Subclass */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
              Subclass
              {buildingClass === 'mixed' && (
                <span className="ml-2 text-xs text-[var(--color-text-muted)] font-normal">
                  (select up to 4)
                </span>
              )}
            </h3>
            <div className="space-y-1.5">
              {classConfig?.subclasses.map((sub: SubclassOption) => (
                <button
                  key={sub.value}
                  onClick={() => handleSubclassToggle(sub.value)}
                  className={`
                    w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left
                    ${
                      selectedSubclasses.includes(sub.value)
                        ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
                    }
                  `}
                >
                  <span>{sub.label}</span>
                  {selectedSubclasses.includes(sub.value) && <Check className="w-3 h-3 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Complexity */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Complexity</h3>
            <div className="space-y-3">
              {Object.entries(complexityOptions).map(([dimension, options]) => (
                <div
                  key={dimension}
                  className="bg-[var(--color-card-firm)] border border-[var(--color-card-firm-border)] px-3 py-2 shadow-sm transition-colors duration-150"
                >
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2 capitalize">
                    {dimension.replace(/_/g, ' ')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleComplexitySelect(dimension, option.value)}
                        className={`
                          px-2.5 py-1.5 rounded text-xs font-medium transition-all
                          ${
                            complexity[dimension] === option.value
                              ? 'bg-[var(--color-accent-copper)] text-[var(--color-text-inverse)]'
                              : 'bg-[var(--color-card-firm-field)] text-[var(--color-text-secondary)] hover:bg-[var(--color-card-firm-hover)]'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Scale + Work Scope */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Scale</h3>
            {selectedSubclasses.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Select a subclass to configure scale</p>
            ) : (
              <div className="space-y-3">
                {scaleFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{field.label}</label>
                    <NumberInput
                      value={scaleData[field.key] ?? ''}
                      onChange={(val) => handleScaleChange(field.key, val)}
                      placeholder={field.placeholder}
                      min={field.min}
                      max={field.max}
                      step={field.key.endsWith('_sqm') ? 20 : 1}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Work Scope - shown for refurb/remediation/extend projects */}
            {projectType && buildingClass && (
              <WorkScopeSelector
                projectType={projectType}
                buildingClass={buildingClass}
                selectedScopes={workScope}
                onScopeChange={setWorkScope}
              />
            )}
          </div>
        </div>

        {/* Context Chips (NCC class, estimated cost, program) - shown above Power Features */}
        {selectedSubclasses.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <ContextChips
              buildingClass={buildingClass}
              projectType={projectType}
              subclass={selectedSubclasses}
              scaleData={scaleData}
              complexity={complexity}
            />
          </div>
        )}

        {/* Power Features - shown when complexity is selected */}
        {Object.keys(complexity).length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-6">
            <ComplexityScore
              buildingClass={buildingClass}
              projectType={projectType}
              subclass={selectedSubclasses}
              scaleData={scaleData}
              complexity={complexity}
              workScope={workScope}
            />
            <RiskFlags
              buildingClass={buildingClass}
              projectType={projectType}
              subclass={selectedSubclasses}
              scaleData={scaleData}
              complexity={complexity}
              workScope={workScope}
            />
            <ConsultantPreview
              buildingClass={buildingClass}
              projectType={projectType}
              subclass={selectedSubclasses}
              scaleData={scaleData}
              complexity={complexity}
              workScope={workScope}
            />
            <MarketContext
              buildingClass={buildingClass}
              projectType={projectType}
              subclass={selectedSubclasses}
              scaleData={scaleData}
              complexity={complexity}
            />
          </div>
        )}

        {/* Region Selector - at bottom of panel */}
        <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[var(--color-text-muted)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Region</span>
            </div>
            <div className="flex gap-1">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => onRegionChange?.(r)}
                  className={`
                    px-3 py-1.5 rounded text-xs font-medium transition-all
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
      </div>
    </div>
  );
}
