// src/lib/context/modules/briefing-project.ts
// Briefing project-context module for the AI-led brief refinement interview.

import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  briefAttachments,
  categories,
  documents,
  fileAssets,
  projectDetails,
  projectProfiles,
  subcategories,
  versions,
} from '@/lib/db/pg-schema';
import { projectObjectives } from '@/lib/db/objectives-schema';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import { documentSetMembers } from '@/lib/db/rag-schema';
import { ragDb } from '@/lib/db/rag-client';
import type { ModuleResult } from '../types';

export interface BriefingProfileData {
  id: string;
  buildingClass: string;
  projectType: string;
  subclass: string[];
  subclassOther: string[];
  scaleData: Record<string, unknown>;
  complexity: Record<string, unknown>;
  workScope: string[];
  complexityScore: number | null;
  region: string | null;
}

export type BriefingProjectDetailsData = typeof projectDetails.$inferSelect;

export interface BriefingObjectiveData {
  id: string;
  objectiveType: ObjectiveType;
  text: string;
  status: string;
  source: string;
  sortOrder: number | null;
}

export interface BriefingDocumentMetadata {
  attachmentId: string;
  documentId: string;
  title: string;
  type: string | null;
  pageCount: number | null;
  ocrStatus: string | null;
  ragStatus: string | null;
  attachedAt: string | Date | null;
}

export interface BriefingProjectData {
  profile: BriefingProfileData | null;
  projectDetails: BriefingProjectDetailsData | null;
  objectives: BriefingObjectiveData[];
  attachments: BriefingDocumentMetadata[];
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function getRagStatuses(documentIds: string[]): Promise<Map<string, string>> {
  const statuses = new Map<string, string>();
  if (documentIds.length === 0) return statuses;

  try {
    const rows = await ragDb
      .select({
        documentId: documentSetMembers.documentId,
        syncStatus: documentSetMembers.syncStatus,
      })
      .from(documentSetMembers)
      .where(inArray(documentSetMembers.documentId, documentIds));

    const rank: Record<string, number> = {
      synced: 4,
      processing: 3,
      pending: 2,
      failed: 1,
    };

    for (const row of rows) {
      const next = row.syncStatus ?? 'pending';
      const current = statuses.get(row.documentId);
      if (!current || (rank[next] ?? 0) > (rank[current] ?? 0)) {
        statuses.set(row.documentId, next);
      }
    }
  } catch {
    return statuses;
  }

  return statuses;
}

export async function fetchBriefingAttachments(
  projectId: string
): Promise<BriefingDocumentMetadata[]> {
  const rows = await db
    .select({
      attachmentId: briefAttachments.id,
      documentId: briefAttachments.documentId,
      attachedAt: briefAttachments.attachedAt,
      originalName: fileAssets.originalName,
      drawingName: fileAssets.drawingName,
      mimeType: fileAssets.mimeType,
      ocrStatus: fileAssets.ocrStatus,
      categoryName: categories.name,
      subcategoryName: subcategories.name,
    })
    .from(briefAttachments)
    .innerJoin(documents, eq(briefAttachments.documentId, documents.id))
    .leftJoin(versions, eq(documents.latestVersionId, versions.id))
    .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
    .leftJoin(categories, eq(documents.categoryId, categories.id))
    .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
    .where(eq(briefAttachments.projectId, projectId))
    .orderBy(asc(briefAttachments.attachedAt));

  const ragStatuses = await getRagStatuses(rows.map((row) => row.documentId));

  return rows.map((row) => ({
    attachmentId: row.attachmentId,
    documentId: row.documentId,
    title: row.drawingName ?? row.originalName ?? 'Untitled document',
    type: row.subcategoryName ?? row.categoryName ?? row.mimeType ?? null,
    pageCount: null,
    ocrStatus: row.ocrStatus ?? null,
    ragStatus: ragStatuses.get(row.documentId) ?? null,
    attachedAt: row.attachedAt,
  }));
}

export async function fetchBriefingProject(
  projectId: string
): Promise<ModuleResult<BriefingProjectData>> {
  try {
    const [profileRows, detailsRows, objectives, attachments] = await Promise.all([
      db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.projectId, projectId))
        .limit(1),
      db
        .select()
        .from(projectDetails)
        .where(eq(projectDetails.projectId, projectId))
        .limit(1),
      db
        .select({
          id: projectObjectives.id,
          objectiveType: projectObjectives.objectiveType,
          text: projectObjectives.text,
          status: projectObjectives.status,
          source: projectObjectives.source,
          sortOrder: projectObjectives.sortOrder,
        })
        .from(projectObjectives)
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.isDeleted, false)
          )
        )
        .orderBy(
          asc(projectObjectives.objectiveType),
          asc(projectObjectives.sortOrder)
        ),
      fetchBriefingAttachments(projectId),
    ]);

    const profile = profileRows[0] ?? null;
    const data: BriefingProjectData = {
      profile: profile
        ? {
            id: profile.id,
            buildingClass: profile.buildingClass,
            projectType: profile.projectType,
            subclass: parseJson(profile.subclass, []),
            subclassOther: parseJson(profile.subclassOther, []),
            scaleData: parseJson(profile.scaleData, {}),
            complexity: parseJson(profile.complexity, {}),
            workScope: parseJson(profile.workScope, []),
            complexityScore: profile.complexityScore,
            region: profile.region,
          }
        : null,
      projectDetails: detailsRows[0] ?? null,
      objectives,
      attachments,
    };

    const estimatedTokens =
      50 + objectives.length * 20 + attachments.length * 12;

    return {
      moduleName: 'briefingProject',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'briefingProject',
      success: false,
      data: {
        profile: null,
        projectDetails: null,
        objectives: [],
        attachments: [],
      },
      error: `Briefing project context fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
