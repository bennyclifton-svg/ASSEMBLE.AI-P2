// src/lib/context/modules/program.ts
// Program module fetcher - extracts from programActivities and programMilestones

import { db } from '@/lib/db';
import { programActivities, programMilestones } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProgramData {
  totalActivities: number;
  completedActivities: number;
  percentComplete: number;
  activities: ProgramActivityData[];
  milestones: ProgramMilestoneData[];
  nextMilestone: ProgramMilestoneData | null;
}

export interface ProgramActivityData {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  masterStage: string | null;
}

export interface ProgramMilestoneData {
  id: string;
  name: string;
  date: string;
  activityId: string | null;
  activityName: string | null;
  daysUntil: number;
}

export async function fetchProgram(
  projectId: string
): Promise<ModuleResult<ProgramData>> {
  try {
    // Fetch activities and milestones in parallel
    const activities = await db
      .select()
      .from(programActivities)
      .where(eq(programActivities.projectId, projectId));

    // Build activity lookup for milestone enrichment
    const activityMap = new Map<string, string>();
    for (const a of activities) {
      activityMap.set(a.id, a.name ?? '');
    }

    // Milestones don't have projectId directly - they're linked via activityId.
    // Fetch all milestones for activities belonging to this project.
    const activityIds = activities.map((a) => a.id);
    let milestones: (typeof programMilestones.$inferSelect)[] = [];

    if (activityIds.length > 0) {
      const allMilestones = await db.select().from(programMilestones);
      milestones = allMilestones.filter(
        (m) => m.activityId && activityIds.includes(m.activityId)
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityData: ProgramActivityData[] = activities.map((a) => ({
      id: a.id,
      name: a.name ?? '',
      startDate: a.startDate ?? null,
      endDate: a.endDate ?? null,
      masterStage: a.masterStage ?? null,
    }));

    const milestoneData: ProgramMilestoneData[] = milestones.map((m) => {
      const mDate = new Date(m.date ?? today.toISOString());
      const daysUntil = Math.ceil(
        (mDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: m.id,
        name: m.name ?? '',
        date: mDate.toISOString(),
        activityId: m.activityId ?? null,
        activityName: m.activityId ? (activityMap.get(m.activityId) ?? null) : null,
        daysUntil,
      };
    });

    // Sort milestones by date, find next upcoming
    const upcomingMilestones = milestoneData
      .filter((m) => m.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // Estimate completion based on activities with end dates in the past
    const completedCount = activityData.filter((a) => {
      if (!a.endDate) return false;
      return new Date(a.endDate) < today;
    }).length;

    const totalPercent =
      activityData.length > 0
        ? Math.round((completedCount / activityData.length) * 100)
        : 0;

    const data: ProgramData = {
      totalActivities: activityData.length,
      completedActivities: completedCount,
      percentComplete: totalPercent,
      activities: activityData,
      milestones: milestoneData,
      nextMilestone: upcomingMilestones[0] ?? null,
    };

    const estimatedTokens =
      20 + activityData.length * 12 + milestoneData.length * 8;

    return { moduleName: 'program', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'program',
      success: false,
      data: {} as ProgramData,
      error: `Program fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
