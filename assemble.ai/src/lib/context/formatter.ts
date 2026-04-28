// src/lib/context/formatter.ts
// Token-budget-aware formatting with three tiers (summary/standard/detailed)

import type {
  ModuleResult,
  ModuleRequirement,
  FormattingTier,
  ModuleName,
} from './types';
import type { ProfileData } from './modules/profile';
import type { CostPlanData, CostLineData } from './modules/cost-plan';
import type { ProgramData } from './modules/program';
import type { RisksData } from './modules/risks';
import type { ProcurementData } from './modules/procurement';
import type { StakeholdersData } from './modules/stakeholders';
import type { StarredNotesData } from './modules/notes';
import type { RagDocumentsData } from './modules/documents';
import type { PlanningCardData } from './modules/planning-card';
import type { ProjectInfoData } from './modules/project-info';
import type { ProcurementDocsData } from './modules/procurement-docs';
import type { AttachedDocumentsData } from './modules/attached-documents';

/**
 * Maximum total tokens for all module context combined.
 * Budget ~8k for project context to leave room for system prompt,
 * RAG results, user content, and generation output.
 */
const MAX_CONTEXT_TOKENS = 8000;

// ── Currency Formatting ─────────────────────────────────────────────

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(dollars));
}

// ── Tier Selection ──────────────────────────────────────────────────

const TIER_TOKEN_ESTIMATES: Record<FormattingTier, number> = {
  summary: 200,
  standard: 500,
  detailed: 1000,
};

/**
 * Determine formatting tier for each module based on priority and total module count.
 */
export function assignTiers(
  requirements: ModuleRequirement[],
  fetchedModules: Map<ModuleName, ModuleResult>
): Map<ModuleName, FormattingTier> {
  const tiers = new Map<ModuleName, FormattingTier>();
  const sortedByPriority = [...requirements].sort(
    (a, b) => b.priority - a.priority
  );
  const moduleCount = fetchedModules.size;

  for (const req of sortedByPriority) {
    if (!fetchedModules.has(req.module)) continue;

    if (req.priority >= 8 && moduleCount <= 4) {
      tiers.set(req.module, 'detailed');
    } else if (req.priority >= 5 || req.level === 'required') {
      tiers.set(req.module, 'standard');
    } else {
      tiers.set(req.module, 'summary');
    }
  }

  // Validate total doesn't exceed budget - downgrade lowest-priority if needed
  let estimatedTotal = 0;
  for (const [, tier] of tiers) {
    estimatedTotal += TIER_TOKEN_ESTIMATES[tier];
  }

  if (estimatedTotal > MAX_CONTEXT_TOKENS) {
    const reverseOrder = [...sortedByPriority].reverse();
    for (const req of reverseOrder) {
      if (estimatedTotal <= MAX_CONTEXT_TOKENS) break;
      const currentTier = tiers.get(req.module);
      if (currentTier === 'detailed') {
        tiers.set(req.module, 'standard');
        estimatedTotal -= 500;
      } else if (currentTier === 'standard') {
        tiers.set(req.module, 'summary');
        estimatedTotal -= 300;
      }
    }
  }

  return tiers;
}

// ── Module Formatting ───────────────────────────────────────────────

/**
 * Format a module's data at the specified tier.
 */
export function formatModule(
  moduleName: ModuleName,
  data: unknown,
  tier: FormattingTier
): string {
  switch (moduleName) {
    case 'profile':
      return formatProfile(data as ProfileData | null, tier);
    case 'costPlan':
    case 'variations':
    case 'invoices':
      return formatCostPlan(data as CostPlanData, tier);
    case 'program':
    case 'milestones':
      return formatProgram(data as ProgramData, tier);
    case 'risks':
      return formatRisks(data as RisksData, tier);
    case 'procurement':
      return formatProcurement(data as ProcurementData, tier);
    case 'stakeholders':
      return formatStakeholders(data as StakeholdersData, tier);
    case 'starredNotes':
      return formatNotes(data as StarredNotesData, tier);
    case 'ragDocuments':
      return formatRagDocuments(data as RagDocumentsData, tier);
    case 'planningCard':
      return formatPlanningCard(data as PlanningCardData | null, tier);
    case 'projectInfo':
      return formatProjectInfo(data as ProjectInfoData, tier);
    case 'procurementDocs':
      return formatProcurementDocs(data as ProcurementDocsData, tier);
    case 'attachedDocuments':
      return formatAttachedDocuments(data as AttachedDocumentsData, tier);
    default:
      return '';
  }
}

// ── Project Summary ─────────────────────────────────────────────────

/**
 * Format a one-paragraph project summary from profile and project data.
 */
export function formatProjectSummary(
  projectId: string,
  modules: Map<ModuleName, ModuleResult>
): string {
  const profileResult = modules.get('profile');
  const profile = profileResult?.success
    ? (profileResult.data as ProfileData | null)
    : null;

  if (!profile) {
    return `Project ${projectId}. Project type not yet configured.`;
  }

  const parts: string[] = [];

  if (profile.buildingClassDisplay) {
    parts.push(`${profile.buildingClassDisplay} project`);
  }
  if (profile.projectTypeDisplay) {
    parts.push(`(${profile.projectTypeDisplay})`);
  }
  if (profile.subclass.length > 0) {
    parts.push(`- ${profile.subclass.join(', ')}`);
  }
  if (profile.gfaSqm) {
    parts.push(`| ${profile.gfaSqm.toLocaleString()} sqm GFA`);
  }
  if (profile.storeys) {
    parts.push(`| ${profile.storeys} storeys`);
  }
  if (profile.qualityTier) {
    parts.push(`| ${profile.qualityTier} quality`);
  }
  if (profile.region) {
    parts.push(`| Region: ${profile.region}`);
  }

  return parts.join(' ') || `Project ${projectId}`;
}

// ── Individual Format Functions ─────────────────────────────────────

function formatProfile(
  data: ProfileData | null,
  tier: FormattingTier
): string {
  if (!data) return '## Project Profile\nNot yet configured.';

  if (tier === 'summary') {
    const summaryParts = [
      `## Project Profile`,
      `${data.buildingClassDisplay} | ${data.projectTypeDisplay} | ` +
        `${data.region}${data.gfaSqm ? ` | ${data.gfaSqm} sqm` : ''}` +
        (data.workScope.length > 0 ? ` | ${data.workScope.length} work scope items` : ''),
    ];
    return summaryParts.join('\n');
  }

  const lines = [
    `## Project Profile`,
    `| Attribute | Value |`,
    `|-----------|-------|`,
    `| Building Class | ${data.buildingClassDisplay} |`,
    `| Project Type | ${data.projectTypeDisplay} |`,
    `| Subclass | ${data.subclass.join(', ') || 'N/A'} |`,
    `| GFA | ${data.gfaSqm ? `${data.gfaSqm.toLocaleString()} sqm` : 'N/A'} |`,
    `| Storeys | ${data.storeys ?? 'N/A'} |`,
    `| Quality Tier | ${data.qualityTier ?? 'N/A'} |`,
    `| Complexity Score | ${data.complexityScore ?? 'N/A'} |`,
    `| Procurement Route | ${data.procurementRoute ?? 'N/A'} |`,
    `| Region | ${data.region} |`,
  ];

  // Add work scope section at standard and detailed tiers
  if (data.workScope.length > 0) {
    lines.push(`\n### Work Scope`);
    lines.push(`- ${data.workScope.join(', ')}`);
  }

  // Add complexity dimensions at standard and detailed tiers
  const complexityEntries = Object.entries(data.complexity);
  if (complexityEntries.length > 0) {
    lines.push(`\n### Complexity`);
    lines.push(`| Dimension | Value |`);
    lines.push(`|-----------|-------|`);
    for (const [key, value] of complexityEntries) {
      const displayValue = Array.isArray(value) ? value.join(', ') : value;
      lines.push(`| ${key} | ${displayValue} |`);
    }
  }

  return lines.join('\n');
}

function formatCostPlan(data: CostPlanData, tier: FormattingTier): string {
  if (!data || !data.totalBudgetCents) {
    return '## Cost Plan\nNo cost plan data available.';
  }

  if (tier === 'summary') {
    return [
      `## Cost Plan Summary`,
      `Budget: ${formatCurrency(data.totalBudgetCents)} | ` +
        `Forecast: ${formatCurrency(data.totalForecastCents)} | ` +
        `Variance: ${data.variancePercent.toFixed(1)}%`,
      `Contingency remaining: ${data.contingency.percentRemaining.toFixed(0)}%`,
      `Variations: ${data.variationsSummary.approvedCount} approved, ` +
        `${data.variationsSummary.pendingCount} pending`,
      `Invoiced: ${formatCurrency(data.invoicesSummary.totalValueCents)}`,
    ].join('\n');
  }

  if (tier === 'standard') {
    const lines = [
      `## Cost Plan`,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Budget | ${formatCurrency(data.totalBudgetCents)} |`,
      `| Approved Contracts | ${formatCurrency(data.totalApprovedContractCents)} |`,
      `| Current Forecast | ${formatCurrency(data.totalForecastCents)} |`,
      `| Budget Variance | ${formatCurrency(data.varianceCents)} (${data.variancePercent.toFixed(1)}%) |`,
      `| Total Invoiced | ${formatCurrency(data.invoicesSummary.totalValueCents)} |`,
      ``,
      `### Contingency`,
      `Budget: ${formatCurrency(data.contingency.budgetCents)} | ` +
        `Used: ${formatCurrency(data.contingency.usedCents)} | ` +
        `Remaining: ${data.contingency.percentRemaining.toFixed(0)}%`,
      ``,
      `### Variations`,
      `Approved: ${data.variationsSummary.approvedCount} (${formatCurrency(data.variationsSummary.approvedValueCents)})`,
      `Pending: ${data.variationsSummary.pendingCount} (${formatCurrency(data.variationsSummary.pendingValueCents)})`,
    ];

    // Add section totals
    for (const [section, sectionLines] of Object.entries(data.linesBySection)) {
      const sectionBudget = sectionLines.reduce(
        (s, l) => s + l.budgetCents,
        0
      );
      const sectionForecast = sectionLines.reduce(
        (s, l) => s + l.forecastCents,
        0
      );
      lines.push(
        `\n**${section}**: ${sectionLines.length} lines, ` +
          `Budget ${formatCurrency(sectionBudget)}, Forecast ${formatCurrency(sectionForecast)}`
      );
    }

    return lines.join('\n');
  }

  // Detailed tier: full line-item listing
  const lines = [
    `## Cost Plan (Detailed)`,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Budget | ${formatCurrency(data.totalBudgetCents)} |`,
    `| Approved Contracts | ${formatCurrency(data.totalApprovedContractCents)} |`,
    `| Current Forecast | ${formatCurrency(data.totalForecastCents)} |`,
    `| Budget Variance | ${formatCurrency(data.varianceCents)} (${data.variancePercent.toFixed(1)}%) |`,
    `| Total Invoiced | ${formatCurrency(data.invoicesSummary.totalValueCents)} |`,
    ``,
    `### Contingency`,
    `Budget: ${formatCurrency(data.contingency.budgetCents)} | ` +
      `Used: ${formatCurrency(data.contingency.usedCents)} | ` +
      `Remaining: ${data.contingency.percentRemaining.toFixed(0)}%`,
    ``,
    `### Variations`,
    `Approved: ${data.variationsSummary.approvedCount} (${formatCurrency(data.variationsSummary.approvedValueCents)})`,
    `Pending: ${data.variationsSummary.pendingCount} (${formatCurrency(data.variationsSummary.pendingValueCents)})`,
  ];

  for (const [section, sectionLines] of Object.entries(data.linesBySection)) {
    lines.push(`\n### ${section}`);
    lines.push(`| Activity | Budget | Approved | Forecast | Variance |`);
    lines.push(`|----------|--------|----------|----------|----------|`);
    for (const cl of sectionLines) {
      lines.push(
        `| ${cl.activity} | ${formatCurrency(cl.budgetCents)} | ` +
          `${formatCurrency(cl.approvedContractCents)} | ` +
          `${formatCurrency(cl.forecastCents)} | ` +
          `${formatCurrency(cl.varianceCents)} |`
      );
    }
  }

  return lines.join('\n');
}

function formatProgram(data: ProgramData, tier: FormattingTier): string {
  if (!data || data.totalActivities === 0) {
    return '## Program\nNo program data available.';
  }

  if (tier === 'summary') {
    const lines = [
      `## Program Summary`,
      `Activities: ${data.totalActivities} (${data.percentComplete}% complete)`,
    ];
    if (data.nextMilestone) {
      lines.push(
        `Next milestone: ${data.nextMilestone.name} (${data.nextMilestone.daysUntil} days)`
      );
    }
    return lines.join('\n');
  }

  const lines = [
    `## Program`,
    `Total Activities: ${data.totalActivities} | Completed: ${data.completedActivities} | Progress: ${data.percentComplete}%`,
  ];

  if (data.milestones.length > 0) {
    lines.push(`\n### Milestones`);
    lines.push(`| Milestone | Date | Days Until |`);
    lines.push(`|-----------|------|------------|`);
    const milestonesToShow =
      tier === 'detailed' ? data.milestones : data.milestones.slice(0, 5);
    for (const m of milestonesToShow) {
      const dateStr = new Date(m.date).toLocaleDateString('en-AU');
      const daysLabel =
        m.daysUntil < 0
          ? `${Math.abs(m.daysUntil)}d overdue`
          : `${m.daysUntil}d`;
      lines.push(`| ${m.name} | ${dateStr} | ${daysLabel} |`);
    }
  }

  if (tier === 'detailed' && data.activities.length > 0) {
    lines.push(`\n### Activities`);
    lines.push(`| Activity | Start | End | Stage |`);
    lines.push(`|----------|-------|-----|-------|`);
    for (const a of data.activities) {
      const start = a.startDate
        ? new Date(a.startDate).toLocaleDateString('en-AU')
        : 'TBD';
      const end = a.endDate
        ? new Date(a.endDate).toLocaleDateString('en-AU')
        : 'TBD';
      lines.push(
        `| ${a.name} | ${start} | ${end} | ${a.masterStage ?? ''} |`
      );
    }
  }

  return lines.join('\n');
}

function formatRisks(data: RisksData, tier: FormattingTier): string {
  if (!data || data.totalCount === 0) {
    return '## Risks\nNo risks registered.';
  }

  if (tier === 'summary') {
    return [
      `## Risk Summary`,
      `Total: ${data.totalCount} | High: ${data.bySeverity.high} | Medium: ${data.bySeverity.medium} | Low: ${data.bySeverity.low}`,
      `Active: ${data.byStatus.identified + data.byStatus.mitigated} | Closed: ${data.byStatus.closed}`,
    ].join('\n');
  }

  const lines = [
    `## Risks`,
    `Total: ${data.totalCount} (H:${data.bySeverity.high} M:${data.bySeverity.medium} L:${data.bySeverity.low})`,
  ];

  if (data.topActiveRisks.length > 0) {
    lines.push(`\n### Active Risks`);
    lines.push(`| Risk | Severity | Likelihood | Impact | Status |`);
    lines.push(`|------|----------|------------|--------|--------|`);
    const risksToShow =
      tier === 'detailed'
        ? data.topActiveRisks
        : data.topActiveRisks.slice(0, 5);
    for (const r of risksToShow) {
      lines.push(
        `| ${r.title} | ${r.severity} | ${r.likelihood ?? '-'} | ${r.impact ?? '-'} | ${r.status} |`
      );
    }

    if (tier === 'detailed') {
      for (const r of data.topActiveRisks.filter((r) => r.mitigation)) {
        lines.push(`\n**${r.title}** mitigation: ${r.mitigation}`);
      }
    }
  }

  return lines.join('\n');
}

function formatProcurement(
  data: ProcurementData,
  tier: FormattingTier
): string {
  if (
    !data ||
    (data.overview.consultantsTotal === 0 &&
      data.overview.contractorsTotal === 0)
  ) {
    return '## Procurement\nNo procurement data available.';
  }

  const o = data.overview;

  if (tier === 'summary') {
    return [
      `## Procurement Summary`,
      `Consultants: ${o.consultantsTotal} (${o.consultantsAwarded} awarded, ${o.consultantsTendered} in tender)`,
      `Contractors: ${o.contractorsTotal} (${o.contractorsAwarded} awarded, ${o.contractorsTendered} in tender)`,
    ].join('\n');
  }

  const lines = [
    `## Procurement`,
    `### Overview`,
    `| Group | Total | Awarded | Tendering | Briefing |`,
    `|-------|-------|---------|-----------|----------|`,
    `| Consultants | ${o.consultantsTotal} | ${o.consultantsAwarded} | ${o.consultantsTendered} | ${o.consultantsBriefed} |`,
    `| Contractors | ${o.contractorsTotal} | ${o.contractorsAwarded} | ${o.contractorsTendered} | ${o.contractorsBriefed} |`,
  ];

  if (tier === 'detailed' || tier === 'standard') {
    if (data.consultants.length > 0) {
      lines.push(`\n### Consultant Disciplines`);
      for (const c of data.consultants) {
        lines.push(
          `- ${c.name}${c.disciplineOrTrade ? ` (${c.disciplineOrTrade})` : ''}: ${c.currentStatus ?? 'not started'}`
        );
      }
    }
    if (data.contractors.length > 0) {
      lines.push(`\n### Contractor Trades`);
      for (const c of data.contractors) {
        lines.push(
          `- ${c.name}${c.disciplineOrTrade ? ` (${c.disciplineOrTrade})` : ''}: ${c.currentStatus ?? 'not started'}`
        );
      }
    }
  }

  return lines.join('\n');
}

function formatStakeholders(
  data: StakeholdersData,
  tier: FormattingTier
): string {
  if (!data || data.totalCount === 0) {
    return '## Stakeholders\nNo stakeholders registered.';
  }

  if (tier === 'summary') {
    return [
      `## Stakeholders Summary`,
      `Total: ${data.totalCount} | Consultants: ${data.consultants.length} | ` +
        `Contractors: ${data.contractors.length} | Authorities: ${data.authorities.length}`,
    ].join('\n');
  }

  const lines = [`## Stakeholders (${data.totalCount} total)`];

  const formatGroup = (
    label: string,
    entries: typeof data.consultants
  ) => {
    if (entries.length === 0) return;
    lines.push(`\n### ${label}`);
    for (const s of entries) {
      const parts = [s.name];
      if (s.disciplineOrTrade) parts.push(`(${s.disciplineOrTrade})`);
      if (s.organization) parts.push(`- ${s.organization}`);
      lines.push(`- ${parts.join(' ')}`);
    }
  };

  formatGroup('Consultants', data.consultants);
  formatGroup('Contractors', data.contractors);
  formatGroup('Authorities', data.authorities);
  if (data.other.length > 0) formatGroup('Other', data.other);

  return lines.join('\n');
}

function formatNotes(data: StarredNotesData, tier: FormattingTier): string {
  if (!data || data.totalCount === 0) {
    return '## Starred Notes\nNo starred notes.';
  }

  if (tier === 'summary') {
    return [
      `## Starred Notes (${data.totalCount})`,
      data.notes.map((n) => `- ${n.title}`).join('\n'),
    ].join('\n');
  }

  const lines = [`## Starred Notes (${data.totalCount})`];

  for (const note of data.notes) {
    lines.push(`\n### ${note.title}`);
    if (note.content) {
      // Truncate long content at standard tier
      const maxChars = tier === 'detailed' ? 2000 : 500;
      const content =
        note.content.length > maxChars
          ? note.content.slice(0, maxChars) + '...'
          : note.content;
      lines.push(content);
    }
  }

  return lines.join('\n');
}

function formatRagDocuments(
  data: RagDocumentsData,
  tier: FormattingTier
): string {
  if (!data || data.totalChunks === 0) {
    return '';
  }

  const lines = [`## Relevant Document Excerpts (${data.totalChunks})`];

  for (const chunk of data.chunks) {
    const header = chunk.sectionTitle
      ? `### ${chunk.sectionTitle}`
      : `### Document Chunk`;
    lines.push(`\n${header}`);
    if (chunk.clauseNumber) {
      lines.push(`Clause: ${chunk.clauseNumber}`);
    }
    lines.push(chunk.content);
    if (tier === 'detailed') {
      lines.push(`(Relevance: ${(chunk.relevanceScore * 100).toFixed(0)}%)`);
    }
  }

  return lines.join('\n');
}

function formatPlanningCard(
  data: PlanningCardData | null,
  tier: FormattingTier
): string {
  if (!data) {
    return '## Planning Context\nNo planning context available.';
  }

  // Planning card wraps the existing comprehensive context
  // Just serialize the key fields
  const lines = [`## Planning Context`];

  if (data.details) {
    lines.push(`\n### Project Details`);
    for (const [key, value] of Object.entries(data.details)) {
      if (value) lines.push(`- ${key}: ${value}`);
    }
  }

  if (data.objectives) {
    lines.push(`\n### Objectives`);
    for (const [key, value] of Object.entries(data.objectives)) {
      if (value) lines.push(`- ${key}: ${value}`);
    }
  }

  if (tier !== 'summary' && data.stages && Array.isArray(data.stages)) {
    lines.push(`\n### Stages: ${data.stages.length} defined`);
  }

  return lines.join('\n');
}

function formatProjectInfo(
  data: ProjectInfoData,
  tier: FormattingTier
): string {
  if (!data.projectName && !data.objectives) {
    return '## Project Information\nNo project details available.';
  }

  const lines = ['## Project Information'];

  if (data.projectName) lines.push(`Project: ${data.projectName}`);
  if (data.address) lines.push(`Address: ${data.address}`);
  if (data.jurisdiction) lines.push(`Jurisdiction: ${data.jurisdiction}`);

  if (tier !== 'summary' && data.objectives) {
    const sections: Array<{ key: keyof typeof data.objectives; label: string }> = [
      { key: 'planning', label: 'Planning Objectives' },
      { key: 'functional', label: 'Functional Objectives' },
      { key: 'quality', label: 'Quality Objectives' },
      { key: 'compliance', label: 'Compliance Objectives' },
    ];
    for (const { key, label } of sections) {
      const items = data.objectives[key];
      if (!items || items.length === 0) continue;
      lines.push(`\n### ${label}`);
      for (const item of items) {
        lines.push(`- ${item}`);
      }
    }
  }

  return lines.join('\n');
}

function formatProcurementDocs(
  data: ProcurementDocsData,
  tier: FormattingTier
): string {
  if (!data || data.summary.totalCount === 0) {
    return '## Procurement Documents\nNo procurement documents available.';
  }

  const s = data.summary;

  if (tier === 'summary') {
    return [
      `## Procurement Documents (${s.totalCount})`,
      `RFT: ${s.rftCount} | Addenda: ${s.addendumCount} | TRR: ${s.trrCount} | Evaluations: ${s.evaluationCount}`,
    ].join('\n');
  }

  const lines = [`## Procurement Documents (${s.totalCount})`];

  const grouped: Record<string, typeof data.documents> = {
    rft: data.documents.filter((d) => d.type === 'rft'),
    addendum: data.documents.filter((d) => d.type === 'addendum'),
    trr: data.documents.filter((d) => d.type === 'trr'),
    evaluation: data.documents.filter((d) => d.type === 'evaluation'),
  };

  const labels: Record<string, string> = {
    rft: 'RFT Documents',
    addendum: 'Addenda',
    trr: 'Tender Recommendations',
    evaluation: 'Evaluations',
  };

  for (const [type, docs] of Object.entries(grouped)) {
    if (docs.length === 0) continue;
    lines.push(`\n### ${labels[type]} (${docs.length})`);
    for (const doc of docs) {
      const parts = [doc.type.toUpperCase()];
      if (doc.stakeholderName) parts.push(`for ${doc.stakeholderName}`);
      if (doc.date) parts.push(`(${doc.date})`);
      lines.push(`- ${parts.join(' ')}`);
      if (tier === 'detailed' && doc.content) {
        const maxChars = 500;
        const content =
          doc.content.length > maxChars
            ? doc.content.slice(0, maxChars) + '...'
            : doc.content;
        lines.push(`  ${content}`);
      }
    }
  }

  return lines.join('\n');
}

function formatAttachedDocuments(
  data: AttachedDocumentsData,
  tier: FormattingTier
): string {
  if (!data || data.totalCount === 0) {
    return '';
  }

  const lines = [`## Attached Documents (${data.totalCount})`];

  for (const doc of data.documents) {
    lines.push(
      `- ${doc.documentName}${doc.categoryName ? ` (${doc.categoryName})` : ''}`
    );
  }

  return lines.join('\n');
}
