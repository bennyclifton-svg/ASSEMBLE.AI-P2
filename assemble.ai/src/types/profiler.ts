/**
 * Profiler Module Types
 * Feature 019 - Project Profiler
 * Feature 022 - Profiler Expansion (Multi-Region Support)
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const BUILDING_CLASSES = [
  'residential',
  'commercial',
  'industrial',
  'institution',
  'mixed',
  'infrastructure',
  'agricultural',
  'defense_secure'
] as const;

export const PROJECT_TYPES = [
  'refurb',
  'extend',
  'new',
  'remediation',
  'advisory'
] as const;

// Multi-Region Support (Feature 022 - Phase 11)
export const REGIONS = ['AU', 'NZ', 'UK', 'US'] as const;

export type BuildingClass = typeof BUILDING_CLASSES[number];
export type ProjectType = typeof PROJECT_TYPES[number];
export type Region = typeof REGIONS[number];
export type ObjectiveSource = 'manual' | 'ai_generated' | 'ai_polished';

// ============================================================================
// REGION TYPES (Feature 022 - Phase 11)
// ============================================================================

export interface RegionConfig {
  code: Region;
  name: string;
  currency: string;
  currencySymbol: string;
  buildingCodeName: string;
  buildingCodeAbbrev: string;
  measurementSystem: 'metric' | 'imperial';
  dateFormat: string;
  defaultTimezone: string;
}

export interface BuildingCodeMapping {
  region: Region;
  classCode: string;
  className: string;
  description: string;
  equivalents?: Partial<Record<Region, string>>;
}

export interface ApprovalPathway {
  region: Region;
  name: string;
  description: string;
  typicalDuration: string;
  stages: string[];
}

export interface CostBenchmark {
  region: Region;
  buildingClass: BuildingClass;
  subclass: string;
  qualityTier: string;
  lowPerSqm: number;
  midPerSqm: number;
  highPerSqm: number;
  currency: string;
  lastUpdated: string;
  source: string;
}

// ============================================================================
// PROFILE TYPES
// ============================================================================

export interface ProfileInput {
  buildingClass: BuildingClass;
  projectType: ProjectType;
  subclass: string[];
  subclassOther?: string[] | null;
  scaleData: Record<string, number>;
  complexity: Record<string, string>;
  workScope?: string[];
  region?: Region;
}

// ============================================================================
// WORK SCOPE TYPES
// ============================================================================

export type RiskSeverity = 'info' | 'warning' | 'critical';

export interface WorkScopeItem {
  value: string;
  label: string;
  consultants?: string[];
  contractors?: string[];
  riskFlag?: string;
  complexityPoints?: number;
}

export interface WorkScopeCategory {
  label: string;
  items: WorkScopeItem[];
}

export interface WorkScopeConfig {
  [categoryKey: string]: WorkScopeCategory;
}

export interface WorkScopeClassOverride {
  value: string;
  label: string;
  category: string;
  consultants: string[];
}

export interface WorkScopeRiskDefinition {
  severity: RiskSeverity;
  title: string;
  description: string;
}

export interface WorkScopeOptions {
  description: string;
  applicableProjectTypes: ProjectType[];
  remediation: WorkScopeConfig;
  refurb: WorkScopeConfig;
  extend: WorkScopeConfig;
  new: WorkScopeConfig;
  advisory: WorkScopeConfig;
  classOverrides: Record<BuildingClass, { additionalItems: WorkScopeClassOverride[] }>;
  riskDefinitions: Record<string, WorkScopeRiskDefinition>;
}

export interface ProjectProfile extends ProfileInput {
  id: string;
  projectId: string;
  complexityScore?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OBJECTIVES TYPES
// ============================================================================

export interface ObjectiveContent {
  content: string;
  source: ObjectiveSource;
  originalAi: string | null;
  editHistory: string[] | null;
}

export interface ProfileContext {
  buildingClass: string;
  projectType: string;
  subclass: string[];
  scale: Record<string, number>;
  complexity: Record<string, string>;
}

export interface ProfilerObjectives {
  id: string;
  projectId: string;
  functionalQuality: ObjectiveContent;
  planningCompliance: ObjectiveContent;
  profileContext: ProfileContext | null;
  generatedAt: Date | null;
  polishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ObjectivesInput {
  functionalQuality?: ObjectiveContent;
  planningCompliance?: ObjectiveContent;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ProfileResponse {
  success: boolean;
  data: ProjectProfile;
}

export interface ObjectivesResponse {
  success: boolean;
  data: ProfilerObjectives;
}

export interface GenerateResponse {
  success: boolean;
  data: {
    functionalQuality: string;
    planningCompliance: string;
    generatedAt: string;
  };
}

export interface PolishResponse {
  success: boolean;
  data: {
    functionalQualityPolished: string;
    planningCompliancePolished: string;
    polishedAt: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface SubclassOption {
  value: string;
  label: string;
}

export interface ScaleField {
  key: string;
  label: string;
  type: 'integer' | 'decimal';
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface ComplexityOption {
  value: string;
  label: string;
}

export interface ComplexityDimension {
  key: string;
  label: string;
  options: ComplexityOption[];
}

export interface BuildingClassConfig {
  label: string;
  icon: string;
  subclasses: SubclassOption[];
  scaleFields: {
    default: ScaleField[];
    [subclass: string]: ScaleField[];
  };
  complexityOptions: {
    default: ComplexityOption[] | Record<string, ComplexityOption[]>;
    [subclass: string]: ComplexityOption[] | Record<string, ComplexityOption[]>;
  };
}

export interface ProjectTypeOption {
  value: ProjectType;
  label: string;
}

export interface ProfileTemplates {
  metadata: {
    version: string;
    structure: string;
  };
  buildingClasses: Record<BuildingClass, BuildingClassConfig>;
  projectTypes: ProjectTypeOption[];
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export type ProfilerSection = 'details' | 'profile' | 'objectives' | 'stakeholders';

export interface ProfilerState {
  activeSection: ProfilerSection;
  profile: Partial<ProfileInput>;
  objectives: Partial<ObjectivesInput>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface SectionStatus {
  section: ProfilerSection;
  isComplete: boolean;
  isDisabled: boolean;
}
