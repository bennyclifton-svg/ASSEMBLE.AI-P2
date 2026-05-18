export interface ObjectiveGuardProfile {
  projectType?: string;
  subclass?: string[];
  scaleData?: Record<string, number | string>;
  complexity?: Record<string, string | string[]>;
  workScopeLabels?: string[];
  classDescriptors?: string[];
}

export interface ObjectiveGuardItem {
  text: string;
}

export interface ObjectiveRejection<T extends ObjectiveGuardItem> {
  item: T;
  reason: string;
}

const EVIDENCE_SEPARATORS = /[_\s-]+/g;

function normalize(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalize).join(' ');
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().replace(EVIDENCE_SEPARATORS, ' ');
}

function profileEvidence(profile: ObjectiveGuardProfile): string {
  return [
    profile.projectType,
    profile.subclass,
    Object.values(profile.scaleData ?? {}),
    Object.entries(profile.complexity ?? {}).flatMap(([key, value]) => [key, value]),
    profile.workScopeLabels,
    profile.classDescriptors,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(' ');
}

function storeyCount(profile: ObjectiveGuardProfile): number | null {
  const raw = profile.scaleData?.storeys ?? profile.scaleData?.storeyCount;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasEvidence(evidence: string, terms: RegExp): boolean {
  return terms.test(evidence);
}

interface UnsupportedAssumptionRule {
  reason: string;
  objectivePattern: RegExp;
  evidencePattern?: RegExp;
  unsupportedWhen?: (profile: ObjectiveGuardProfile, evidence: string) => boolean;
}

const UNSUPPORTED_ASSUMPTION_RULES: UnsupportedAssumptionRule[] = [
  {
    reason: 'low-rise wording conflicts with the project scale',
    objectivePattern: /\blow[-\s]?rise\b/i,
    unsupportedWhen: (profile) => {
      const storeys = storeyCount(profile);
      return storeys === null || storeys > 3;
    },
  },
  {
    reason: 'heritage constraint is not present in the profile',
    objectivePattern: /\b(heritage|conservation|archaeolog|aboriginal cultural)\b/i,
    evidencePattern: /\b(heritage|conservation|archaeolog|aboriginal cultural)\b/i,
  },
  {
    reason: 'contamination/remediation constraint is not present in the profile',
    objectivePattern: /\b(contamination|contaminated|remediation|rap\b|site auditor|audit statement|validation sampling)\b/i,
    evidencePattern: /\b(contamination|contaminated|remediation|rap\b|site auditor|audit statement|validation sampling|environmental due diligence)\b/i,
    unsupportedWhen: (profile, evidence) =>
      normalize(profile.projectType) !== 'remediation' &&
      !hasEvidence(evidence, /\b(contamination|contaminated|remediation|rap\b|site auditor|audit statement|validation sampling|environmental due diligence)\b/i),
  },
  {
    reason: 'staging or partial occupation is not present in the profile',
    objectivePattern: /\b(staged construction|staging|partial occupation|half[-\s]?floor|decant|live environment)\b/i,
    evidencePattern: /\b(staged|staging|partial occupation|half floor|decant|live environment|occupied)\b/i,
  },
  {
    reason: 'overlay or unusual authority constraint is not present in the profile',
    objectivePattern: /\b(overlay|bushfire|flood|acid sulfate|rail corridor|flight path|mine subsidence)\b/i,
    evidencePattern: /\b(overlay|bushfire|flood|acid sulfate|rail corridor|flight path|mine subsidence)\b/i,
  },
  {
    reason: 'precast system is not selected in the work scope',
    objectivePattern: /\bprecast\b/i,
    evidencePattern: /\bprecast\b/i,
  },
  {
    reason: 'post-tensioning system is not selected in the work scope',
    objectivePattern: /\bpost[-\s]?tension/i,
    evidencePattern: /\bpost tension/i,
  },
];

export function filterUnsupportedNoDocumentObjectives<T extends ObjectiveGuardItem>(
  items: T[],
  profile: ObjectiveGuardProfile,
): { kept: T[]; rejected: ObjectiveRejection<T>[] } {
  const evidence = profileEvidence(profile);
  const kept: T[] = [];
  const rejected: ObjectiveRejection<T>[] = [];

  for (const item of items) {
    const text = item.text.trim();
    const rule = UNSUPPORTED_ASSUMPTION_RULES.find((candidate) => {
      if (!candidate.objectivePattern.test(text)) return false;
      if (candidate.unsupportedWhen) {
        return candidate.unsupportedWhen(profile, evidence);
      }
      return candidate.evidencePattern ? !hasEvidence(evidence, candidate.evidencePattern) : true;
    });

    if (rule) {
      rejected.push({ item, reason: rule.reason });
    } else {
      kept.push(item);
    }
  }

  return { kept, rejected };
}
