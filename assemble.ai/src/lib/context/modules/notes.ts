// src/lib/context/modules/notes.ts
// Starred notes module fetcher - extracts from notes table

import { db } from '@/lib/db';
import { notes } from '@/lib/db/pg-schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { ModuleResult, ReportingPeriod } from '../types';

export interface StarredNotesData {
  notes: StarredNoteEntry[];
  totalCount: number;
}

export interface StarredNoteEntry {
  id: string;
  title: string;
  content: string | null;
  createdAt: string | null;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
}

export interface StarredNotesFetchParams {
  reportingPeriod?: ReportingPeriod;
}

export async function fetchStarredNotes(
  projectId: string,
  params?: StarredNotesFetchParams
): Promise<ModuleResult<StarredNotesData>> {
  try {
    const starredNotes = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.projectId, projectId),
          eq(notes.isStarred, true),
          isNull(notes.deletedAt)
        )
      );

    let filteredNotes = starredNotes;

    // Filter by reporting period if provided
    if (params?.reportingPeriod) {
      const periodStart = new Date(params.reportingPeriod.start);
      const periodEnd = new Date(params.reportingPeriod.end);

      filteredNotes = starredNotes.filter((n) => {
        if (!n.createdAt) return true; // Include notes without dates
        const noteDate = new Date(n.createdAt);
        return noteDate >= periodStart && noteDate <= periodEnd;
      });
    }

    const noteEntries: StarredNoteEntry[] = filteredNotes.map((n) => ({
      id: n.id,
      title: n.title ?? 'Untitled',
      content: n.content ?? null,
      createdAt: n.createdAt ?? null,
      reportingPeriodStart: n.reportingPeriodStart ?? null,
      reportingPeriodEnd: n.reportingPeriodEnd ?? null,
    }));

    const data: StarredNotesData = {
      notes: noteEntries,
      totalCount: noteEntries.length,
    };

    // Token estimate: ~15 base + ~30 per note (title + content summary)
    const estimatedTokens = 15 + noteEntries.length * 30;

    return {
      moduleName: 'starredNotes',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'starredNotes',
      success: false,
      data: {} as StarredNotesData,
      error: `Starred notes fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
