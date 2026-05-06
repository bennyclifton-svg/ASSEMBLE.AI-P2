/**
 * Database Client
 * PostgreSQL only - no SQLite fallback
 */

import * as pgSchema from './pg-schema';
import * as authSchema from './auth-schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (!connectionString) {
    throw new Error(
        'DATABASE_URL or SUPABASE_POSTGRES_URL environment variable is required.\n' +
        'For local development, run: npm run db:up'
    );
}

const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema: pgSchema });
export type Database = typeof db;
export const schema = pgSchema;

// Re-export tables from pgSchema
export const {
    categories,
    subcategories,
    categoryVisibility,
    documents,
    fileAssets,
    versions,
    transmittals,
    transmittalItems,
    projectInboxes,
    correspondenceThreads,
    correspondence,
    correspondenceAttachments,
    projects,
    projectDetails,
    projectObjectives,
    projectStages,
    risks,
    stakeholders,
    consultantDisciplines,
    consultantStatuses,
    contractorTrades,
    contractorStatuses,
    disciplineFeeItems,
    tradePriceItems,
    revisionHistory,
    gisCache,
    consultants,
    contractors,
    companies,
    costLines,
    costLineAllocations,
    variations,
    invoices,
    costLineComments,
    projectSnapshots,
    importTemplates,
    organizations,
    users,
    sessions,
    loginAttempts,
    subscriptions,
    knowledgeLibraries,
    libraryDocuments,
    addenda,
    addendumTransmittals,
    rftNew,
    rftNewTransmittals,
    evaluations,
    tenderSubmissions,
    evaluationPrice,
    evaluationRows,
    evaluationCells,
    evaluationNonPriceCriteria,
    evaluationNonPriceCells,
    trr,
    trrTransmittals,
    programActivities,
    programDependencies,
    programMilestones,
    programActivityExpectedOutputs,
    programActivityEvidenceLinks,
    projectProfiles,
    profilerObjectives,
    objectivesTransmittals,
    profilePatterns,
    projectStakeholders,
    stakeholderTenderStatuses,
    stakeholderSubmissionStatuses,
    notes,
    noteTransmittals,
    meetings,
    meetingSections,
    meetingAttendees,
    meetingTransmittals,
    meetingGroups,
    reports,
    reportGroups,
    reportSections,
    reportAttendees,
    reportTransmittals,
    // Demo requests / leads
    demoRequests,
    // Billing tables (Phase 5)
    products,
    transactions,
    // Agents / Chat (Phase 1 of agent integration plan)
    chatThreads,
    chatMessages,
    agentRuns,
    toolCalls,
    // Approval gate (Phase 3 of agent integration plan)
    approvals,
    // Unified action surface
    actionInvocations,
} = pgSchema;

// Re-export Better Auth schema tables
export const {
    user,
    session,
    account,
    verification,
    polarCustomer,
    polarSubscription,
} = authSchema;
