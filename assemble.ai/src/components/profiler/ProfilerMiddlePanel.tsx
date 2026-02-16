'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Check, Globe, ChevronDown, ChevronUp, Building2, Home, Factory, Landmark, Layers, Route, Tractor, Shield } from 'lucide-react';
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

// Building class icons
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

interface ProfilerMiddlePanelProps {
  projectId: string;
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  onClassChange?: (cls: BuildingClass) => void;
  onTypeChange?: (type: ProjectType) => void;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  initialData?: {
    subclass?: string[];
    subclassOther?: string[];
    scaleData?: Record<string, number>;
    complexity?: Record<string, string | string[]>;
    workScope?: string[];
  };
  onProfileComplete?: () => void;
  onProfileLoad?: (buildingClass: BuildingClass, projectType: ProjectType) => void;
}

export function ProfilerMiddlePanel({
  projectId,
  buildingClass,
  projectType,
  onClassChange,
  onTypeChange,
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
  const [complexity, setComplexity] = useState<Record<string, string | string[]>>(initialData?.complexity || {});
  const [workScope, setWorkScope] = useState<string[]>(initialData?.workScope || []);
  const [showOtherSubclasses, setShowOtherSubclasses] = useState<boolean>(false);
  const [showOtherClasses, setShowOtherClasses] = useState<boolean>(false);

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

  // Auto-expand "Others" if a secondary subclass (index >= 6) is selected
  useEffect(() => {
    if (buildingClass && selectedSubclasses.length > 0) {
      const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[buildingClass];
      if (config && config.subclasses.length > 6) {
        const secondaryValues = config.subclasses.slice(6).map(s => s.value);
        const hasSecondarySelected = selectedSubclasses.some(s => secondaryValues.includes(s));
        if (hasSecondarySelected) {
          setShowOtherSubclasses(true);
        }
      }
    }
  }, [buildingClass, selectedSubclasses]);

  // Auto-expand "Others" for building classes if a secondary class is selected
  useEffect(() => {
    if (buildingClass && SECONDARY_CLASSES.includes(buildingClass)) {
      setShowOtherClasses(true);
    }
  }, [buildingClass]);

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
  // site_conditions supports multi-select, other dimensions are single-select
  const handleComplexitySelect = (dimension: string, value: string) => {
    setComplexity((prev) => {
      // Multi-select for site_conditions
      if (dimension === 'site_conditions') {
        const currentValue = prev[dimension];
        const current: string[] = Array.isArray(currentValue)
          ? currentValue
          : currentValue ? [currentValue] : [];

        if (current.includes(value)) {
          // Deselect: remove from array
          const filtered = current.filter(v => v !== value);
          if (filtered.length === 0) {
            const next = { ...prev };
            delete next[dimension];
            return next;
          }
          return { ...prev, [dimension]: filtered };
        }
        // Select: add to array
        return { ...prev, [dimension]: [...current, value] };
      }

      // Single-select for other dimensions
      if (prev[dimension] === value) {
        const next = { ...prev };
        delete next[dimension];
        return next;
      }
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
        variant: 'success',
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
        variant: 'success',
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


  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with Save Button */}
      <div className="flex items-center justify-end px-6 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="rounded px-3 py-1.5 text-xs font-medium bg-[#1776c1] text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Load Profile'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !canSave}
            className={`rounded px-2.5 py-1.5 text-xs font-medium ${canSave && !isSaving
                ? 'text-[var(--primary-foreground)] bg-[var(--color-accent-green)] hover:bg-[var(--primitive-green-dark)]'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
              }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* 3-Column Layout: Row 1 (Class/Scale | Complexity | Scores) + Row 2 (Type | Scope | Disciplines) */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          {/* Column 1: Class + Subclass + Scale (narrow) */}
          <div className="w-[160px] flex-shrink-0 space-y-6">
            {/* Class section */}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Class</h3>
              <div className="space-y-1.5">
                {/* Primary classes */}
                {PRIMARY_CLASSES.map((key) => {
                  const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[key];
                  return (
                    <button
                      key={key}
                      onClick={() => onClassChange?.(key)}
                      className={`
                        w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left
                        ${buildingClass === key
                          ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
                        }
                      `}
                    >
                      <span className="flex items-center gap-1.5">
                        {BUILDING_CLASS_ICONS[key]}
                        <span className="truncate">{config.label}</span>
                      </span>
                      {buildingClass === key && <Check className="w-3 h-3 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}

                {/* Others toggle */}
                <button
                  onClick={() => setShowOtherClasses(!showOtherClasses)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left border-[var(--color-border)] hover:border-[var(--color-text-muted)]/50 text-[var(--color-text-muted)]"
                >
                  <span>Others</span>
                  {showOtherClasses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Secondary classes */}
                {showOtherClasses && SECONDARY_CLASSES.map((key) => {
                  const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[key];
                  return (
                    <button
                      key={key}
                      onClick={() => onClassChange?.(key)}
                      className={`
                        w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left
                        ${buildingClass === key
                          ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
                        }
                      `}
                    >
                      <span className="flex items-center gap-1.5">
                        {BUILDING_CLASS_ICONS[key]}
                        <span className="truncate">{config.label}</span>
                      </span>
                      {buildingClass === key && <Check className="w-3 h-3 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subclass section (only shown when buildingClass is selected) */}
            {buildingClass && (
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                  Subclass
                  {buildingClass === 'mixed' && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)] font-normal">
                      (select up to 4)
                    </span>
                  )}
                </h3>
                <div className="space-y-1.5">
                  {/* Primary subclasses - first 6 always visible */}
                  {classConfig?.subclasses.slice(0, 6).map((sub: SubclassOption) => (
                    <button
                      key={sub.value}
                      onClick={() => handleSubclassToggle(sub.value)}
                      className={`
                      w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left
                      ${selectedSubclasses.includes(sub.value)
                          ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
                        }
                    `}
                    >
                      <span className="truncate">{sub.label}</span>
                      {selectedSubclasses.includes(sub.value) && <Check className="w-3 h-3 flex-shrink-0 ml-1" />}
                    </button>
                  ))}

                  {/* Others toggle - only show if there are more than 6 subclasses */}
                  {classConfig && classConfig.subclasses.length > 6 && (
                    <>
                      <button
                        onClick={() => setShowOtherSubclasses(!showOtherSubclasses)}
                        className="w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left border-[var(--color-border)] hover:border-[var(--color-text-muted)]/50 text-[var(--color-text-muted)]"
                      >
                        <span>Others</span>
                        {showOtherSubclasses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Secondary subclasses - shown when expanded */}
                      {showOtherSubclasses && classConfig.subclasses.slice(6).map((sub: SubclassOption) => (
                        <button
                          key={sub.value}
                          onClick={() => handleSubclassToggle(sub.value)}
                          className={`
                          w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left
                          ${selectedSubclasses.includes(sub.value)
                              ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                              : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
                            }
                        `}
                        >
                          <span className="truncate">{sub.label}</span>
                          {selectedSubclasses.includes(sub.value) && <Check className="w-3 h-3 flex-shrink-0 ml-1" />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Scale section */}
            <div>
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
            </div>

          </div>

          {/* Column 2: Complexity (wide) */}
          <div className="flex-1 min-w-0 @container space-y-6">
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Complexity</h3>
              {/* Responsive grid: 1 col when narrow, up to 4 cols on wider containers */}
              <div className="grid grid-cols-1 @[300px]:grid-cols-2 @[500px]:grid-cols-3 @[700px]:grid-cols-4 gap-4">
                {Object.entries(complexityOptions).map(([dimension, options]) => (
                  <div
                    key={dimension}
                    className={`border border-[var(--color-card-firm-border)] p-3 shadow-md transition-colors duration-150 aspect-square flex flex-col ${dimension === 'procurement_route' ? '' : 'bg-[var(--color-card-firm)]'
                      }`}
                    style={dimension === 'procurement_route' ? { backgroundColor: 'var(--color-card-procurement)' } : undefined}
                  >
                    <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-3 capitalize">
                      {dimension.replace(/_/g, ' ')}
                    </label>
                    <div className="flex flex-col gap-0.5">
                      {options.map((option) => {
                        // Check if option is selected (supports both single value and array for site_conditions)
                        const dimValue = complexity[dimension];
                        const isSelected = dimension === 'site_conditions'
                          ? Array.isArray(dimValue)
                            ? dimValue.includes(option.value)
                            : dimValue === option.value
                          : dimValue === option.value;

                        const isProcurementRoute = dimension === 'procurement_route';
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleComplexitySelect(dimension, option.value)}
                            className={`
                              px-2 py-1 rounded text-xs font-medium transition-all text-left
                              ${isProcurementRoute
                                ? ''
                                : isSelected
                                  ? 'bg-[var(--color-card-firm-selected)]'
                                  : 'bg-[var(--color-card-firm)] hover:bg-[var(--color-card-firm-hover)]'
                              }
                            `}
                            style={{
                              fontFamily: "'Ink Free', 'Lucida Handwriting', 'Segoe Print', cursive",
                              color: 'var(--color-card-firm-text)',
                              ...(isProcurementRoute && {
                                backgroundColor: isSelected ? 'var(--color-card-procurement-selected)' : 'var(--color-card-procurement)',
                              }),
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Context Chips + Complexity Score + Risk Flags */}
          <div className="w-[175px] flex-shrink-0 space-y-4">
            {/* Context Chips (NCC class, estimated cost, programme) */}
            {selectedSubclasses.length > 0 && (
              <ContextChips
                buildingClass={buildingClass}
                projectType={projectType}
                subclass={selectedSubclasses}
                scaleData={scaleData}
                complexity={complexity}
              />
            )}

            {/* Complexity Score + Market Context + Risk Flags */}
            {Object.keys(complexity).length > 0 && (
              <>
                <ComplexityScore
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
                <RiskFlags
                  buildingClass={buildingClass}
                  projectType={projectType}
                  subclass={selectedSubclasses}
                  scaleData={scaleData}
                  complexity={complexity}
                  workScope={workScope}
                />
              </>
            )}
          </div>
        </div>

        {/* Row 2: Type | Scope of Work | Consultant Disciplines (aligned) */}
        <div className="flex gap-6 mt-6 pt-4 border-t border-[var(--color-border)]">
          {/* Type */}
          <div className="w-[160px] flex-shrink-0">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Type</h3>
            <div className="space-y-1.5">
              {profileTemplates.projectTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => onTypeChange?.(type.value as ProjectType)}
                  className={`
                    w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left
                    ${projectType === type.value
                      ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent-copper)]/50 text-[var(--color-text-secondary)]'
                    }
                  `}
                >
                  <span className="truncate">{type.label}</span>
                  {projectType === type.value && <Check className="w-3 h-3 flex-shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Scope of Work */}
          <div className="flex-1 min-w-0 @container">
            {projectType && buildingClass && (
              <WorkScopeSelector
                projectType={projectType}
                buildingClass={buildingClass}
                selectedScopes={workScope}
                onScopeChange={setWorkScope}
              />
            )}
          </div>

          {/* Consultant Disciplines */}
          <div className="w-[175px] flex-shrink-0">
            {Object.keys(complexity).length > 0 && (
              <ConsultantPreview
                buildingClass={buildingClass}
                projectType={projectType}
                subclass={selectedSubclasses}
                scaleData={scaleData}
                complexity={complexity}
                workScope={workScope}
              />
            )}
          </div>
        </div>

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
                    ${region === r
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
