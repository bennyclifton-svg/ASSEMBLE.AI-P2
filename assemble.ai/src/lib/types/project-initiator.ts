/**
 * TypeScript Type Definitions for Project Initiator (Feature 018)
 * These types match the structure of the template JSON files
 */

// ============================================================================
// PROJECT TYPES
// ============================================================================

export type ProjectTypeId =
  | 'due-diligence'
  | 'feasibility'
  | 'house'
  | 'apartments'
  | 'apartments-btr'
  | 'student-housing'
  | 'townhouses'
  | 'retirement-living'
  | 'office'
  | 'retail'
  | 'industrial'
  | 'fitout'
  | 'refurbishment'
  | 'remediation';

export type ProjectCategory =
  | 'Pre-Development'
  | 'Residential'
  | 'Commercial'
  | 'Industrial'
  | 'Refurbishment';

export interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
  metadata?: {
    units?: string;
    gfa?: number;
    costPerSqm?: number;
    [key: string]: any;
  };
}

export interface QuickSetupQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple';
  options: QuestionOption[];
  helpText?: string;
}

export interface ProjectType {
  id: ProjectTypeId;
  name: string;
  icon: string;
  category: ProjectCategory;
  description: string;
  defaultDuration: {
    weeks: number;
    phases: string[];
  };
  typicalBudgetRange: {
    min: number;
    max: number;
    currency: string;
  };
  exclusions?: string[];
  quickSetupQuestions: QuickSetupQuestion[];
}

export interface ProjectTypesData {
  metadata: {
    version: string;
    lastUpdated: string;
    jurisdiction: string;
    currency: string;
    gstNote: string;
    notes: string[];
    sources: string[];
  };
  locationMultipliers: {
    description: string;
    locations: {
      [key: string]: {
        multiplier: number;
        label: string;
      };
    };
  };
  types: ProjectType[];
}

// ============================================================================
// OBJECTIVES TEMPLATES
// ============================================================================

export interface ObjectiveField {
  template: string;
  variations?: {
    [variationValue: string]: string;
  };
  [key: string]: any; // Allow additional properties like classification_actions, etc.
}

export interface ObjectiveTemplate {
  functional: ObjectiveField;
  quality: ObjectiveField;
  budget: ObjectiveField;
  program: ObjectiveField;
  risk?: ObjectiveField;
  sustainability?: ObjectiveField;
  stakeholder?: ObjectiveField;
}

export interface ObjectivesTemplatesData {
  metadata: {
    version: string;
    lastUpdated: string;
    variableSyntax: string;
    notes: string[];
  };
  // Project types are direct properties (no 'templates' wrapper)
  [projectType: string]: ObjectiveTemplate | ObjectivesTemplatesData['metadata'];
}

// ============================================================================
// MASTER STAGES
// ============================================================================

export type MasterStageId =
  | 'initiation'
  | 'schematic_design'
  | 'design_development'
  | 'procurement'
  | 'delivery';

export interface MasterStage {
  id: MasterStageId;
  name: string;
  order: number;
}

// ============================================================================
// CONSULTANT TEMPLATES
// ============================================================================

export interface ConsultantPhase {
  masterStage?: MasterStageId;  // NEW: Maps phase to one of 5 master stages
  services: string[];
  deliverables: Array<{
    item: string;
    format: string;
    mandatory: boolean;
  }>;
  exclusions?: string[];
}

export interface ConsultantDiscipline {
  name: string;
  abbrev: string;
  category: string;
  applicableProjectTypes: ProjectTypeId[] | ['all'];
  typicalFeeRange?: any;
  coordinationRequired?: string[];
  phases: {
    [phaseName: string]: ConsultantPhase;
  };
}

export interface ConsultantTemplatesData {
  version: string;
  lastUpdated: string;
  description?: string;
  standards?: any;
  standardPhases?: any;
  masterStages?: {
    description: string;
    stages: MasterStage[];
  };
  projectTypes?: any;
  disciplines: {
    [disciplineName: string]: ConsultantDiscipline;
  };
}

// ============================================================================
// COST PLAN TEMPLATES
// ============================================================================

export type CalculationBasis = 'gfa' | 'units' | 'fixed' | 'percentage';
export type CostSection = 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY';

export interface BenchmarkRate {
  project_type: ProjectTypeId;
  calculation_basis: CalculationBasis;
  rate_per_unit_cents?: number;
  fixed_amount_cents?: number;
  percentage_of?: string;
  section: CostSection;
  activity: string;
  notes?: string;
}

export interface QualityMultiplier {
  level: string;
  multiplier: number;
  label: string;
  description: string;
}

export interface CostPlanTemplatesData {
  metadata: {
    version: string;
    lastUpdated: string;
    jurisdiction: string;
    currency: string;
    gstNote: string;
    notes: string[];
    sources: string[];
  };
  qualityMultipliers: QualityMultiplier[];
  benchmarkRates: BenchmarkRate[];
}

// ============================================================================
// PROGRAM TEMPLATES
// ============================================================================

export interface ProgramActivity {
  name: string;
  baseDurationWeeks: number;
  masterStage?: MasterStageId;  // NEW: Maps activity to one of 5 master stages
  children?: ProgramActivity[];
  color?: string;
}

export interface DurationFactor {
  answer_key: string;
  value_multipliers: {
    [value: string]: number;
  };
}

export interface PhaseStructure {
  project_type: ProjectTypeId;
  phases: ProgramActivity[];
  durationFactors: DurationFactor[];
  notes?: string[];
}

export interface ProgramTemplatesData {
  metadata: {
    version: string;
    lastUpdated: string;
    notes: string[];
  };
  masterStages?: {
    description: string;
    stages: MasterStage[];
  };
  phaseStructures: PhaseStructure[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export type QuestionAnswers = Record<string, string | string[]>;

export interface InitializationRequest {
  projectType: ProjectTypeId;
  answers: QuestionAnswers;
  objectives: {
    functional: string;
    quality: string;
    budget: string;
    program: string;
  };
}

export interface InitializationResponse {
  success: boolean;
  errors?: string[];
  data?: {
    objectivesCreated: boolean;
    disciplinesEnabled: number;
    programActivitiesCreated: number;
    costLinesCreated: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface TemplateSubstitutionContext {
  answers: QuestionAnswers;
  projectDetails?: {
    name?: string;
    code?: string;
    address?: string;
    [key: string]: any;
  };
}
