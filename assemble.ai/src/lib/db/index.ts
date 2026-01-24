/**
 * Database Client
 * Uses PostgreSQL in production, SQLite in development
 */

import * as sqliteSchema from './schema';
import * as pgSchema from './pg-schema';

// Determine which database to use based on environment
export const usePostgres = !!(process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL);

// Export unified database instance
export const db = usePostgres
    ? (() => {
        // PostgreSQL for production
        const { drizzle } = require('drizzle-orm/node-postgres');
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        return drizzle(pool, { schema: pgSchema });
    })()
    : (() => {
        // SQLite for development
        try {
            const { drizzle } = require('drizzle-orm/better-sqlite3');
            const Database = require('better-sqlite3');
            console.log('[DB] Initializing SQLite database: sqlite.db');
            const sqlite = new Database('sqlite.db');
            sqlite.pragma('foreign_keys = ON');
            console.log('[DB] SQLite database initialized successfully');
            return drizzle(sqlite, { schema: sqliteSchema });
        } catch (error) {
            console.error('[DB] Failed to initialize SQLite database:', error);
            throw error;
        }
    })();

// Export the database type for TypeScript
export type Database = typeof db;

// Re-export the correct schema based on database type
// This ensures API routes use the right table definitions
export const schema = usePostgres ? pgSchema : sqliteSchema;

// Export individual tables for convenience (uses correct schema automatically)
export const {
    categories,
    subcategories,
    documents,
    fileAssets,
    versions,
    transmittals,
    transmittalItems,
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
    evaluationRows,
    evaluationCells,
    evaluationNonPriceCriteria,
    evaluationNonPriceCells,
    trr,
    trrTransmittals,
    programActivities,
    programDependencies,
    programMilestones,
    projectProfiles,
    profilerObjectives,
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
    reports,
    reportSections,
    reportAttendees,
    reportTransmittals,
} = usePostgres ? pgSchema : sqliteSchema;
