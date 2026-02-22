// src/lib/context/modules/procurement-docs.ts
// Procurement documents module - fetches RFT, addenda, TRR, and evaluation documents
// Migrated logic from src/lib/services/ai-content-generation.ts:146-262

import { db } from '@/lib/db';
import {
  rftNew,
  addenda,
  trr,
  evaluations,
  projectStakeholders,
} from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult, ReportingPeriod } from '../types';

export interface ProcurementDocsData {
  documents: ProcurementDocEntry[];
  summary: {
    rftCount: number;
    addendumCount: number;
    trrCount: number;
    evaluationCount: number;
    totalCount: number;
  };
}

export interface ProcurementDocEntry {
  id: string;
  type: 'rft' | 'addendum' | 'trr' | 'evaluation';
  stakeholderName: string | null;
  date: string | null;
  content?: string;
}

export interface ProcurementDocsFetchParams {
  reportingPeriod?: ReportingPeriod;
}

/**
 * Check if a document date falls within the reporting period.
 * Include the document if there is no period or no date.
 */
function shouldIncludeDocument(
  date: string | null,
  period: ReportingPeriod | undefined
): boolean {
  if (!period || !date) return true;
  return date >= period.start && date <= period.end;
}

export async function fetchProcurementDocs(
  projectId: string,
  params?: ProcurementDocsFetchParams
): Promise<ModuleResult<ProcurementDocsData>> {
  const period = params?.reportingPeriod;

  try {
    // Build a stakeholder name lookup map
    const stakeholderRows = await db
      .select({ id: projectStakeholders.id, name: projectStakeholders.name })
      .from(projectStakeholders)
      .where(eq(projectStakeholders.projectId, projectId));

    const stakeholderMap = new Map<string, string | null>();
    for (const row of stakeholderRows) {
      stakeholderMap.set(row.id, row.name ?? null);
    }

    function getStakeholderName(stakeholderId: string | null): string | null {
      if (!stakeholderId) return null;
      return stakeholderMap.get(stakeholderId) ?? null;
    }

    const documents: ProcurementDocEntry[] = [];

    // Fetch RFT documents
    const rftRows = await db
      .select({
        id: rftNew.id,
        rftDate: rftNew.rftDate,
        stakeholderId: rftNew.stakeholderId,
      })
      .from(rftNew)
      .where(eq(rftNew.projectId, projectId));

    for (const row of rftRows) {
      const date = row.rftDate ? String(row.rftDate) : null;
      if (!shouldIncludeDocument(date, period)) continue;
      documents.push({
        id: row.id,
        type: 'rft',
        stakeholderName: getStakeholderName(row.stakeholderId ?? null),
        date,
      });
    }

    // Fetch addenda
    const addendaRows = await db
      .select({
        id: addenda.id,
        addendumDate: addenda.addendumDate,
        stakeholderId: addenda.stakeholderId,
        content: addenda.content,
      })
      .from(addenda)
      .where(eq(addenda.projectId, projectId));

    for (const row of addendaRows) {
      const date = row.addendumDate ? String(row.addendumDate) : null;
      if (!shouldIncludeDocument(date, period)) continue;
      documents.push({
        id: row.id,
        type: 'addendum',
        stakeholderName: getStakeholderName(row.stakeholderId ?? null),
        date,
        content: row.content ?? undefined,
      });
    }

    // Fetch TRR documents
    const trrRows = await db
      .select({
        id: trr.id,
        reportDate: trr.reportDate,
        stakeholderId: trr.stakeholderId,
        executiveSummary: trr.executiveSummary,
        recommendation: trr.recommendation,
      })
      .from(trr)
      .where(eq(trr.projectId, projectId));

    for (const row of trrRows) {
      const date = row.reportDate ? String(row.reportDate) : null;
      if (!shouldIncludeDocument(date, period)) continue;
      const contentParts: string[] = [];
      if (row.executiveSummary) contentParts.push(row.executiveSummary);
      if (row.recommendation) contentParts.push(row.recommendation);
      documents.push({
        id: row.id,
        type: 'trr',
        stakeholderName: getStakeholderName(row.stakeholderId ?? null),
        date,
        content: contentParts.length > 0 ? contentParts.join('\n') : undefined,
      });
    }

    // Fetch evaluation documents
    const evaluationRows = await db
      .select({
        id: evaluations.id,
        stakeholderId: evaluations.stakeholderId,
        updatedAt: evaluations.updatedAt,
      })
      .from(evaluations)
      .where(eq(evaluations.projectId, projectId));

    for (const row of evaluationRows) {
      const date = row.updatedAt ? String(row.updatedAt) : null;
      if (!shouldIncludeDocument(date, period)) continue;
      documents.push({
        id: row.id,
        type: 'evaluation',
        stakeholderName: getStakeholderName(row.stakeholderId ?? null),
        date,
      });
    }

    const rftCount = documents.filter((d) => d.type === 'rft').length;
    const addendumCount = documents.filter((d) => d.type === 'addendum').length;
    const trrCount = documents.filter((d) => d.type === 'trr').length;
    const evaluationCount = documents.filter(
      (d) => d.type === 'evaluation'
    ).length;
    const totalCount = documents.length;

    const data: ProcurementDocsData = {
      documents,
      summary: {
        rftCount,
        addendumCount,
        trrCount,
        evaluationCount,
        totalCount,
      },
    };

    const estimatedTokens = 20 + totalCount * 25;

    return {
      moduleName: 'procurementDocs',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'procurementDocs',
      success: false,
      data: {
        documents: [],
        summary: {
          rftCount: 0,
          addendumCount: 0,
          trrCount: 0,
          evaluationCount: 0,
          totalCount: 0,
        },
      },
      error: `Procurement docs fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
