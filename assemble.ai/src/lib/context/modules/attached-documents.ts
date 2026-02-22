// src/lib/context/modules/attached-documents.ts
// Fetches documents attached to a note via transmittals.
// Migrated from src/lib/services/note-content-generation.ts:61-121

import type { ModuleResult } from '../types';
import { db } from '@/lib/db';
import {
  noteTransmittals,
  documents,
  versions,
  fileAssets,
} from '@/lib/db/pg-schema';
import { eq, inArray } from 'drizzle-orm';

export interface AttachedDocumentsData {
  documents: AttachedDocumentEntry[];
  totalCount: number;
  documentIds: string[];
}

export interface AttachedDocumentEntry {
  id: string;
  documentId: string;
  documentName: string;
  categoryName: string | null;
}

export interface AttachedDocumentsFetchParams {
  noteId?: string;
}

export async function fetchAttachedDocuments(
  projectId: string,
  params?: AttachedDocumentsFetchParams
): Promise<ModuleResult<AttachedDocumentsData>> {
  if (!params?.noteId) {
    return {
      moduleName: 'attachedDocuments',
      success: true,
      data: {
        documents: [],
        totalCount: 0,
        documentIds: [],
      },
      estimatedTokens: 0,
    };
  }

  const noteId = params.noteId;

  try {
    // Step 1: Query noteTransmittals for documentIds attached to the note
    const transmittals = await db
      .select({
        id: noteTransmittals.id,
        documentId: noteTransmittals.documentId,
      })
      .from(noteTransmittals)
      .where(eq(noteTransmittals.noteId, noteId));

    if (transmittals.length === 0) {
      return {
        moduleName: 'attachedDocuments',
        success: true,
        data: {
          documents: [],
          totalCount: 0,
          documentIds: [],
        },
        estimatedTokens: 10,
      };
    }

    const documentIds = transmittals.map((t) => t.documentId);

    // Step 2: Query documents for categoryId
    const docs = await db
      .select({
        id: documents.id,
        categoryId: documents.categoryId,
      })
      .from(documents)
      .where(inArray(documents.id, documentIds));

    // Step 3: Query versions for file asset IDs
    const docVersions = await db
      .select({
        documentId: versions.documentId,
        fileAssetId: versions.fileAssetId,
      })
      .from(versions)
      .where(inArray(versions.documentId, documentIds));

    // Step 4: Query fileAssets for original file names
    const fileAssetIds = docVersions
      .map((v) => v.fileAssetId)
      .filter(Boolean) as string[];

    const assets =
      fileAssetIds.length > 0
        ? await db
            .select({
              id: fileAssets.id,
              originalName: fileAssets.originalName,
            })
            .from(fileAssets)
            .where(inArray(fileAssets.id, fileAssetIds))
        : [];

    // Build lookup maps
    const assetMap = new Map(assets.map((a) => [a.id, a.originalName]));
    const versionMap = new Map(
      docVersions.map((v) => [v.documentId, v.fileAssetId])
    );

    const entries: AttachedDocumentEntry[] = docs.map((doc) => ({
      id: doc.id,
      documentId: doc.id,
      documentName:
        assetMap.get(versionMap.get(doc.id) ?? '') ?? 'Unknown Document',
      categoryName: doc.categoryId ?? null,
    }));

    const data: AttachedDocumentsData = {
      documents: entries,
      totalCount: entries.length,
      documentIds,
    };

    // Token estimate: 10 base + 8 per entry
    const estimatedTokens = 10 + entries.length * 8;

    return {
      moduleName: 'attachedDocuments',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'attachedDocuments',
      success: false,
      data: {
        documents: [],
        totalCount: 0,
        documentIds: [],
      },
      error: `Attached documents fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
