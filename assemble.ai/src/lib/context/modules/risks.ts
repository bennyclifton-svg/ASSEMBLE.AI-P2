// src/lib/context/modules/risks.ts
// Risks module fetcher - extracts from risks table

import { db } from '@/lib/db';
import { risks } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface RisksData {
  totalCount: number;
  byStatus: { identified: number; mitigated: number; closed: number };
  bySeverity: { high: number; medium: number; low: number };
  topActiveRisks: Array<{
    id: string;
    title: string;
    description: string | null;
    likelihood: string | null;
    impact: string | null;
    mitigation: string | null;
    status: string;
    severity: string;
  }>;
}

function calculateSeverity(
  likelihood: string | null,
  impact: string | null
): string {
  const likelihoodScore =
    { high: 3, medium: 2, low: 1 }[likelihood ?? 'low'] ?? 1;
  const impactScore = { high: 3, medium: 2, low: 1 }[impact ?? 'low'] ?? 1;
  const score = likelihoodScore * impactScore;
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export async function fetchRisks(
  projectId: string
): Promise<ModuleResult<RisksData>> {
  try {
    const riskRows = await db
      .select()
      .from(risks)
      .where(eq(risks.projectId, projectId));

    const byStatus = { identified: 0, mitigated: 0, closed: 0 };
    const bySeverity = { high: 0, medium: 0, low: 0 };

    const enrichedRisks = riskRows.map((r) => {
      const status = (r.status ?? 'identified') as keyof typeof byStatus;
      const severity = calculateSeverity(r.likelihood, r.impact);

      if (byStatus[status] !== undefined) byStatus[status]++;
      if (bySeverity[severity as keyof typeof bySeverity] !== undefined) {
        bySeverity[severity as keyof typeof bySeverity]++;
      }

      return {
        id: r.id,
        title: r.title ?? '',
        description: r.description ?? null,
        likelihood: r.likelihood ?? null,
        impact: r.impact ?? null,
        mitigation: r.mitigation ?? null,
        status,
        severity,
      };
    });

    // Top active risks: identified or mitigated, sorted by severity
    const activeRisks = enrichedRisks
      .filter((r) => r.status !== 'closed')
      .sort((a, b) => {
        const severityOrder: Record<string, number> = {
          high: 0,
          medium: 1,
          low: 2,
        };
        return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
      });

    const data: RisksData = {
      totalCount: riskRows.length,
      byStatus,
      bySeverity,
      topActiveRisks: activeRisks.slice(0, 10),
    };

    const estimatedTokens = 15 + activeRisks.length * 20;

    return { moduleName: 'risks', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'risks',
      success: false,
      data: {} as RisksData,
      error: `Risks fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
