/**
 * Report Context Orchestrator Service
 * Spec 025: Intelligent Report Generation with Full Project Context
 *
 * This service orchestrates section-aware data fetching from the FULL project lifecycle.
 * Each section type has a dedicated context fetcher that pulls relevant data and formats
 * it for AI consumption.
 *
 * Architecture:
 * - Section-specific orchestrators fetch ALL relevant data in parallel
 * - Data is compressed into structured context strings
 * - Reporting period filtering highlights changes/deltas
 */

// ============================================================================
// BASE TYPES & ENUMS
// ============================================================================

/**
 * Building Class enum values from projectProfiles schema
 */
export const BUILDING_CLASS = [
    'residential',
    'commercial',
    'industrial',
    'institution',
    'mixed',
    'infrastructure',
    'agricultural',
    'defense_secure',
] as const;
export type BuildingClass = (typeof BUILDING_CLASS)[number];

/**
 * Project Type (v2) enum values from projectProfiles schema
 */
export const PROJECT_TYPE_V2 = [
    'refurb',
    'extend',
    'new',
    'remediation',
    'advisory',
] as const;
export type ProjectTypeV2 = (typeof PROJECT_TYPE_V2)[number];

/**
 * Quality Tier enum values (from profiler complexity.quality)
 */
export const QUALITY_TIER = [
    'basic',
    'standard',
    'premium',
    'luxury',
] as const;
export type QualityTier = (typeof QUALITY_TIER)[number];

/**
 * Procurement Route enum values (from profiler complexity.procurement_route)
 */
export const PROCUREMENT_ROUTE = [
    'traditional',
    'design_and_construct',
    'construction_management',
    'design_novate_construct',
    'early_contractor_involvement',
    'managing_contractor',
    'alliance',
] as const;
export type ProcurementRoute = (typeof PROCUREMENT_ROUTE)[number];

/**
 * Stakeholder Group types
 */
export const STAKEHOLDER_GROUP = [
    'client',
    'authority',
    'consultant',
    'contractor',
] as const;
export type StakeholderGroup = (typeof STAKEHOLDER_GROUP)[number];

/**
 * Tender Status types
 */
export const TENDER_STATUS = ['brief', 'tender', 'rec', 'award'] as const;
export type TenderStatus = (typeof TENDER_STATUS)[number];

/**
 * Submission Status types
 */
export const SUBMISSION_STATUS = [
    'pending',
    'submitted',
    'approved',
    'rejected',
    'withdrawn',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[number];

/**
 * Risk severity levels
 */
export const RISK_SEVERITY = ['low', 'medium', 'high'] as const;
export type RiskSeverity = (typeof RISK_SEVERITY)[number];

/**
 * Cost line sections
 */
export const COST_SECTION = [
    'FEES',
    'CONSULTANTS',
    'CONSTRUCTION',
    'CONTINGENCY',
] as const;
export type CostSection = (typeof COST_SECTION)[number];

/**
 * Report section keys that map to orchestrators
 */
export const REPORT_SECTION_KEY = [
    'brief',
    'summary',
    'procurement',
    'planning_authorities',
    'design',
    'construction',
    'cost_planning',
    'programme',
    'other',
] as const;
export type ReportSectionKey = (typeof REPORT_SECTION_KEY)[number];

// ============================================================================
// DISPLAY NAME FORMATTERS
// ============================================================================

/**
 * Display names for Building Class enum
 */
export const BUILDING_CLASS_DISPLAY: Record<BuildingClass, string> = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
    institution: 'Institutional',
    mixed: 'Mixed-Use',
    infrastructure: 'Infrastructure',
    agricultural: 'Agricultural',
    defense_secure: 'Defense/Secure',
};

/**
 * Display names for Project Type (v2) enum
 */
export const PROJECT_TYPE_V2_DISPLAY: Record<ProjectTypeV2, string> = {
    refurb: 'Refurbishment',
    extend: 'Extension',
    new: 'New Build',
    remediation: 'Remediation',
    advisory: 'Advisory',
};

/**
 * Display names for Quality Tier enum
 */
export const QUALITY_TIER_DISPLAY: Record<QualityTier, string> = {
    basic: 'Basic',
    standard: 'Standard',
    premium: 'Premium',
    luxury: 'Luxury',
};

/**
 * Display names for Procurement Route enum
 */
export const PROCUREMENT_ROUTE_DISPLAY: Record<ProcurementRoute, string> = {
    traditional: 'Traditional (Lump Sum)',
    design_and_construct: 'Design & Construct (D&C)',
    construction_management: 'Construction Management',
    design_novate_construct: 'Design Novate Construct',
    early_contractor_involvement: 'Early Contractor Involvement (ECI)',
    managing_contractor: 'Managing Contractor',
    alliance: 'Alliance',
};

/**
 * Display names for Stakeholder Group enum
 */
export const STAKEHOLDER_GROUP_DISPLAY: Record<StakeholderGroup, string> = {
    client: 'Client',
    authority: 'Authority',
    consultant: 'Consultant',
    contractor: 'Contractor',
};

/**
 * Display names for Tender Status enum
 */
export const TENDER_STATUS_DISPLAY: Record<TenderStatus, string> = {
    brief: 'Brief',
    tender: 'Tender',
    rec: 'Recommendation',
    award: 'Award',
};

/**
 * Display names for Submission Status enum
 */
export const SUBMISSION_STATUS_DISPLAY: Record<SubmissionStatus, string> = {
    pending: 'Pending',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
};

/**
 * Display names for Risk Severity enum
 */
export const RISK_SEVERITY_DISPLAY: Record<RiskSeverity, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
};

/**
 * Display names for Cost Section enum
 */
export const COST_SECTION_DISPLAY: Record<CostSection, string> = {
    FEES: 'Fees',
    CONSULTANTS: 'Consultants',
    CONSTRUCTION: 'Construction',
    CONTINGENCY: 'Contingency',
};

// ============================================================================
// HELPER FUNCTIONS FOR DISPLAY NAMES
// ============================================================================

/**
 * Get display name for building class
 */
export function getBuildingClassDisplay(value: string | null | undefined): string {
    if (!value) return 'Not specified';
    return BUILDING_CLASS_DISPLAY[value as BuildingClass] ?? value;
}

/**
 * Get display name for project type
 */
export function getProjectTypeDisplay(value: string | null | undefined): string {
    if (!value) return 'Not specified';
    return PROJECT_TYPE_V2_DISPLAY[value as ProjectTypeV2] ?? value;
}

/**
 * Get display name for quality tier
 */
export function getQualityTierDisplay(value: string | null | undefined): string {
    if (!value) return 'Not specified';
    return QUALITY_TIER_DISPLAY[value as QualityTier] ?? value;
}

/**
 * Get display name for procurement route
 */
export function getProcurementRouteDisplay(value: string | null | undefined): string {
    if (!value) return 'Not specified';
    return PROCUREMENT_ROUTE_DISPLAY[value as ProcurementRoute] ?? value;
}

/**
 * Get display name for stakeholder group
 */
export function getStakeholderGroupDisplay(value: string | null | undefined): string {
    if (!value) return 'Not specified';
    return STAKEHOLDER_GROUP_DISPLAY[value as StakeholderGroup] ?? value;
}

/**
 * Get display name for tender status
 */
export function getTenderStatusDisplay(value: string | null | undefined): string {
    if (!value) return 'Not started';
    return TENDER_STATUS_DISPLAY[value as TenderStatus] ?? value;
}

/**
 * Get display name for submission status
 */
export function getSubmissionStatusDisplay(value: string | null | undefined): string {
    if (!value) return 'Not specified';
    return SUBMISSION_STATUS_DISPLAY[value as SubmissionStatus] ?? value;
}

/**
 * Get display name for risk severity
 */
export function getRiskSeverityDisplay(value: string | null | undefined): string {
    if (!value) return 'Not assessed';
    return RISK_SEVERITY_DISPLAY[value as RiskSeverity] ?? value;
}

/**
 * Get display name for cost section
 */
export function getCostSectionDisplay(value: string | null | undefined): string {
    if (!value) return 'Other';
    return COST_SECTION_DISPLAY[value as CostSection] ?? value;
}

// ============================================================================
// REPORTING PERIOD TYPES
// ============================================================================

/**
 * Reporting period definition for delta tracking
 */
export interface ReportingPeriod {
    start: string; // ISO date string
    end: string; // ISO date string
}

/**
 * Generic delta item tracking a change within the reporting period
 */
export interface DeltaItem<T = unknown> {
    type: 'added' | 'updated' | 'removed' | 'transitioned';
    timestamp: string;
    description: string;
    previousValue?: T;
    currentValue?: T;
    metadata?: Record<string, unknown>;
}

/**
 * Delta summary for a section
 */
export interface DeltaSummary {
    hasChanges: boolean;
    changeCount: number;
    items: DeltaItem[];
}

// ============================================================================
// REPORTING PERIOD DELTA TRACKING UTILITIES
// ============================================================================

/**
 * Check if a date falls within a reporting period
 */
export function isWithinPeriod(
    dateStr: string | null | undefined,
    period: ReportingPeriod | null | undefined
): boolean {
    if (!dateStr || !period) return true; // Include if no period filter
    const date = new Date(dateStr);
    const start = new Date(period.start);
    const end = new Date(period.end);
    return date >= start && date <= end;
}

/**
 * Check if a date is before the reporting period (for baseline comparison)
 */
export function isBeforePeriod(
    dateStr: string | null | undefined,
    period: ReportingPeriod | null | undefined
): boolean {
    if (!dateStr || !period) return false;
    const date = new Date(dateStr);
    const start = new Date(period.start);
    return date < start;
}

/**
 * Check if a date is after the reporting period
 */
export function isAfterPeriod(
    dateStr: string | null | undefined,
    period: ReportingPeriod | null | undefined
): boolean {
    if (!dateStr || !period) return false;
    const date = new Date(dateStr);
    const end = new Date(period.end);
    return date > end;
}

/**
 * Calculate the number of days within a period
 */
export function getPeriodDays(period: ReportingPeriod): number {
    const start = new Date(period.start);
    const end = new Date(period.end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Create a delta item for a new/added item
 */
export function createAddedDelta<T>(
    description: string,
    value: T,
    timestamp?: string,
    metadata?: Record<string, unknown>
): DeltaItem<T> {
    return {
        type: 'added',
        timestamp: timestamp ?? new Date().toISOString(),
        description,
        currentValue: value,
        metadata,
    };
}

/**
 * Create a delta item for an updated item
 */
export function createUpdatedDelta<T>(
    description: string,
    previousValue: T,
    currentValue: T,
    timestamp?: string,
    metadata?: Record<string, unknown>
): DeltaItem<T> {
    return {
        type: 'updated',
        timestamp: timestamp ?? new Date().toISOString(),
        description,
        previousValue,
        currentValue,
        metadata,
    };
}

/**
 * Create a delta item for a removed item
 */
export function createRemovedDelta<T>(
    description: string,
    value: T,
    timestamp?: string,
    metadata?: Record<string, unknown>
): DeltaItem<T> {
    return {
        type: 'removed',
        timestamp: timestamp ?? new Date().toISOString(),
        description,
        previousValue: value,
        metadata,
    };
}

/**
 * Create a delta item for a status transition
 */
export function createTransitionDelta<T>(
    description: string,
    previousValue: T,
    currentValue: T,
    timestamp?: string,
    metadata?: Record<string, unknown>
): DeltaItem<T> {
    return {
        type: 'transitioned',
        timestamp: timestamp ?? new Date().toISOString(),
        description,
        previousValue,
        currentValue,
        metadata,
    };
}

/**
 * Create an empty delta summary
 */
export function createEmptyDeltaSummary(): DeltaSummary {
    return {
        hasChanges: false,
        changeCount: 0,
        items: [],
    };
}

/**
 * Merge multiple delta summaries into one
 */
export function mergeDeltaSummaries(...summaries: DeltaSummary[]): DeltaSummary {
    const allItems = summaries.flatMap((s) => s.items);
    return {
        hasChanges: allItems.length > 0,
        changeCount: allItems.length,
        items: allItems.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    };
}

/**
 * Format delta summary as markdown for AI context
 */
export function formatDeltaSummaryAsMarkdown(
    summary: DeltaSummary,
    sectionTitle: string
): string {
    if (!summary.hasChanges) {
        return `### ${sectionTitle} - Changes This Period\nNo significant changes during this reporting period.`;
    }

    const lines: string[] = [
        `### ${sectionTitle} - Changes This Period (${summary.changeCount})`,
    ];

    // Group by type
    const added = summary.items.filter((i) => i.type === 'added');
    const updated = summary.items.filter((i) => i.type === 'updated');
    const transitioned = summary.items.filter((i) => i.type === 'transitioned');
    const removed = summary.items.filter((i) => i.type === 'removed');

    if (added.length > 0) {
        lines.push('\n**New:**');
        added.forEach((item) => lines.push(`- ${item.description}`));
    }

    if (transitioned.length > 0) {
        lines.push('\n**Status Changes:**');
        transitioned.forEach((item) => lines.push(`- ${item.description}`));
    }

    if (updated.length > 0) {
        lines.push('\n**Updates:**');
        updated.forEach((item) => lines.push(`- ${item.description}`));
    }

    if (removed.length > 0) {
        lines.push('\n**Removed:**');
        removed.forEach((item) => lines.push(`- ${item.description}`));
    }

    return lines.join('\n');
}

// ============================================================================
// SECTION CONTEXT TYPES
// ============================================================================

/**
 * Base context interface that all section contexts extend
 */
export interface BaseSectionContext {
    projectId: string;
    sectionKey: ReportSectionKey;
    reportingPeriod?: ReportingPeriod;
    generatedAt: string;
    deltas: DeltaSummary;
}

/**
 * Project profile data for Brief/Summary context
 */
export interface ProfileContext {
    buildingClass: string;
    buildingClassDisplay: string;
    projectType: string;
    projectTypeDisplay: string;
    gfa?: number; // Gross Floor Area in sqm
    storeys?: number;
    qualityTier?: string;
    qualityTierDisplay?: string;
    complexityScore?: number;
    procurementRoute?: string;
    procurementRouteDisplay?: string;
}

/**
 * Cost summary for Brief/Summary context
 */
export interface CostSummaryContext {
    budgetTotal: number;
    currentForecast: number;
    variance: number;
    variancePercent: number;
    contingencyOriginal: number;
    contingencyUsed: number;
    contingencyRemaining: number;
    contingencyPercent: number;
}

/**
 * Program status for Brief/Summary context
 */
export interface ProgramStatusContext {
    currentStage?: string;
    nextMilestone?: {
        name: string;
        date: string;
        daysUntil: number;
    };
    daysAheadBehind?: number;
    percentComplete?: number;
}

/**
 * Risk summary for Brief/Summary context
 */
export interface RiskSummaryContext {
    totalCount: number;
    byLikelihood: Record<RiskSeverity, number>;
    byImpact: Record<RiskSeverity, number>;
    topActiveRisks: Array<{
        title: string;
        likelihood: string;
        impact: string;
    }>;
}

/**
 * Procurement overview for Brief/Summary context
 */
export interface ProcurementOverviewContext {
    consultantsTotal: number;
    consultantsAwarded: number;
    contractorsTotal: number;
    contractorsAwarded: number;
    contractorsTendered: number;
}

/**
 * Brief/Summary section context
 */
export interface BriefSectionContext extends BaseSectionContext {
    sectionKey: 'brief' | 'summary';
    profile?: ProfileContext;
    costSummary?: CostSummaryContext;
    programStatus?: ProgramStatusContext;
    riskSummary?: RiskSummaryContext;
    procurementOverview?: ProcurementOverviewContext;
}

/**
 * Stakeholder tender status for Procurement context
 */
export interface StakeholderTenderContext {
    id: string;
    name: string;
    disciplineOrTrade?: string;
    group: StakeholderGroup;
    currentStatus?: TenderStatus;
    isComplete: boolean;
    awardedFirm?: string;
    awardedValue?: number;
    budgetAllowance?: number;
}

/**
 * Procurement section context
 */
export interface ProcurementSectionContext extends BaseSectionContext {
    sectionKey: 'procurement';
    procurementRoute?: string;
    procurementRouteDisplay?: string;
    consultants: StakeholderTenderContext[];
    contractors: StakeholderTenderContext[];
    shortlistedFirms: Array<{
        firmName: string;
        disciplineOrTrade: string;
        type: 'consultant' | 'contractor';
    }>;
    awardedFirms: Array<{
        firmName: string;
        disciplineOrTrade: string;
        value?: number;
        type: 'consultant' | 'contractor';
    }>;
}

/**
 * Cost line context for Cost Planning
 */
export interface CostLineContext {
    id: string;
    section: CostSection;
    activity: string;
    budgetCents: number;
    approvedContractCents: number;
    forecastCents: number;
    varianceCents: number;
}

/**
 * Variation summary for Cost Planning
 */
export interface VariationSummaryContext {
    pendingCount: number;
    pendingValue: number;
    approvedCount: number;
    approvedValue: number;
}

/**
 * Invoice summary for Cost Planning
 */
export interface InvoiceSummaryContext {
    thisPeriodCount: number;
    thisPeriodValue: number;
    cumulativeCount: number;
    cumulativeValue: number;
}

/**
 * Contingency status for Cost Planning
 */
export interface ContingencyStatusContext {
    original: number;
    used: number;
    remaining: number;
    percentRemaining: number;
}

/**
 * Cost Planning section context
 */
export interface CostSectionContext extends BaseSectionContext {
    sectionKey: 'cost_planning';
    costLinesBySection: Record<CostSection, CostLineContext[]>;
    totals: {
        budget: number;
        approvedContract: number;
        forecast: number;
        variance: number;
    };
    variationSummary: VariationSummaryContext;
    invoiceSummary: InvoiceSummaryContext;
    contingencyStatus: ContingencyStatusContext;
}

/**
 * Program activity context
 */
export interface ProgramActivityContext {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    isCriticalPath?: boolean;
    percentComplete?: number;
}

/**
 * Milestone context
 */
export interface MilestoneContext {
    id: string;
    name: string;
    date: string;
    activityName?: string;
    daysUntil: number;
}

/**
 * Programme section context
 */
export interface ProgrammeSectionContext extends BaseSectionContext {
    sectionKey: 'programme';
    currentStage?: string;
    activities: ProgramActivityContext[];
    upcomingMilestones: {
        next30Days: MilestoneContext[];
        next60Days: MilestoneContext[];
        next90Days: MilestoneContext[];
    };
    criticalPathStatus?: {
        isOnTrack: boolean;
        daysVariance: number;
    };
    stageCompletion: Array<{
        stageName: string;
        percentComplete: number;
    }>;
}

/**
 * Authority stakeholder context for Planning & Authorities
 */
export interface AuthorityStakeholderContext {
    id: string;
    name: string;
    submissionType?: string;
    status: SubmissionStatus;
    submittedAt?: string;
    responseDue?: string;
    responseReceivedAt?: string;
    conditions?: string[];
    conditionsCleared: boolean;
}

/**
 * Planning & Authorities section context
 */
export interface PlanningSectionContext extends BaseSectionContext {
    sectionKey: 'planning_authorities';
    authorities: AuthorityStakeholderContext[];
    statusBreakdown: Record<SubmissionStatus, number>;
    outstandingConditionsCount: number;
    clearedConditionsCount: number;
}

/**
 * Consultant stakeholder context for Design
 */
export interface ConsultantStakeholderContext {
    id: string;
    name: string;
    discipline?: string;
    currentStatus?: TenderStatus;
    briefFee?: string;
    awardedFirm?: string;
}

/**
 * Design section context
 */
export interface DesignSectionContext extends BaseSectionContext {
    sectionKey: 'design';
    consultants: ConsultantStakeholderContext[];
    designMilestones: MilestoneContext[];
    currentDesignStage?: string;
}

/**
 * Contractor stakeholder context for Construction
 */
export interface ContractorStakeholderContext {
    id: string;
    name: string;
    trade?: string;
    scopeWorks?: string;
    currentStatus?: TenderStatus;
    awardedFirm?: string;
    claimsThisPeriod?: number;
    totalClaimed?: number;
}

/**
 * Construction section context
 */
export interface ConstructionSectionContext extends BaseSectionContext {
    sectionKey: 'construction';
    contractors: ContractorStakeholderContext[];
    constructionMilestones: MilestoneContext[];
    percentComplete?: number;
    claimsThisPeriod: number;
    totalClaimed: number;
    variationsPending: number;
    variationsApproved: number;
}

/**
 * Union type for all section contexts
 */
export type SectionContext =
    | BriefSectionContext
    | ProcurementSectionContext
    | CostSectionContext
    | ProgrammeSectionContext
    | PlanningSectionContext
    | DesignSectionContext
    | ConstructionSectionContext;

// ============================================================================
// SECTION ROUTING MAP
// ============================================================================

/**
 * Maps section keys to their orchestrator function names
 * Used for routing content generation requests
 */
export const SECTION_ORCHESTRATOR_MAP: Record<
    ReportSectionKey,
    | 'fetchBriefContext'
    | 'fetchProcurementContext'
    | 'fetchCostContext'
    | 'fetchProgrammeContext'
    | 'fetchPlanningContext'
    | 'fetchDesignContext'
    | 'fetchConstructionContext'
    | null
> = {
    brief: 'fetchBriefContext',
    summary: 'fetchBriefContext',
    procurement: 'fetchProcurementContext',
    planning_authorities: 'fetchPlanningContext',
    design: 'fetchDesignContext',
    construction: 'fetchConstructionContext',
    cost_planning: 'fetchCostContext',
    programme: 'fetchProgrammeContext',
    other: null, // No specific orchestrator, uses general context
};

/**
 * Get the orchestrator function name for a section key
 */
export function getOrchestratorForSection(sectionKey: string): string | null {
    return SECTION_ORCHESTRATOR_MAP[sectionKey as ReportSectionKey] ?? null;
}

// ============================================================================
// DATABASE IMPORTS
// ============================================================================

import { db } from '../db';
import {
    projectProfiles,
    costLines,
    variations,
    invoices,
    programActivities,
    programMilestones,
    risks,
    projectStakeholders,
    stakeholderTenderStatuses,
    consultants,
    contractors,
} from '../db/pg-schema';
import { eq, and, isNull, sql, gte, lte, or, desc, asc, inArray } from 'drizzle-orm';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency amount (cents to dollars with formatting)
 */
export function formatCurrency(cents: number, includeSign = false): string {
    const dollars = cents / 100;
    const formatted = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.abs(dollars));

    if (includeSign && cents !== 0) {
        return cents > 0 ? `+${formatted}` : `-${formatted}`;
    }
    return formatted;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate days until a date from today
 */
export function daysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a date for display
 */
export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Calculate variance percentage
 */
export function calculateVariancePercent(budget: number, actual: number): number {
    if (budget === 0) return 0;
    return ((actual - budget) / budget) * 100;
}

/**
 * Create a base section context
 */
export function createBaseSectionContext(
    projectId: string,
    sectionKey: ReportSectionKey,
    reportingPeriod?: ReportingPeriod
): BaseSectionContext {
    return {
        projectId,
        sectionKey,
        reportingPeriod,
        generatedAt: new Date().toISOString(),
        deltas: createEmptyDeltaSummary(),
    };
}

// ============================================================================
// STEP 2: BRIEF CONTEXT TYPES AND FETCHER
// Feature 025 - Intelligent Report Generation
// ============================================================================

/**
 * Profiler data summary for report context
 */
export interface ProfilerSummary {
    buildingClass: string;
    buildingClassDisplay: string;
    projectType: string;
    projectTypeDisplay: string;
    gfaSqm: number | null;
    storeys: number | null;
    qualityTier: string | null;
    complexityScore: number | null;
    region: string;
}

/**
 * Cost plan summary for report context
 */
export interface CostPlanSummary {
    totalBudgetCents: number;
    totalForecastCents: number;
    totalApprovedCents: number;
    totalInvoicedCents: number;
    varianceCents: number;
    variancePercent: number;
    contingencyBudgetCents: number;
    contingencyUsedCents: number;
    contingencyRemainingCents: number;
}

/**
 * Program/schedule status for report context
 */
export interface ProgramStatus {
    currentStage: string | null;
    currentStageProgress: number; // 0-100
    nextMilestone: {
        name: string;
        date: string;
        daysUntil: number;
    } | null;
    daysAheadOrBehind: number; // positive = ahead, negative = behind
    totalActivities: number;
    completedActivities: number;
}

/**
 * Risk summary for report context
 */
export interface RiskSummary {
    totalCount: number;
    byStatus: {
        identified: number;
        mitigated: number;
        closed: number;
    };
    bySeverity: {
        high: number;
        medium: number;
        low: number;
    };
    topActiveRisks: Array<{
        id: string;
        title: string;
        severity: string;
        likelihood: string | null;
        impact: string | null;
    }>;
}

/**
 * Procurement overview for report context
 */
export interface ProcurementOverview {
    consultants: {
        total: number;
        awarded: number;
        tendered: number;
        briefed: number;
    };
    contractors: {
        total: number;
        awarded: number;
        tendered: number;
        briefed: number;
    };
}

/**
 * Period-over-period deltas
 */
export interface PeriodDeltas {
    forecastChangeCents: number;
    forecastChangePercent: number;
    newRisksCount: number;
    closedRisksCount: number;
    milestonesCompleted: string[];
    milestonesUpcoming: string[];
    newVariationsCount: number;
    variationsApprovedCents: number;
}

/**
 * Complete Brief Context for report generation
 * This provides the high-level project snapshot used across all report sections
 */
export interface BriefContext {
    projectId: string;
    projectName: string;
    projectCode: string | null;
    reportingPeriod: ReportingPeriod | null;
    generatedAt: string;

    // Core summaries
    profiler: ProfilerSummary | null;
    costPlan: CostPlanSummary;
    program: ProgramStatus;
    risks: RiskSummary;
    procurement: ProcurementOverview;

    // Period-over-period changes
    deltas: PeriodDeltas;
}

// Display name mappings for building classes
const BUILDING_CLASS_DISPLAY: Record<string, string> = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
    institution: 'Institutional',
    mixed: 'Mixed-Use',
    infrastructure: 'Infrastructure',
    agricultural: 'Agricultural',
    defense_secure: 'Defense & Secure',
};

// Display name mappings for project types
const PROJECT_TYPE_DISPLAY: Record<string, string> = {
    refurb: 'Refurbishment',
    extend: 'Extension',
    new: 'New Build',
    remediation: 'Remediation',
    advisory: 'Advisory',
};

/**
 * Calculate risk severity based on likelihood and impact
 */
function calculateRiskSeverity(likelihood: string | null, impact: string | null): string {
    const likelihoodScore = { high: 3, medium: 2, low: 1 }[likelihood ?? 'low'] ?? 1;
    const impactScore = { high: 3, medium: 2, low: 1 }[impact ?? 'low'] ?? 1;
    const score = likelihoodScore * impactScore;

    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
}

/**
 * Fetch the Brief Context for a project
 * This is the main data fetcher for Step 2 of the intelligent report generation pipeline
 *
 * @param projectId - The project ID to fetch context for
 * @param reportingPeriod - Optional reporting period for delta calculations
 * @returns BriefContext with all project summaries
 */
export async function fetchBriefContext(
    projectId: string,
    reportingPeriod?: ReportingPeriod
): Promise<BriefContext> {
    const generatedAt = new Date().toISOString();

    // Fetch all data in parallel for performance
    const [
        projectData,
        profilerData,
        costData,
        programData,
        riskData,
        procurementData,
    ] = await Promise.all([
        fetchProjectBasics(projectId),
        fetchProfilerSummary(projectId),
        fetchCostPlanSummary(projectId, reportingPeriod),
        fetchProgramStatus(projectId),
        fetchRiskSummary(projectId, reportingPeriod),
        fetchProcurementOverview(projectId),
    ]);

    // Calculate period deltas if reporting period is provided
    const deltas = reportingPeriod
        ? await calculatePeriodDeltas(projectId, reportingPeriod)
        : createEmptyPeriodDeltas();

    return {
        projectId,
        projectName: projectData.name,
        projectCode: projectData.code,
        reportingPeriod: reportingPeriod ?? null,
        generatedAt,
        profiler: profilerData,
        costPlan: costData,
        program: programData,
        risks: riskData,
        procurement: procurementData,
        deltas,
    };
}

/**
 * Fetch basic project info
 */
async function fetchProjectBasics(projectId: string): Promise<{ name: string; code: string | null }> {
    const { projects } = await import('../db/pg-schema');

    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });

    return {
        name: project?.name ?? 'Unknown Project',
        code: project?.code ?? null,
    };
}

/**
 * Fetch profiler summary data
 */
async function fetchProfilerSummary(projectId: string): Promise<ProfilerSummary | null> {
    try {
        const profile = await db.query.projectProfiles.findFirst({
            where: eq(projectProfiles.projectId, projectId),
        });

        if (!profile) {
            return null;
        }

        // Parse scale data JSON
        let gfaSqm: number | null = null;
        let storeys: number | null = null;
        try {
            const scaleData = JSON.parse(profile.scaleData || '{}');
            gfaSqm = scaleData.gfa_sqm ?? scaleData.gfaSqm ?? null;
            storeys = scaleData.levels ?? scaleData.storeys ?? null;
        } catch {
            // Ignore parse errors
        }

        // Parse complexity data for quality tier
        let qualityTier: string | null = null;
        try {
            const complexityData = JSON.parse(profile.complexity || '{}');
            qualityTier = complexityData.quality ?? complexityData.qualityTier ?? null;
        } catch {
            // Ignore parse errors
        }

        const buildingClass = profile.buildingClass ?? '';
        const projectType = profile.projectType ?? '';

        return {
            buildingClass,
            buildingClassDisplay: BUILDING_CLASS_DISPLAY[buildingClass] ?? buildingClass,
            projectType,
            projectTypeDisplay: PROJECT_TYPE_DISPLAY[projectType] ?? projectType,
            gfaSqm,
            storeys,
            qualityTier,
            complexityScore: profile.complexityScore ?? null,
            region: profile.region ?? 'AU',
        };
    } catch (error) {
        console.error('[fetchBriefContext] Error fetching profiler summary:', error);
        return null;
    }
}

/**
 * Fetch cost plan summary
 */
async function fetchCostPlanSummary(
    projectId: string,
    reportingPeriod?: ReportingPeriod
): Promise<CostPlanSummary> {
    try {
        // Fetch all active cost lines
        const lines = await db.select()
            .from(costLines)
            .where(and(
                eq(costLines.projectId, projectId),
                isNull(costLines.deletedAt)
            ));

        // Calculate totals
        let totalBudgetCents = 0;
        let totalApprovedCents = 0;
        let contingencyBudgetCents = 0;

        for (const line of lines) {
            totalBudgetCents += line.budgetCents ?? 0;
            totalApprovedCents += line.approvedContractCents ?? 0;

            if (line.section === 'CONTINGENCY') {
                contingencyBudgetCents += line.budgetCents ?? 0;
            }
        }

        // Fetch variations for forecast
        const variationsList = await db.select()
            .from(variations)
            .where(and(
                eq(variations.projectId, projectId),
                isNull(variations.deletedAt)
            ));

        let totalVariationsForecastCents = 0;
        let totalVariationsApprovedCents = 0;

        for (const v of variationsList) {
            totalVariationsForecastCents += v.amountForecastCents ?? 0;
            if (v.status === 'Approved') {
                totalVariationsApprovedCents += v.amountApprovedCents ?? 0;
            }
        }

        // Fetch invoices for actual spend
        const invoicesList = await db.select()
            .from(invoices)
            .where(and(
                eq(invoices.projectId, projectId),
                isNull(invoices.deletedAt)
            ));

        let totalInvoicedCents = 0;
        for (const inv of invoicesList) {
            totalInvoicedCents += inv.amountCents ?? 0;
        }

        // Calculate forecast = approved + forecast variations
        const totalForecastCents = totalApprovedCents + totalVariationsForecastCents;

        // Calculate variance (forecast vs budget)
        const varianceCents = totalForecastCents - totalBudgetCents;
        const variancePercent = totalBudgetCents > 0
            ? (varianceCents / totalBudgetCents) * 100
            : 0;

        // Calculate contingency used (approved variations that draw from contingency)
        const contingencyUsedCents = totalVariationsApprovedCents;
        const contingencyRemainingCents = Math.max(0, contingencyBudgetCents - contingencyUsedCents);

        return {
            totalBudgetCents,
            totalForecastCents,
            totalApprovedCents,
            totalInvoicedCents,
            varianceCents,
            variancePercent,
            contingencyBudgetCents,
            contingencyUsedCents,
            contingencyRemainingCents,
        };
    } catch (error) {
        console.error('[fetchBriefContext] Error fetching cost plan summary:', error);
        return {
            totalBudgetCents: 0,
            totalForecastCents: 0,
            totalApprovedCents: 0,
            totalInvoicedCents: 0,
            varianceCents: 0,
            variancePercent: 0,
            contingencyBudgetCents: 0,
            contingencyUsedCents: 0,
            contingencyRemainingCents: 0,
        };
    }
}

/**
 * Fetch program/schedule status
 */
async function fetchProgramStatus(projectId: string): Promise<ProgramStatus> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Fetch all activities
        const activities = await db.select()
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId))
            .orderBy(asc(programActivities.sortOrder));

        // Find current stage (parent activity containing today's date)
        let currentStage: string | null = null;
        let currentStageProgress = 0;
        let daysAheadOrBehind = 0;

        const parentActivities = activities.filter(a => !a.parentId);

        for (const activity of parentActivities) {
            if (activity.startDate && activity.endDate) {
                const startDate = new Date(activity.startDate);
                const endDate = new Date(activity.endDate);

                if (today >= startDate && today <= endDate) {
                    currentStage = activity.name;

                    // Calculate progress within current stage
                    const totalDuration = endDate.getTime() - startDate.getTime();
                    const elapsed = today.getTime() - startDate.getTime();
                    currentStageProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

                    break;
                }
            }
        }

        // Fetch upcoming milestones
        const milestones = await db.select()
            .from(programMilestones)
            .where(gte(programMilestones.date, todayStr))
            .orderBy(asc(programMilestones.date));

        // Filter milestones for this project (through activity join)
        const activityIds = activities.map(a => a.id);
        const projectMilestones = milestones.filter(m => activityIds.includes(m.activityId));

        let nextMilestone: ProgramStatus['nextMilestone'] = null;
        if (projectMilestones.length > 0) {
            const next = projectMilestones[0];
            const milestoneDate = new Date(next.date);
            nextMilestone = {
                name: next.name,
                date: next.date,
                daysUntil: Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            };
        }

        // Count activities with dates
        const activitiesWithDates = activities.filter(a => a.startDate && a.endDate);
        const completedActivities = activitiesWithDates.filter(a => {
            const endDate = new Date(a.endDate!);
            return endDate < today;
        });

        // Calculate overall schedule variance
        // Positive = ahead of schedule, Negative = behind schedule
        if (parentActivities.length > 0 && currentStage) {
            // Find the current stage's planned progress vs actual
            const currentActivity = parentActivities.find(a => a.name === currentStage);
            if (currentActivity?.startDate && currentActivity?.endDate) {
                const plannedEnd = new Date(currentActivity.endDate);
                daysAheadOrBehind = Math.ceil((plannedEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }
        }

        return {
            currentStage,
            currentStageProgress: Math.round(currentStageProgress),
            nextMilestone,
            daysAheadOrBehind,
            totalActivities: activities.length,
            completedActivities: completedActivities.length,
        };
    } catch (error) {
        console.error('[fetchBriefContext] Error fetching program status:', error);
        return {
            currentStage: null,
            currentStageProgress: 0,
            nextMilestone: null,
            daysAheadOrBehind: 0,
            totalActivities: 0,
            completedActivities: 0,
        };
    }
}

/**
 * Fetch risk summary
 */
async function fetchRiskSummary(
    projectId: string,
    reportingPeriod?: ReportingPeriod
): Promise<RiskSummary> {
    try {
        // Fetch all risks for the project
        const risksList = await db.select()
            .from(risks)
            .where(eq(risks.projectId, projectId))
            .orderBy(risks.order);

        // Count by status
        const byStatus = {
            identified: 0,
            mitigated: 0,
            closed: 0,
        };

        const bySeverity = {
            high: 0,
            medium: 0,
            low: 0,
        };

        const activeRisks: Array<{
            id: string;
            title: string;
            severity: string;
            likelihood: string | null;
            impact: string | null;
        }> = [];

        for (const risk of risksList) {
            // Count by status
            const status = (risk.status ?? 'identified') as 'identified' | 'mitigated' | 'closed';
            byStatus[status]++;

            // Calculate severity and count
            const severity = calculateRiskSeverity(risk.likelihood, risk.impact);
            bySeverity[severity as 'high' | 'medium' | 'low']++;

            // Collect active risks (not closed)
            if (status !== 'closed') {
                activeRisks.push({
                    id: risk.id,
                    title: risk.title,
                    severity,
                    likelihood: risk.likelihood,
                    impact: risk.impact,
                });
            }
        }

        // Sort active risks by severity (high first) and take top 3
        const severityOrder = { high: 0, medium: 1, low: 2 };
        activeRisks.sort((a, b) =>
            (severityOrder[a.severity as keyof typeof severityOrder] ?? 2) -
            (severityOrder[b.severity as keyof typeof severityOrder] ?? 2)
        );
        const topActiveRisks = activeRisks.slice(0, 3);

        return {
            totalCount: risksList.length,
            byStatus,
            bySeverity,
            topActiveRisks,
        };
    } catch (error) {
        console.error('[fetchBriefContext] Error fetching risk summary:', error);
        return {
            totalCount: 0,
            byStatus: { identified: 0, mitigated: 0, closed: 0 },
            bySeverity: { high: 0, medium: 0, low: 0 },
            topActiveRisks: [],
        };
    }
}

/**
 * Fetch procurement overview
 */
async function fetchProcurementOverview(projectId: string): Promise<ProcurementOverview> {
    try {
        // Fetch stakeholders for consultants and contractors
        const stakeholders = await db.select()
            .from(projectStakeholders)
            .where(and(
                eq(projectStakeholders.projectId, projectId),
                isNull(projectStakeholders.deletedAt),
                or(
                    eq(projectStakeholders.stakeholderGroup, 'consultant'),
                    eq(projectStakeholders.stakeholderGroup, 'contractor')
                )
            ));

        // Get all tender statuses for these stakeholders
        const stakeholderIds = stakeholders.map(s => s.id);

        let tenderStatuses: Array<{
            stakeholderId: string;
            statusType: string;
            isComplete: boolean | null;
        }> = [];

        if (stakeholderIds.length > 0) {
            tenderStatuses = await db.select({
                stakeholderId: stakeholderTenderStatuses.stakeholderId,
                statusType: stakeholderTenderStatuses.statusType,
                isComplete: stakeholderTenderStatuses.isComplete,
            })
                .from(stakeholderTenderStatuses)
                .where(inArray(stakeholderTenderStatuses.stakeholderId, stakeholderIds));
        }

        // Build status map by stakeholder
        const statusMap = new Map<string, Set<string>>();
        for (const status of tenderStatuses) {
            if (status.isComplete) {
                if (!statusMap.has(status.stakeholderId)) {
                    statusMap.set(status.stakeholderId, new Set());
                }
                statusMap.get(status.stakeholderId)!.add(status.statusType);
            }
        }

        // Count by group and status
        const consultants = { total: 0, awarded: 0, tendered: 0, briefed: 0 };
        const contractors = { total: 0, awarded: 0, tendered: 0, briefed: 0 };

        for (const stakeholder of stakeholders) {
            if (!stakeholder.isEnabled) continue;

            const target = stakeholder.stakeholderGroup === 'consultant' ? consultants : contractors;
            target.total++;

            const completedStatuses = statusMap.get(stakeholder.id) || new Set();

            if (completedStatuses.has('award')) {
                target.awarded++;
            } else if (completedStatuses.has('tender') || completedStatuses.has('rec')) {
                target.tendered++;
            } else if (completedStatuses.has('brief')) {
                target.briefed++;
            }
        }

        return { consultants, contractors };
    } catch (error) {
        console.error('[fetchBriefContext] Error fetching procurement overview:', error);
        return {
            consultants: { total: 0, awarded: 0, tendered: 0, briefed: 0 },
            contractors: { total: 0, awarded: 0, tendered: 0, briefed: 0 },
        };
    }
}

/**
 * Calculate period-over-period deltas
 */
async function calculatePeriodDeltas(
    projectId: string,
    period: ReportingPeriod
): Promise<PeriodDeltas> {
    try {
        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);

        // Fetch variations created or approved in period
        const periodVariations = await db.select()
            .from(variations)
            .where(and(
                eq(variations.projectId, projectId),
                isNull(variations.deletedAt)
            ));

        let newVariationsCount = 0;
        let variationsApprovedCents = 0;

        for (const v of periodVariations) {
            // Check if created in period
            if (v.createdAt) {
                const createdAt = new Date(v.createdAt);
                if (createdAt >= periodStart && createdAt <= periodEnd) {
                    newVariationsCount++;
                }
            }

            // Check if approved in period
            if (v.status === 'Approved' && v.dateApproved) {
                const approvedAt = new Date(v.dateApproved);
                if (approvedAt >= periodStart && approvedAt <= periodEnd) {
                    variationsApprovedCents += v.amountApprovedCents ?? 0;
                }
            }
        }

        // Calculate forecast change (approximation based on new variations)
        const forecastChangeCents = variationsApprovedCents;

        // Fetch risks created/closed in period
        const allRisks = await db.select()
            .from(risks)
            .where(eq(risks.projectId, projectId));

        let newRisksCount = 0;
        let closedRisksCount = 0;

        for (const risk of allRisks) {
            if (risk.updatedAt) {
                const updatedAt = new Date(risk.updatedAt);
                if (updatedAt >= periodStart && updatedAt <= periodEnd) {
                    // Newly identified risks
                    if (risk.status === 'identified') {
                        newRisksCount++;
                    }
                    // Recently closed risks
                    if (risk.status === 'closed') {
                        closedRisksCount++;
                    }
                }
            }
        }

        // Fetch milestones in period
        const periodMilestones = await db.select()
            .from(programMilestones)
            .where(and(
                gte(programMilestones.date, period.start),
                lte(programMilestones.date, period.end)
            ));

        // Get activity IDs for this project
        const activities = await db.select({ id: programActivities.id })
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId));

        const activityIds = new Set(activities.map(a => a.id));
        const projectMilestones = periodMilestones.filter(m => activityIds.has(m.activityId));

        const today = new Date();
        const milestonesCompleted = projectMilestones
            .filter(m => new Date(m.date) <= today)
            .map(m => m.name);
        const milestonesUpcoming = projectMilestones
            .filter(m => new Date(m.date) > today)
            .map(m => m.name);

        // Calculate forecast change percent
        const costSummary = await fetchCostPlanSummary(projectId);
        const forecastChangePercent = costSummary.totalBudgetCents > 0
            ? (forecastChangeCents / costSummary.totalBudgetCents) * 100
            : 0;

        return {
            forecastChangeCents,
            forecastChangePercent,
            newRisksCount,
            closedRisksCount,
            milestonesCompleted,
            milestonesUpcoming,
            newVariationsCount,
            variationsApprovedCents,
        };
    } catch (error) {
        console.error('[fetchBriefContext] Error calculating period deltas:', error);
        return createEmptyPeriodDeltas();
    }
}

/**
 * Create empty period deltas
 */
function createEmptyPeriodDeltas(): PeriodDeltas {
    return {
        forecastChangeCents: 0,
        forecastChangePercent: 0,
        newRisksCount: 0,
        closedRisksCount: 0,
        milestonesCompleted: [],
        milestonesUpcoming: [],
        newVariationsCount: 0,
        variationsApprovedCents: 0,
    };
}

/**
 * Format Brief Context as markdown for LLM prompt inclusion
 */
export function formatBriefContextForPrompt(context: BriefContext): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Project Brief Context
**Project:** ${context.projectName}${context.projectCode ? ` (${context.projectCode})` : ''}
**Generated:** ${formatDate(context.generatedAt)}`);

    if (context.reportingPeriod) {
        sections.push(`**Reporting Period:** ${formatDate(context.reportingPeriod.start)} to ${formatDate(context.reportingPeriod.end)}`);
    }

    // Profiler Summary
    if (context.profiler) {
        const p = context.profiler;
        sections.push(`
## Project Profile
- **Building Class:** ${p.buildingClassDisplay}
- **Project Type:** ${p.projectTypeDisplay}
${p.gfaSqm ? `- **GFA:** ${p.gfaSqm.toLocaleString()} m²` : ''}
${p.storeys ? `- **Storeys:** ${p.storeys}` : ''}
${p.qualityTier ? `- **Quality Tier:** ${p.qualityTier}` : ''}
${p.complexityScore ? `- **Complexity Score:** ${p.complexityScore}/10` : ''}
- **Region:** ${p.region}`);
    }

    // Cost Summary
    const c = context.costPlan;
    sections.push(`
## Cost Summary
- **Budget:** ${formatCurrency(c.totalBudgetCents)}
- **Forecast:** ${formatCurrency(c.totalForecastCents)}
- **Variance:** ${formatCurrency(c.varianceCents, true)} (${formatPercent(c.variancePercent)})
- **Invoiced to Date:** ${formatCurrency(c.totalInvoicedCents)}
- **Contingency:** ${formatCurrency(c.contingencyRemainingCents)} remaining of ${formatCurrency(c.contingencyBudgetCents)}`);

    // Program Summary
    const prog = context.program;
    sections.push(`
## Program Status
- **Current Stage:** ${prog.currentStage ?? 'Not defined'}${prog.currentStageProgress > 0 ? ` (${prog.currentStageProgress}% complete)` : ''}
- **Schedule Variance:** ${prog.daysAheadOrBehind > 0 ? `${prog.daysAheadOrBehind} days ahead` : prog.daysAheadOrBehind < 0 ? `${Math.abs(prog.daysAheadOrBehind)} days behind` : 'On track'}
${prog.nextMilestone ? `- **Next Milestone:** ${prog.nextMilestone.name} (${formatDate(prog.nextMilestone.date)}, ${prog.nextMilestone.daysUntil} days)` : ''}
- **Activities:** ${prog.completedActivities} of ${prog.totalActivities} completed`);

    // Risk Summary
    const r = context.risks;
    sections.push(`
## Risk Summary
- **Total Risks:** ${r.totalCount}
- **By Status:** ${r.byStatus.identified} identified, ${r.byStatus.mitigated} mitigated, ${r.byStatus.closed} closed
- **By Severity:** ${r.bySeverity.high} high, ${r.bySeverity.medium} medium, ${r.bySeverity.low} low`);

    if (r.topActiveRisks.length > 0) {
        sections.push(`**Top Active Risks:**
${r.topActiveRisks.map((risk, i) => `${i + 1}. ${risk.title} (${risk.severity} severity)`).join('\n')}`);
    }

    // Procurement Summary
    const proc = context.procurement;
    sections.push(`
## Procurement Overview
**Consultants:** ${proc.consultants.awarded} of ${proc.consultants.total} awarded, ${proc.consultants.tendered} tendered, ${proc.consultants.briefed} briefed
**Contractors:** ${proc.contractors.awarded} of ${proc.contractors.total} awarded, ${proc.contractors.tendered} tendered, ${proc.contractors.briefed} briefed`);

    // Period Deltas (if reporting period provided)
    if (context.reportingPeriod) {
        const d = context.deltas;
        sections.push(`
## Period Changes
- **Forecast Change:** ${formatCurrency(d.forecastChangeCents, true)} (${formatPercent(d.forecastChangePercent)})
- **New Variations:** ${d.newVariationsCount}
- **Variations Approved:** ${formatCurrency(d.variationsApprovedCents)}
- **New Risks:** ${d.newRisksCount}
- **Closed Risks:** ${d.closedRisksCount}
${d.milestonesCompleted.length > 0 ? `- **Milestones Completed:** ${d.milestonesCompleted.join(', ')}` : ''}
${d.milestonesUpcoming.length > 0 ? `- **Upcoming Milestones:** ${d.milestonesUpcoming.join(', ')}` : ''}`);
    }

    return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ============================================================================
// STEP 3: PROCUREMENT CONTEXT TYPES AND FETCHER
// Feature 025 - Intelligent Report Generation
// ============================================================================

/**
 * Detailed tender status for a stakeholder
 */
export interface StakeholderProcurementStatus {
    id: string;
    name: string;
    disciplineOrTrade: string;
    group: 'consultant' | 'contractor';
    isEnabled: boolean;

    // Tender stage tracking
    stages: {
        brief: { isComplete: boolean; completedAt: string | null };
        tender: { isComplete: boolean; completedAt: string | null };
        rec: { isComplete: boolean; completedAt: string | null };
        award: { isComplete: boolean; completedAt: string | null };
    };
    currentStage: TenderStatus | null;

    // Award details (if awarded)
    awardedFirmName: string | null;
    awardedFirmId: string | null;

    // Cost plan linkage
    budgetAllowanceCents: number;
    approvedContractCents: number;
    variance: number; // approved - budget
}

/**
 * Shortlisted firm detail
 */
export interface ShortlistedFirm {
    firmName: string;
    firmId: string | null;
    disciplineOrTrade: string;
    type: 'consultant' | 'contractor';
    stakeholderId: string;
    stakeholderName: string;
}

/**
 * Awarded firm detail with value
 */
export interface AwardedFirm {
    firmName: string;
    firmId: string | null;
    disciplineOrTrade: string;
    type: 'consultant' | 'contractor';
    stakeholderId: string;
    stakeholderName: string;
    awardedValueCents: number;
    budgetAllowanceCents: number;
    varianceCents: number;
}

/**
 * Procurement period deltas
 */
export interface ProcurementDeltas {
    newRftsIssued: Array<{
        stakeholderName: string;
        disciplineOrTrade: string;
        rftDate: string;
    }>;
    newAwards: Array<{
        stakeholderName: string;
        disciplineOrTrade: string;
        firmName: string;
        valueCents: number;
        awardedAt: string;
    }>;
    stageTransitions: Array<{
        stakeholderName: string;
        disciplineOrTrade: string;
        fromStage: string;
        toStage: string;
        transitionedAt: string;
    }>;
}

/**
 * Complete Procurement Context for report generation
 */
export interface ProcurementContext {
    projectId: string;
    projectName: string;
    reportingPeriod: ReportingPeriod | null;
    generatedAt: string;

    // Procurement strategy
    procurementRoute: string | null;
    procurementRouteDisplay: string;

    // All stakeholders with tender status
    consultants: StakeholderProcurementStatus[];
    contractors: StakeholderProcurementStatus[];

    // Aggregated statistics
    summary: {
        consultants: {
            total: number;
            briefed: number;
            tendered: number;
            recommended: number;
            awarded: number;
        };
        contractors: {
            total: number;
            briefed: number;
            tendered: number;
            recommended: number;
            awarded: number;
        };
        totalBudgetCents: number;
        totalAwardedCents: number;
        totalVarianceCents: number;
    };

    // Shortlisted and awarded firms
    shortlistedFirms: ShortlistedFirm[];
    awardedFirms: AwardedFirm[];

    // Period-over-period changes
    deltas: ProcurementDeltas;
}

/**
 * Fetch the Procurement Context for a project
 * This is the main data fetcher for Step 3 of the intelligent report generation pipeline
 *
 * @param projectId - The project ID to fetch context for
 * @param reportingPeriod - Optional reporting period for delta calculations
 * @returns ProcurementContext with all procurement data
 */
export async function fetchProcurementContext(
    projectId: string,
    reportingPeriod?: ReportingPeriod
): Promise<ProcurementContext> {
    const generatedAt = new Date().toISOString();

    // Import rftNew for delta tracking
    const { rftNew, companies } = await import('../db/pg-schema');

    // Fetch all data in parallel for performance
    const [
        projectData,
        procurementRoute,
        stakeholderData,
        shortlistedData,
        costLineData,
    ] = await Promise.all([
        fetchProjectBasics(projectId),
        fetchProcurementRoute(projectId),
        fetchStakeholderTenderData(projectId),
        fetchShortlistedFirms(projectId),
        fetchCostLinesByStakeholder(projectId),
    ]);

    // Process consultants and contractors
    const consultants: StakeholderProcurementStatus[] = [];
    const contractors: StakeholderProcurementStatus[] = [];
    const awardedFirms: AwardedFirm[] = [];

    for (const stakeholder of stakeholderData) {
        const costLine = costLineData.get(stakeholder.id);
        const budgetAllowanceCents = costLine?.budgetCents ?? 0;
        const approvedContractCents = costLine?.approvedContractCents ?? 0;

        const status: StakeholderProcurementStatus = {
            id: stakeholder.id,
            name: stakeholder.name,
            disciplineOrTrade: stakeholder.disciplineOrTrade ?? 'General',
            group: stakeholder.stakeholderGroup as 'consultant' | 'contractor',
            isEnabled: stakeholder.isEnabled ?? true,
            stages: {
                brief: { isComplete: false, completedAt: null },
                tender: { isComplete: false, completedAt: null },
                rec: { isComplete: false, completedAt: null },
                award: { isComplete: false, completedAt: null },
            },
            currentStage: null,
            awardedFirmName: null,
            awardedFirmId: null,
            budgetAllowanceCents,
            approvedContractCents,
            variance: approvedContractCents - budgetAllowanceCents,
        };

        // Populate stages from tender statuses
        for (const tenderStatus of stakeholder.tenderStatuses) {
            const stageKey = tenderStatus.statusType as TenderStatus;
            if (status.stages[stageKey]) {
                status.stages[stageKey].isComplete = tenderStatus.isComplete ?? false;
                status.stages[stageKey].completedAt = tenderStatus.completedAt?.toISOString() ?? null;
            }
        }

        // Determine current stage (highest completed)
        const stageOrder: TenderStatus[] = ['award', 'rec', 'tender', 'brief'];
        for (const stage of stageOrder) {
            if (status.stages[stage].isComplete) {
                status.currentStage = stage;
                break;
            }
        }

        // Check if awarded and get firm details
        if (status.stages.award.isComplete && stakeholder.companyId) {
            status.awardedFirmId = stakeholder.companyId;
            status.awardedFirmName = stakeholder.companyName ?? stakeholder.name;

            // Add to awarded firms list
            awardedFirms.push({
                firmName: status.awardedFirmName,
                firmId: stakeholder.companyId,
                disciplineOrTrade: status.disciplineOrTrade,
                type: status.group,
                stakeholderId: stakeholder.id,
                stakeholderName: stakeholder.name,
                awardedValueCents: approvedContractCents,
                budgetAllowanceCents,
                varianceCents: approvedContractCents - budgetAllowanceCents,
            });
        }

        // Add to appropriate list
        if (stakeholder.stakeholderGroup === 'consultant') {
            consultants.push(status);
        } else if (stakeholder.stakeholderGroup === 'contractor') {
            contractors.push(status);
        }
    }

    // Calculate summary statistics
    const summary = calculateProcurementSummary(consultants, contractors);

    // Calculate period deltas if reporting period provided
    const deltas = reportingPeriod
        ? await calculateProcurementDeltas(projectId, reportingPeriod, stakeholderData)
        : createEmptyProcurementDeltas();

    return {
        projectId,
        projectName: projectData.name,
        reportingPeriod: reportingPeriod ?? null,
        generatedAt,
        procurementRoute,
        procurementRouteDisplay: getProcurementRouteDisplay(procurementRoute),
        consultants,
        contractors,
        summary,
        shortlistedFirms: shortlistedData,
        awardedFirms,
        deltas,
    };
}

/**
 * Fetch procurement route from profiler complexity data
 */
async function fetchProcurementRoute(projectId: string): Promise<string | null> {
    try {
        const profile = await db.query.projectProfiles.findFirst({
            where: eq(projectProfiles.projectId, projectId),
        });

        if (!profile?.complexity) {
            return null;
        }

        try {
            const complexityData = JSON.parse(profile.complexity);
            return complexityData.procurement_route ?? complexityData.procurementRoute ?? null;
        } catch {
            return null;
        }
    } catch (error) {
        console.error('[fetchProcurementContext] Error fetching procurement route:', error);
        return null;
    }
}

/**
 * Fetch all stakeholders with their tender statuses and company info
 */
async function fetchStakeholderTenderData(projectId: string): Promise<Array<{
    id: string;
    name: string;
    disciplineOrTrade: string | null;
    stakeholderGroup: string;
    isEnabled: boolean | null;
    companyId: string | null;
    companyName: string | null;
    tenderStatuses: Array<{
        statusType: string;
        isComplete: boolean | null;
        completedAt: Date | null;
    }>;
}>> {
    try {
        // Fetch stakeholders with their tender statuses
        const stakeholders = await db.query.projectStakeholders.findMany({
            where: and(
                eq(projectStakeholders.projectId, projectId),
                isNull(projectStakeholders.deletedAt),
                or(
                    eq(projectStakeholders.stakeholderGroup, 'consultant'),
                    eq(projectStakeholders.stakeholderGroup, 'contractor')
                )
            ),
            with: {
                tenderStatuses: true,
                company: true,
            },
        });

        return stakeholders.map(s => ({
            id: s.id,
            name: s.name,
            disciplineOrTrade: s.disciplineOrTrade,
            stakeholderGroup: s.stakeholderGroup,
            isEnabled: s.isEnabled,
            companyId: s.companyId,
            companyName: s.company?.name ?? null,
            tenderStatuses: s.tenderStatuses.map(t => ({
                statusType: t.statusType,
                isComplete: t.isComplete,
                completedAt: t.completedAt,
            })),
        }));
    } catch (error) {
        console.error('[fetchProcurementContext] Error fetching stakeholder tender data:', error);
        return [];
    }
}

/**
 * Fetch shortlisted firms from consultants and contractors tables
 */
async function fetchShortlistedFirms(projectId: string): Promise<ShortlistedFirm[]> {
    try {
        const shortlisted: ShortlistedFirm[] = [];

        // Fetch shortlisted consultants
        const shortlistedConsultants = await db.select()
            .from(consultants)
            .where(and(
                eq(consultants.projectId, projectId),
                eq(consultants.shortlisted, true)
            ));

        for (const c of shortlistedConsultants) {
            shortlisted.push({
                firmName: c.companyName,
                firmId: c.companyId,
                disciplineOrTrade: c.discipline,
                type: 'consultant',
                stakeholderId: c.id,
                stakeholderName: c.discipline,
            });
        }

        // Fetch shortlisted contractors
        const shortlistedContractors = await db.select()
            .from(contractors)
            .where(and(
                eq(contractors.projectId, projectId),
                eq(contractors.shortlisted, true)
            ));

        for (const c of shortlistedContractors) {
            shortlisted.push({
                firmName: c.companyName,
                firmId: c.companyId,
                disciplineOrTrade: c.trade,
                type: 'contractor',
                stakeholderId: c.id,
                stakeholderName: c.trade,
            });
        }

        return shortlisted;
    } catch (error) {
        console.error('[fetchProcurementContext] Error fetching shortlisted firms:', error);
        return [];
    }
}

/**
 * Fetch cost lines mapped by stakeholder ID
 */
async function fetchCostLinesByStakeholder(projectId: string): Promise<Map<string, {
    budgetCents: number;
    approvedContractCents: number;
}>> {
    try {
        const lines = await db.select({
            stakeholderId: costLines.stakeholderId,
            budgetCents: costLines.budgetCents,
            approvedContractCents: costLines.approvedContractCents,
        })
            .from(costLines)
            .where(and(
                eq(costLines.projectId, projectId),
                isNull(costLines.deletedAt)
            ));

        // Aggregate by stakeholder (sum all cost lines for each stakeholder)
        const map = new Map<string, { budgetCents: number; approvedContractCents: number }>();

        for (const line of lines) {
            if (!line.stakeholderId) continue;

            const existing = map.get(line.stakeholderId) ?? { budgetCents: 0, approvedContractCents: 0 };
            existing.budgetCents += line.budgetCents ?? 0;
            existing.approvedContractCents += line.approvedContractCents ?? 0;
            map.set(line.stakeholderId, existing);
        }

        return map;
    } catch (error) {
        console.error('[fetchProcurementContext] Error fetching cost lines by stakeholder:', error);
        return new Map();
    }
}

/**
 * Calculate procurement summary statistics
 */
function calculateProcurementSummary(
    consultants: StakeholderProcurementStatus[],
    contractors: StakeholderProcurementStatus[]
): ProcurementContext['summary'] {
    const consultantStats = { total: 0, briefed: 0, tendered: 0, recommended: 0, awarded: 0 };
    const contractorStats = { total: 0, briefed: 0, tendered: 0, recommended: 0, awarded: 0 };
    let totalBudgetCents = 0;
    let totalAwardedCents = 0;

    for (const c of consultants) {
        if (!c.isEnabled) continue;
        consultantStats.total++;
        if (c.stages.brief.isComplete) consultantStats.briefed++;
        if (c.stages.tender.isComplete) consultantStats.tendered++;
        if (c.stages.rec.isComplete) consultantStats.recommended++;
        if (c.stages.award.isComplete) {
            consultantStats.awarded++;
            totalAwardedCents += c.approvedContractCents;
        }
        totalBudgetCents += c.budgetAllowanceCents;
    }

    for (const c of contractors) {
        if (!c.isEnabled) continue;
        contractorStats.total++;
        if (c.stages.brief.isComplete) contractorStats.briefed++;
        if (c.stages.tender.isComplete) contractorStats.tendered++;
        if (c.stages.rec.isComplete) contractorStats.recommended++;
        if (c.stages.award.isComplete) {
            contractorStats.awarded++;
            totalAwardedCents += c.approvedContractCents;
        }
        totalBudgetCents += c.budgetAllowanceCents;
    }

    return {
        consultants: consultantStats,
        contractors: contractorStats,
        totalBudgetCents,
        totalAwardedCents,
        totalVarianceCents: totalAwardedCents - totalBudgetCents,
    };
}

/**
 * Calculate procurement deltas for the reporting period
 */
async function calculateProcurementDeltas(
    projectId: string,
    period: ReportingPeriod,
    stakeholderData: Awaited<ReturnType<typeof fetchStakeholderTenderData>>
): Promise<ProcurementDeltas> {
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);

    const { rftNew } = await import('../db/pg-schema');

    const newRftsIssued: ProcurementDeltas['newRftsIssued'] = [];
    const newAwards: ProcurementDeltas['newAwards'] = [];
    const stageTransitions: ProcurementDeltas['stageTransitions'] = [];

    try {
        // Fetch RFTs issued in period
        const rfts = await db.select({
            id: rftNew.id,
            stakeholderId: rftNew.stakeholderId,
            rftDate: rftNew.rftDate,
            createdAt: rftNew.createdAt,
        })
            .from(rftNew)
            .where(eq(rftNew.projectId, projectId));

        // Build stakeholder lookup
        const stakeholderMap = new Map(stakeholderData.map(s => [s.id, s]));

        for (const rft of rfts) {
            if (!rft.createdAt || !rft.stakeholderId) continue;

            const createdAt = new Date(rft.createdAt);
            if (createdAt >= periodStart && createdAt <= periodEnd) {
                const stakeholder = stakeholderMap.get(rft.stakeholderId);
                if (stakeholder) {
                    newRftsIssued.push({
                        stakeholderName: stakeholder.name,
                        disciplineOrTrade: stakeholder.disciplineOrTrade ?? 'General',
                        rftDate: rft.rftDate ?? createdAt.toISOString().split('T')[0],
                    });
                }
            }
        }

        // Check for awards and stage transitions in period
        for (const stakeholder of stakeholderData) {
            for (const status of stakeholder.tenderStatuses) {
                if (!status.completedAt) continue;

                const completedAt = new Date(status.completedAt);
                if (completedAt >= periodStart && completedAt <= periodEnd) {
                    // Track award specifically
                    if (status.statusType === 'award' && status.isComplete) {
                        newAwards.push({
                            stakeholderName: stakeholder.name,
                            disciplineOrTrade: stakeholder.disciplineOrTrade ?? 'General',
                            firmName: stakeholder.companyName ?? 'Unknown',
                            valueCents: 0, // Would need cost line lookup
                            awardedAt: completedAt.toISOString(),
                        });
                    }

                    // Track all stage transitions
                    const previousStage = getPreviousTenderStage(status.statusType);
                    stageTransitions.push({
                        stakeholderName: stakeholder.name,
                        disciplineOrTrade: stakeholder.disciplineOrTrade ?? 'General',
                        fromStage: previousStage ?? 'Not started',
                        toStage: status.statusType,
                        transitionedAt: completedAt.toISOString(),
                    });
                }
            }
        }
    } catch (error) {
        console.error('[fetchProcurementContext] Error calculating procurement deltas:', error);
    }

    return {
        newRftsIssued,
        newAwards,
        stageTransitions,
    };
}

/**
 * Get the previous tender stage
 */
function getPreviousTenderStage(currentStage: string): string | null {
    const stageOrder = ['brief', 'tender', 'rec', 'award'];
    const currentIndex = stageOrder.indexOf(currentStage);
    return currentIndex > 0 ? stageOrder[currentIndex - 1] : null;
}

/**
 * Create empty procurement deltas
 */
function createEmptyProcurementDeltas(): ProcurementDeltas {
    return {
        newRftsIssued: [],
        newAwards: [],
        stageTransitions: [],
    };
}

/**
 * Format Procurement Context as markdown for LLM prompt inclusion
 */
export function formatProcurementContextForPrompt(context: ProcurementContext): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Procurement Context
**Project:** ${context.projectName}
**Generated:** ${formatDate(context.generatedAt)}`);

    if (context.reportingPeriod) {
        sections.push(`**Reporting Period:** ${formatDate(context.reportingPeriod.start)} to ${formatDate(context.reportingPeriod.end)}`);
    }

    // Procurement Strategy
    sections.push(`
## Procurement Strategy
- **Route:** ${context.procurementRouteDisplay}`);

    // Summary Statistics
    const s = context.summary;
    sections.push(`
## Overview
### Consultants: ${s.consultants.awarded}/${s.consultants.total} Awarded
- Briefed: ${s.consultants.briefed}
- At Tender: ${s.consultants.tendered}
- Recommended: ${s.consultants.recommended}
- Awarded: ${s.consultants.awarded}

### Contractors: ${s.contractors.awarded}/${s.contractors.total} Awarded
- Briefed: ${s.contractors.briefed}
- At Tender: ${s.contractors.tendered}
- Recommended: ${s.contractors.recommended}
- Awarded: ${s.contractors.awarded}

### Budget Summary
- **Total Budget Allowance:** ${formatCurrency(s.totalBudgetCents)}
- **Total Awarded:** ${formatCurrency(s.totalAwardedCents)}
- **Variance:** ${formatCurrency(s.totalVarianceCents, true)}`);

    // Consultant Details
    if (context.consultants.length > 0) {
        sections.push(`
## Consultant Disciplines`);

        for (const c of context.consultants.filter(x => x.isEnabled)) {
            const stageDisplay = c.currentStage
                ? getTenderStatusDisplay(c.currentStage)
                : 'Not started';
            const awardInfo = c.awardedFirmName
                ? ` → ${c.awardedFirmName} (${formatCurrency(c.approvedContractCents)})`
                : '';
            sections.push(`- **${c.disciplineOrTrade}**: ${stageDisplay}${awardInfo}`);
        }
    }

    // Contractor Details
    if (context.contractors.length > 0) {
        sections.push(`
## Contractor Trades`);

        for (const c of context.contractors.filter(x => x.isEnabled)) {
            const stageDisplay = c.currentStage
                ? getTenderStatusDisplay(c.currentStage)
                : 'Not started';
            const awardInfo = c.awardedFirmName
                ? ` → ${c.awardedFirmName} (${formatCurrency(c.approvedContractCents)})`
                : '';
            sections.push(`- **${c.disciplineOrTrade}**: ${stageDisplay}${awardInfo}`);
        }
    }

    // Shortlisted Firms
    if (context.shortlistedFirms.length > 0) {
        sections.push(`
## Shortlisted Firms`);

        const byType = {
            consultant: context.shortlistedFirms.filter(f => f.type === 'consultant'),
            contractor: context.shortlistedFirms.filter(f => f.type === 'contractor'),
        };

        if (byType.consultant.length > 0) {
            sections.push(`**Consultants:**`);
            for (const f of byType.consultant) {
                sections.push(`- ${f.firmName} (${f.disciplineOrTrade})`);
            }
        }

        if (byType.contractor.length > 0) {
            sections.push(`**Contractors:**`);
            for (const f of byType.contractor) {
                sections.push(`- ${f.firmName} (${f.disciplineOrTrade})`);
            }
        }
    }

    // Awarded Firms
    if (context.awardedFirms.length > 0) {
        sections.push(`
## Awarded Contracts`);

        for (const f of context.awardedFirms) {
            const varianceStr = f.varianceCents !== 0
                ? ` (${formatCurrency(f.varianceCents, true)} vs budget)`
                : '';
            sections.push(`- **${f.disciplineOrTrade}**: ${f.firmName} - ${formatCurrency(f.awardedValueCents)}${varianceStr}`);
        }
    }

    // Period Deltas
    if (context.reportingPeriod) {
        const d = context.deltas;
        const hasDeltas = d.newRftsIssued.length > 0 || d.newAwards.length > 0 || d.stageTransitions.length > 0;

        if (hasDeltas) {
            sections.push(`
## Period Changes`);

            if (d.newRftsIssued.length > 0) {
                sections.push(`**RFTs Issued:**`);
                for (const rft of d.newRftsIssued) {
                    sections.push(`- ${rft.disciplineOrTrade}: ${formatDate(rft.rftDate)}`);
                }
            }

            if (d.newAwards.length > 0) {
                sections.push(`**New Awards:**`);
                for (const award of d.newAwards) {
                    sections.push(`- ${award.disciplineOrTrade}: ${award.firmName}`);
                }
            }

            if (d.stageTransitions.length > 0) {
                sections.push(`**Stage Transitions:**`);
                for (const t of d.stageTransitions) {
                    sections.push(`- ${t.disciplineOrTrade}: ${t.fromStage} → ${t.toStage}`);
                }
            }
        } else {
            sections.push(`
## Period Changes
No significant procurement changes during this reporting period.`);
        }
    }

    return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
