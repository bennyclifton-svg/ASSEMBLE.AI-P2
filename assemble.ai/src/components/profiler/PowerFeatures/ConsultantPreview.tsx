'use client';

import { useMemo } from 'react';
import { Users, Check, Plus } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type { BuildingClass, ProjectType, WorkScopeItem, WorkScopeCategory } from '@/types/profiler';

interface ConsultantPreviewProps {
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  subclass: string[];
  scaleData: Record<string, number>;
  complexity: Record<string, string | string[]>;
  workScope?: string[];
}

interface DisciplineSuggestion {
  name: string;
  required: boolean;
  reason: string;
}

// Base disciplines required for most projects
const BASE_DISCIPLINES = [
  'Architect',
  'Structural',
  'Civil',
  'Mechanical',
  'Electrical',
  'Hydraulic',
];

// Discipline requirements by building class
const CLASS_DISCIPLINES: Record<string, string[]> = {
  residential: ['Landscape', 'Acoustic'],
  commercial: ['Facade', 'Acoustic', 'ESD'],
  industrial: ['Fire Engineer', 'ESD'],
  institution: ['Acoustic', 'Security'],
  mixed: ['Facade', 'Traffic', 'Acoustic'],
  infrastructure: ['Geotech', 'Environmental', 'Traffic'],
  defense_secure: ['Security', 'SCIF Specialist', 'Fire Engineer'],
  agricultural: ['Agricultural', 'Environmental', 'Civil'],
};

// Subclass-specific disciplines
const SUBCLASS_DISCIPLINES: Record<string, DisciplineSuggestion[]> = {
  aged_care_9c: [
    { name: 'Fire Engineer', required: true, reason: 'Class 9c fire safety compliance' },
    { name: 'Access', required: true, reason: 'Aged care accessibility requirements' },
    { name: 'Kitchen Consultant', required: false, reason: 'Commercial kitchen design' },
  ],
  healthcare_hospital: [
    { name: 'Medical Planner', required: true, reason: 'Healthcare facility planning' },
    { name: 'Fire Engineer', required: true, reason: 'Class 9a fire safety compliance' },
    { name: 'Acoustic', required: true, reason: 'Healthcare acoustic requirements' },
    { name: 'Infection Control Consultant', required: false, reason: 'Enhanced infection control' },
  ],
  data_centre: [
    { name: 'Data Centre Specialist', required: true, reason: 'IT infrastructure coordination' },
    { name: 'Fire Engineer', required: true, reason: 'Critical infrastructure fire protection' },
    { name: 'Security', required: true, reason: 'Physical security requirements' },
  ],
  hotel: [
    { name: 'Interior', required: true, reason: 'Guest room and F&B design' },
    { name: 'Kitchen Consultant', required: true, reason: 'Commercial kitchen design' },
    { name: 'Acoustic', required: true, reason: 'Noise transmission control' },
    { name: 'Lighting', required: false, reason: 'Feature lighting design' },
  ],
  retail_shopping: [
    { name: 'Traffic', required: true, reason: 'Car park and access design' },
    { name: 'Retail Planner', required: false, reason: 'Tenancy mix optimization' },
  ],
  education_school: [
    { name: 'Acoustic', required: true, reason: 'Learning space acoustics' },
    { name: 'Security', required: true, reason: 'School security requirements' },
    { name: 'Landscape', required: true, reason: 'Play areas and outdoor learning' },
  ],
  education_tertiary: [
    { name: 'Laboratory Planner', required: false, reason: 'Specialized lab design' },
    { name: 'AV Consultant', required: true, reason: 'Lecture theatre and hybrid learning' },
  ],
  life_sciences: [
    { name: 'Lab Planner', required: true, reason: 'Life sciences facility planning' },
    { name: 'PC Consultant', required: true, reason: 'Physical containment compliance' },
    { name: 'Fire Engineer', required: true, reason: 'Laboratory fire safety' },
    { name: 'HVAC Specialist', required: true, reason: 'Specialized ventilation systems' },
  ],
  cleanroom: [
    { name: 'Cleanroom Specialist', required: true, reason: 'ISO cleanroom design compliance' },
    { name: 'HVAC', required: true, reason: 'Clean air handling systems' },
    { name: 'Fire Engineer', required: true, reason: 'Cleanroom fire protection' },
    { name: 'ESD', required: true, reason: 'Electrostatic discharge control' },
  ],
  data_centre_hyperscale: [
    { name: 'Critical Systems Engineer', required: true, reason: 'Mission-critical infrastructure' },
    { name: 'Electrical', required: true, reason: 'High-capacity power distribution' },
    { name: 'Fire Engineer', required: true, reason: 'Data centre fire suppression' },
  ],
  marina: [
    { name: 'Coastal Engineer', required: true, reason: 'Coastal and marine structures' },
    { name: 'Marine Surveyor', required: true, reason: 'Bathymetric and marine surveys' },
    { name: 'Environmental', required: true, reason: 'Marine environmental assessments' },
  ],
  airport_terminal: [
    { name: 'Aviation Planner', required: true, reason: 'Airport planning and operations' },
    { name: 'Security', required: true, reason: 'Aviation security requirements' },
    { name: 'Wayfinding', required: true, reason: 'Passenger wayfinding systems' },
  ],
  winery_brewery: [
    { name: 'Process', required: true, reason: 'Winemaking/brewing process design' },
    { name: 'Food Safety Consultant', required: true, reason: 'Food production compliance' },
  ],
};

// Complexity-triggered disciplines
const COMPLEXITY_DISCIPLINES: Record<string, DisciplineSuggestion> = {
  heritage: { name: 'Heritage', required: true, reason: 'Heritage overlay requirements' },
  listed: { name: 'Heritage Architect', required: true, reason: 'Heritage listed building conservation' },
  bushfire: { name: 'Bushfire', required: true, reason: 'BAL assessment and compliance' },
  flood: { name: 'Flood', required: true, reason: 'Flood planning and management' },
  state_significant: { name: 'Planning', required: true, reason: 'SSD approval pathway' },
  complex_da: { name: 'Town Planning', required: true, reason: 'Complex DA submission' },
  triple_cert: { name: 'ESD', required: true, reason: 'Triple certification requirements' },
  net_zero: { name: 'Net Zero Consultant', required: true, reason: 'Net zero carbon pathway' },
  tier_3: { name: 'Commissioning Agent', required: true, reason: 'Tier III commissioning' },
  tier_4: { name: 'Commissioning Agent', required: true, reason: 'Tier IV commissioning requirements' },
};

// Scale-triggered disciplines
const SCALE_THRESHOLDS: Record<string, { threshold: number; discipline: DisciplineSuggestion }> = {
  storeys: {
    threshold: 15,
    discipline: { name: 'Wind', required: false, reason: 'High-rise wind assessment' },
  },
  total_storeys: {
    threshold: 15,
    discipline: { name: 'Wind', required: false, reason: 'High-rise wind assessment' },
  },
  car_parks: {
    threshold: 100,
    discipline: { name: 'Traffic', required: true, reason: 'Traffic impact assessment' },
  },
  gfa_sqm: {
    threshold: 10000,
    discipline: { name: 'Cost Planning', required: true, reason: 'Cost planning for large project' },
  },
};

// Helper to find work scope item by value
function findWorkScopeItem(scopeValue: string, projectType: ProjectType | null): WorkScopeItem | null {
  if (!projectType) return null;
  const workScopeOptions = (profileTemplates as any).workScopeOptions;
  const typeConfig = workScopeOptions?.[projectType];
  if (!typeConfig) return null;

  for (const category of Object.values(typeConfig) as WorkScopeCategory[]) {
    const item = category.items.find((i: WorkScopeItem) => i.value === scopeValue);
    if (item) return item;
  }
  return null;
}

export function ConsultantPreview({
  buildingClass,
  projectType,
  subclass,
  scaleData,
  complexity,
  workScope = [],
}: ConsultantPreviewProps) {
  const suggestions = useMemo<DisciplineSuggestion[]>(() => {
    if (!buildingClass || subclass.length === 0) return [];

    const disciplineMap = new Map<string, DisciplineSuggestion>();

    // Add base disciplines
    BASE_DISCIPLINES.forEach((name) => {
      disciplineMap.set(name, { name, required: true, reason: 'Core project discipline' });
    });

    // Add class-specific disciplines
    const classDisciplines = CLASS_DISCIPLINES[buildingClass] || [];
    classDisciplines.forEach((name) => {
      if (!disciplineMap.has(name)) {
        disciplineMap.set(name, { name, required: false, reason: `${buildingClass} project typical` });
      }
    });

    // Add subclass-specific disciplines
    subclass.forEach((sub) => {
      const subDisciplines = SUBCLASS_DISCIPLINES[sub] || [];
      subDisciplines.forEach((discipline) => {
        if (!disciplineMap.has(discipline.name) || discipline.required) {
          disciplineMap.set(discipline.name, discipline);
        }
      });
    });

    // Add complexity-triggered disciplines
    Object.entries(complexity).forEach(([_, value]) => {
      // Handle array values (site_conditions supports multi-select)
      const values = Array.isArray(value) ? value : [value];
      values.forEach((v) => {
        const complexityDiscipline = COMPLEXITY_DISCIPLINES[v];
        if (complexityDiscipline && !disciplineMap.has(complexityDiscipline.name)) {
          disciplineMap.set(complexityDiscipline.name, complexityDiscipline);
        }
      });
    });

    // Add scale-triggered disciplines
    Object.entries(scaleData).forEach(([key, value]) => {
      const threshold = SCALE_THRESHOLDS[key];
      if (threshold && value >= threshold.threshold) {
        if (!disciplineMap.has(threshold.discipline.name)) {
          disciplineMap.set(threshold.discipline.name, threshold.discipline);
        }
      }
    });

    // Add work scope-triggered disciplines
    workScope.forEach((scopeValue) => {
      const scopeItem = findWorkScopeItem(scopeValue, projectType);
      if (scopeItem?.consultants) {
        scopeItem.consultants.forEach((consultant) => {
          if (!disciplineMap.has(consultant)) {
            disciplineMap.set(consultant, {
              name: consultant,
              required: true,
              reason: `Required for ${scopeItem.label}`,
            });
          }
        });
      }
    });

    // Sort: required first, then alphabetically
    return Array.from(disciplineMap.values()).sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [buildingClass, projectType, subclass, scaleData, complexity, workScope]);

  if (suggestions.length === 0) return null;

  const requiredCount = suggestions.filter((s) => s.required).length;
  const suggestedCount = suggestions.filter((s) => !s.required).length;

  return (
    <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Users className="w-3.5 h-3.5 text-[var(--color-accent-purple)]" />
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          Disciplines
        </span>
      </div>
      <div className="text-[10px] text-[var(--color-text-muted)] mb-2">
        {requiredCount} required{suggestedCount > 0 && ` + ${suggestedCount} suggested`}
      </div>

      <div className="space-y-0.5">
        {suggestions.map((discipline) => (
          <div
            key={discipline.name}
            className="flex items-center gap-1.5 py-0.5 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title={discipline.reason}
          >
            {discipline.required ? (
              <Check className="w-3 h-3 shrink-0 text-[var(--color-accent-teal)]" />
            ) : (
              <Plus className="w-3 h-3 shrink-0 text-[var(--color-text-muted)]" />
            )}
            <span className={`text-[11px] truncate ${discipline.required ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
              {discipline.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
