/**
 * Unified Stakeholder System Types
 * Feature: 020-stakeholder
 *
 * This module provides type definitions for the unified stakeholder system
 * that replaces and consolidates the legacy consultant/contractor lists.
 */

// ============================================
// Enums and Constants
// ============================================

export type StakeholderGroup = 'client' | 'authority' | 'consultant' | 'contractor';
export type TenderStatusType = 'brief' | 'tender' | 'rec' | 'award';
export type SubmissionStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'withdrawn';

export const STAKEHOLDER_GROUPS: StakeholderGroup[] = ['client', 'authority', 'consultant', 'contractor'];
export const TENDER_STATUS_TYPES: TenderStatusType[] = ['brief', 'tender', 'rec', 'award'];
export const SUBMISSION_STATUSES: SubmissionStatus[] = ['pending', 'submitted', 'approved', 'rejected', 'withdrawn'];

// Group display names
export const STAKEHOLDER_GROUP_LABELS: Record<StakeholderGroup, string> = {
  client: 'Client',
  authority: 'Authority',
  consultant: 'Consultant',
  contractor: 'Contractor',
};

// Tender status display names
export const TENDER_STATUS_LABELS: Record<TenderStatusType, string> = {
  brief: 'Brief',
  tender: 'Tender',
  rec: 'Rec',
  award: 'Award',
};

// Submission status display names
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

// ============================================
// Subgroup Definitions
// ============================================

export const CLIENT_SUBGROUPS = [
  'Owner',
  'Tenant',
  'Project Manager',
  'Superintendent',
  'Quantity Surveyor',
  'Other',
] as const;

export const AUTHORITY_SUBGROUPS = [
  'Council',
  'FRNSW',
  'TfNSW',
  'EPA',
  'Heritage NSW',
  'NSW Planning',
  'Access',
  'Other',
] as const;

export const CONSULTANT_SUBGROUPS = [
  'Architecture',
  'Structural',
  'Civil',
  'Mechanical',
  'Electrical',
  'Hydraulic',
  'Fire',
  'Facade',
  'Acoustic',
  'Traffic',
  'Landscape',
  'Interior Design',
  'BCA',
  'Access',
  'Surveyor',
  'Other',
] as const;

// Contractor subgroups are dynamically populated based on project requirements
export const DEFAULT_CONTRACTOR_SUBGROUPS = [
  'General Contractor',
  'Demolition',
  'Structural Steel',
  'Concrete',
  'Facade',
  'Mechanical',
  'Electrical',
  'Hydraulic',
  'Fire Services',
  'Joinery',
  'Flooring',
  'Ceilings',
  'Painting',
  'Other',
] as const;

export type ClientSubgroup = typeof CLIENT_SUBGROUPS[number];
export type AuthoritySubgroup = typeof AUTHORITY_SUBGROUPS[number];
export type ConsultantSubgroup = typeof CONSULTANT_SUBGROUPS[number];
export type ContractorSubgroup = typeof DEFAULT_CONTRACTOR_SUBGROUPS[number] | string;

// ============================================
// Core Stakeholder Types
// ============================================

export interface Stakeholder {
  id: string;
  projectId: string;
  companyId?: string;
  stakeholderGroup: StakeholderGroup;

  // Core Fields
  name: string;
  role?: string;
  organization?: string;

  // Contact Info
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Consultant/Contractor specific
  disciplineOrTrade?: string;
  isEnabled: boolean;
  briefServices?: string;
  briefFee?: string;
  briefProgram?: string;
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;

  // Authority specific
  submissionRef?: string;
  submissionType?: string;

  // Metadata
  sortOrder: number;
  notes?: string;
  isAiGenerated?: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================
// Status Types
// ============================================

export interface TenderStatus {
  id: string;
  stakeholderId: string;
  statusType: TenderStatusType;
  isActive: boolean;
  isComplete: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmissionStatusRecord {
  id: string;
  stakeholderId: string;
  status: SubmissionStatus;
  submittedAt?: string;
  submissionRef?: string;
  responseDue?: string;
  responseReceivedAt?: string;
  responseNotes?: string;
  conditions?: string[];
  conditionsCleared: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// Combined View Types
// ============================================

export interface StakeholderWithTenderStatus extends Stakeholder {
  tenderStatuses: TenderStatus[];
}

export interface StakeholderWithSubmissionStatus extends Stakeholder {
  submissionStatus?: SubmissionStatusRecord;
}

// Union type for stakeholders with their appropriate status
export type StakeholderWithStatus =
  | (Stakeholder & { stakeholderGroup: 'client' })
  | (StakeholderWithSubmissionStatus & { stakeholderGroup: 'authority' })
  | (StakeholderWithTenderStatus & { stakeholderGroup: 'consultant' | 'contractor' });

// ============================================
// API Request/Response Types
// ============================================

export interface CreateStakeholderRequest {
  stakeholderGroup: StakeholderGroup;
  name: string;
  role?: string;
  organization?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  disciplineOrTrade?: string;
  isEnabled?: boolean;
  notes?: string;
  isAiGenerated?: boolean;
}

export interface UpdateStakeholderRequest {
  name?: string;
  role?: string;
  organization?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isEnabled?: boolean;
  briefServices?: string;
  briefFee?: string;
  briefProgram?: string;
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;
  submissionRef?: string;
  submissionType?: string;
  notes?: string;
}

export interface UpdateTenderStatusRequest {
  statusType: TenderStatusType;
  isActive?: boolean;
  isComplete?: boolean;
}

export interface UpdateSubmissionStatusRequest {
  status: SubmissionStatus;
  submissionRef?: string;
  responseDue?: string;
  responseNotes?: string;
  conditions?: string[];
  conditionsCleared?: boolean;
}

export interface ReorderStakeholdersRequest {
  stakeholderIds: string[];
}

// ============================================
// Generation Types
// ============================================

export interface GenerateStakeholdersRequest {
  groups?: StakeholderGroup[]; // Which groups to generate (default: all)
  includeAuthorities?: boolean; // Include regulatory authorities
  includeContractors?: boolean; // Include default trades
  mode?: 'merge' | 'replace'; // How to handle existing stakeholders
}

export interface GeneratedStakeholder {
  stakeholderGroup: StakeholderGroup;
  name: string;
  role?: string;
  disciplineOrTrade?: string;
  reason: string; // Why this stakeholder was suggested
}

export interface GenerateStakeholdersResponse {
  generated: GeneratedStakeholder[];
  profileContext: {
    buildingClass: string;
    projectType: string;
    subclass: string[];
    complexityScore: number;
  };
  existingCount: number;
  mode: 'merge' | 'replace';
}

// ============================================
// Group Count Types
// ============================================

export interface StakeholderGroupCounts {
  client: number;
  authority: number;
  consultant: number;
  contractor: number;
  total: number;
}

// ============================================
// List Response Type
// ============================================

export interface StakeholderListResponse {
  stakeholders: StakeholderWithStatus[];
  counts: StakeholderGroupCounts;
}

// ============================================
// Migration Types (US5)
// ============================================

export interface MigrationResult {
  migratedCount: number;
  consultantsConverted: number;
  contractorsConverted: number;
  stakeholdersConverted: number;
  errors: string[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a stakeholder has tender process (Consultant or Contractor)
 */
export function hasTenderProcess(stakeholder: Stakeholder): boolean {
  return stakeholder.stakeholderGroup === 'consultant' || stakeholder.stakeholderGroup === 'contractor';
}

/**
 * Check if a stakeholder is an Authority (has submission status)
 */
export function isAuthority(stakeholder: Stakeholder): boolean {
  return stakeholder.stakeholderGroup === 'authority';
}

/**
 * Get the appropriate subgroups for a stakeholder group
 */
export function getSubgroupsForGroup(group: StakeholderGroup): readonly string[] {
  switch (group) {
    case 'client':
      return CLIENT_SUBGROUPS;
    case 'authority':
      return AUTHORITY_SUBGROUPS;
    case 'consultant':
      return CONSULTANT_SUBGROUPS;
    case 'contractor':
      return DEFAULT_CONTRACTOR_SUBGROUPS;
    default:
      return [];
  }
}

/**
 * Get display label for a stakeholder group
 */
export function getGroupLabel(group: StakeholderGroup): string {
  return STAKEHOLDER_GROUP_LABELS[group] || group;
}

/**
 * Calculate tender progress percentage
 */
export function getTenderProgress(statuses: TenderStatus[]): number {
  if (!statuses || statuses.length === 0) return 0;
  const completedCount = statuses.filter(s => s.isComplete).length;
  return Math.round((completedCount / 4) * 100);
}

/**
 * Get the current active tender stage
 */
export function getCurrentTenderStage(statuses: TenderStatus[]): TenderStatusType | null {
  if (!statuses || statuses.length === 0) return null;
  const active = statuses.find(s => s.isActive && !s.isComplete);
  return active?.statusType || null;
}
